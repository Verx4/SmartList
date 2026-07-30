package br.com.minhalista.encarte;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import br.com.minhalista.oferta.OfertaRegistro;
import br.com.minhalista.oferta.OfertaService;

@Service
public class CapturaEncarteService {

    private static final String USER_AGENT =
        "SmartList-OfferCollector/1.0 (public-flyer processing; no protection bypass)";
    private static final int LIMITE_FONTES_POR_CICLO = 50;

    private final FonteEncarteRepository repository;
    private final UrlPublicaValidator urlValidator;
    private final OcrEncarteService ocrService;
    private final ExtratorOfertaService extratorService;
    private final OfertaService ofertaService;
    private final HttpClient httpClient;
    private final boolean capturaAtiva;
    private final int tamanhoMaximoBytes;

    public CapturaEncarteService(
        FonteEncarteRepository repository,
        UrlPublicaValidator urlValidator,
        OcrEncarteService ocrService,
        ExtratorOfertaService extratorService,
        OfertaService ofertaService,
        @Value("${app.ofertas.captura-ativa:true}") boolean capturaAtiva,
        @Value("${app.ofertas.tamanho-maximo-bytes:15728640}") int tamanhoMaximoBytes
    ) {
        this.repository = repository;
        this.urlValidator = urlValidator;
        this.ocrService = ocrService;
        this.extratorService = extratorService;
        this.ofertaService = ofertaService;
        this.capturaAtiva = capturaAtiva;
        this.tamanhoMaximoBytes = Math.max(1_048_576, tamanhoMaximoBytes);
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    @Scheduled(cron = "0 10 2,8,14,20 * * *", zone = "America/Fortaleza")
    public void verificarFontesAutomaticamente() {
        if (!capturaAtiva) {
            return;
        }
        repository.buscarPendentes(Instant.now()).stream()
            .limit(LIMITE_FONTES_POR_CICLO)
            .map(FonteEncarte::getId)
            .forEach(this::processar);
    }

    public FonteEncarte processar(UUID fonteId) {
        FonteEncarte fonte = repository.buscarComUnidadePorId(fonteId)
            .orElseThrow(() -> new IllegalArgumentException("Fonte de encarte não encontrada."));
        if (!fonte.isAtiva()) {
            throw new IllegalArgumentException("A fonte está desativada.");
        }

        fonte.setStatus(StatusFonteEncarte.PROCESSANDO);
        fonte.setMensagemStatus("Baixando e lendo a fonte pública.");
        fonte.setVerificadaEm(Instant.now());
        repository.save(fonte);

        try {
            URI uri = urlValidator.validar(fonte.getUrl());
            Download download = baixar(uri);
            if (download.statusHttp() >= 300 && download.statusHttp() < 400) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.REVISAO_MANUAL,
                    "A fonte redirecionou para outra página. Cadastre a URL pública final.",
                    Duration.ofHours(12)
                );
            }
            if (download.statusHttp() == 401 || download.statusHttp() == 403) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.INTEGRACAO_OFICIAL_NECESSARIA,
                    "A fonte exige autenticação ou bloqueou o acesso. Nenhuma proteção foi contornada.",
                    Duration.ofDays(7)
                );
            }
            if (download.statusHttp() == 429) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.BLOQUEADA_TEMPORARIAMENTE,
                    "A fonte limitou as requisições. Nova tentativa será feita mais tarde.",
                    Duration.ofHours(24)
                );
            }
            if (download.statusHttp() < 200 || download.statusHttp() >= 300) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.ERRO,
                    "A fonte respondeu HTTP " + download.statusHttp() + ".",
                    Duration.ofHours(12)
                );
            }
            if (parecePaginaProtegida(download)) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.INTEGRACAO_OFICIAL_NECESSARIA,
                    "A página exige CAPTCHA ou login. Use integração oficial ou revisão manual.",
                    Duration.ofDays(7)
                );
            }
            Download midia = localizarMidiaNaPagina(uri, download);

            String hash = hash(midia.conteudo());
            if (hash.equals(fonte.getUltimoHash())) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.SEM_ALTERACAO,
                    "Nenhuma alteração encontrada no encarte.",
                    Duration.ofHours(6)
                );
            }

            String textoOcr = ocrService.extrair(
                midia.conteudo(),
                midia.contentType(),
                fonte.getTipo()
            );
            List<OfertaExtraida> ofertas = extratorService.extrair(textoOcr);
            if (ofertas.isEmpty()) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.REVISAO_MANUAL,
                    "O texto foi lido, mas nenhuma oferta confiável foi identificada.",
                    Duration.ofHours(24)
                );
            }

            int salvas = 0;
            for (OfertaExtraida oferta : ofertas) {
                try {
                    ofertaService.registrar(new OfertaRegistro(
                        fonte.getUnidade(),
                        oferta.produto(),
                        oferta.categoria(),
                        oferta.marca(),
                        oferta.pesoVolume(),
                        oferta.quantidadeEmbalagem(),
                        oferta.unidadeMedida(),
                        oferta.precoPromocional(),
                        oferta.precoAnterior(),
                        oferta.condicaoEspecial(),
                        oferta.validaDe(),
                        oferta.validaAte(),
                        fonte.getNome(),
                        fonte.getUrl(),
                        oferta.confianca() == null
                            ? new BigDecimal("0.5000")
                            : oferta.confianca()
                    ));
                    salvas++;
                } catch (RuntimeException _erro) {
                    // Uma linha ruim não descarta as demais ofertas válidas.
                }
            }
            if (salvas == 0) {
                return atualizarStatus(
                    fonte,
                    StatusFonteEncarte.REVISAO_MANUAL,
                    "As ofertas extraídas não passaram pela validação.",
                    Duration.ofHours(24)
                );
            }

            fonte.setUltimoHash(hash);
            fonte.setProcessadaEm(Instant.now());
            fonte.setOfertasExtraidas(salvas);
            return atualizarStatus(
                fonte,
                StatusFonteEncarte.PROCESSADA,
                salvas + " oferta(s) em texto atualizada(s). A mídia foi descartada.",
                Duration.ofHours(6)
            );
        } catch (RuntimeException erro) {
            return atualizarStatus(
                fonte,
                erro.getMessage() != null && erro.getMessage().contains("Configure ")
                    ? StatusFonteEncarte.REVISAO_MANUAL
                    : StatusFonteEncarte.ERRO,
                mensagemSegura(erro),
                Duration.ofHours(12)
            );
        }
    }

    private Download baixar(URI uri) {
        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(40))
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/pdf,image/jpeg,image/png,image/webp,text/html;q=0.5")
            .GET()
            .build();
        try {
            HttpResponse<InputStream> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofInputStream()
            );
            try (InputStream entrada = response.body()) {
                byte[] conteudo = entrada.readNBytes(tamanhoMaximoBytes + 1);
                if (conteudo.length > tamanhoMaximoBytes) {
                    throw new IllegalArgumentException(
                        "O encarte ultrapassa o tamanho máximo permitido."
                    );
                }
                String contentType = response.headers().firstValue("Content-Type").orElse("");
                return new Download(response.statusCode(), contentType, conteudo);
            }
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Captura interrompida.", erro);
        } catch (IOException erro) {
            throw new IllegalStateException("Não foi possível baixar a fonte pública.", erro);
        }
    }

    private boolean parecePaginaProtegida(Download download) {
        String contentType = download.contentType().toLowerCase(Locale.ROOT);
        if (!contentType.contains("text/html")) {
            return false;
        }
        String html = new String(download.conteudo(), StandardCharsets.UTF_8)
            .toLowerCase(Locale.ROOT);
        return html.contains("captcha")
            || html.contains("cloudflare")
            || html.contains("faça login")
            || html.contains("faca login")
            || html.contains("sign in")
            || html.contains("access denied");
    }

    private Download localizarMidiaNaPagina(URI pagina, Download download) {
        if (!download.contentType().toLowerCase(Locale.ROOT).contains("text/html")) {
            return download;
        }
        Document documento = Jsoup.parse(
            new String(download.conteudo(), StandardCharsets.UTF_8),
            pagina.toString()
        );
        List<String> candidatas = documento.select("a[href], img[src], source[src]")
            .stream()
            .map(this::urlDoElemento)
            .filter(url -> url != null && !url.isBlank())
            .filter(this::pareceEncarte)
            .distinct()
            .limit(20)
            .toList();

        for (String candidata : candidatas) {
            try {
                Download midia = baixar(urlValidator.validar(candidata));
                String tipo = midia.contentType().toLowerCase(Locale.ROOT);
                if (midia.statusHttp() >= 200
                    && midia.statusHttp() < 300
                    && (tipo.contains("application/pdf") || tipo.startsWith("image/"))) {
                    return midia;
                }
            } catch (RuntimeException _erro) {
                // Continua procurando outra mídia pública na mesma página.
            }
        }
        throw new IllegalArgumentException(
            "A página pública não contém PDF ou imagem de encarte identificável."
        );
    }

    private String urlDoElemento(Element elemento) {
        if (elemento.hasAttr("href")) {
            return elemento.attr("abs:href");
        }
        return elemento.attr("abs:src");
    }

    private boolean pareceEncarte(String url) {
        String limpa = url.toLowerCase(Locale.ROOT);
        return limpa.matches(".*\\.(pdf|png|jpe?g|webp)(?:\\?.*)?$")
            || limpa.contains("encarte")
            || limpa.contains("oferta")
            || limpa.contains("folheto")
            || limpa.contains("folder");
    }

    private FonteEncarte atualizarStatus(
        FonteEncarte fonte,
        StatusFonteEncarte status,
        String mensagem,
        Duration proximaTentativa
    ) {
        fonte.setStatus(status);
        fonte.setVerificadaEm(Instant.now());
        fonte.setProximaTentativaEm(Instant.now().plus(proximaTentativa));
        fonte.setMensagemStatus(limitar(mensagem, 500));
        return repository.save(fonte);
    }

    private String hash(byte[] conteudo) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(conteudo)
            );
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }

    private String mensagemSegura(RuntimeException erro) {
        String mensagem = erro.getMessage();
        if (mensagem == null || mensagem.isBlank()) {
            return "Falha ao processar a fonte.";
        }
        return limitar(mensagem, 500);
    }

    private String limitar(String valor, int limite) {
        return valor.length() <= limite ? valor : valor.substring(0, limite);
    }

    private record Download(int statusHttp, String contentType, byte[] conteudo) {
    }
}
