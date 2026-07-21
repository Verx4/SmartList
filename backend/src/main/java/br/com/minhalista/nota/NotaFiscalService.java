package br.com.minhalista.nota;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.scraper.NivelConfianca;
import br.com.minhalista.scraper.PrecoColetadoRequest;
import br.com.minhalista.scraper.ScraperService;

@Service
public class NotaFiscalService {

    private static final int LIMITE_RESPOSTA_BYTES = 2_000_000;
    private static final int LIMITE_REDIRECIONAMENTOS = 3;
    private static final Pattern CHAVE_ACESSO = Pattern.compile("(?<!\\d)(\\d{44})(?!\\d)");
    private static final Pattern NUMERO = Pattern.compile("-?\\d[\\d.,]*");
    private static final Set<String> MARCADORES_FISCAIS = Set.of(
        "sefaz", "fazenda", "nfce", "nfe", "svrs", "receita"
    );

    private final HttpClient httpClient;
    private final ScraperService scraperService;

    public NotaFiscalService() {
        this(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build(), null);
    }

    @Autowired
    public NotaFiscalService(ScraperService scraperService) {
        this(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(6))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build(), scraperService);
    }

    NotaFiscalService(HttpClient httpClient, ScraperService scraperService) {
        this.httpClient = httpClient;
        this.scraperService = scraperService;
    }

    public NotaFiscalResponse consultar(String endereco) {
        URI origem = validarUrl(endereco);
        DocumentoRemoto documento = baixar(origem);
        NotaFiscalResponse resposta = analisarDocumento(documento.html(), documento.uri());
        registrarPrecosDaNota(resposta, documento.uri());
        return resposta;
    }

    private void registrarPrecosDaNota(NotaFiscalResponse nota, URI origem) {
        if (scraperService == null) {
            return;
        }

        String mercado = identificarRede(nota.mercado());
        for (ItemNotaResponse item : nota.itens()) {
            try {
                scraperService.registrarPreco(new PrecoColetadoRequest(
                    item.nome(),
                    mercado,
                    item.valorUnitario(),
                    NivelConfianca.ALTA,
                    origem.toString()
                ));
            } catch (RuntimeException _erro) {
                // A importação da nota continua mesmo se o histórico de preços falhar.
            }
        }
    }

    private String identificarRede(String emitente) {
        String nome = Normalizer.normalize(emitente == null ? "" : emitente, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toUpperCase(Locale.ROOT);
        if (nome.contains("PAO DE ACUCAR")) return "Pão de Açúcar";
        if (nome.contains("ATACADAO")) return "Atacadão";
        if (nome.contains("ASSAI")) return "Assaí";
        if (nome.contains("NOVO ATACAREJO")) return "Novo Atacarejo";
        if (nome.contains("MIX MATEUS") || nome.contains("GRUPO MATEUS")) return "Mix Mateus";
        if (nome.contains("VERDE FRUT")) return "Verde Frut";
        if (nome.contains("DESKONTAO")) return "Deskontão";
        if (nome.contains("RECIFE ATACAREJO")) return "Recife Atacarejo";
        if (nome.contains("CARREFOUR")) return "Carrefour";
        if (nome.contains("GBARBOSA")) return "GBarbosa";
        return emitente == null || emitente.isBlank() ? "Mercado da nota" : emitente.trim();
    }

    NotaFiscalResponse analisarDocumento(String html, URI origem) {
        Document documento = Jsoup.parse(html, origem.toString());
        List<ItemNotaResponse> itens = extrairItens(documento);

        if (itens.isEmpty()) {
            throw new RegraNegocioException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "A nota foi localizada, mas o portal fiscal não liberou os itens para leitura automática. Tente novamente ou use outra imagem."
            );
        }

        BigDecimal total = extrairTotal(documento);
        if (total == null) {
            total = itens.stream()
                .map(ItemNotaResponse::valorTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        return new NotaFiscalResponse(
            extrairChave(documento, origem),
            extrairMercado(documento),
            total,
            List.copyOf(itens)
        );
    }

    URI validarUrl(String endereco) {
        try {
            URI uri = new URI(endereco == null ? "" : endereco.trim());
            String host = uri.getHost();
            String scheme = uri.getScheme();

            if (!("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme))
                || host == null
                || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 80 && uri.getPort() != 443)
                || !portalFiscalOficial(host, uri.getPath())) {
                throw urlInvalida();
            }

            validarEnderecoPublico(host);
            return uri;
        } catch (URISyntaxException | IllegalArgumentException erro) {
            throw urlInvalida();
        }
    }

    private DocumentoRemoto baixar(URI inicial) {
        URI atual = inicial;

        for (int tentativa = 0; tentativa <= LIMITE_REDIRECIONAMENTOS; tentativa++) {
            atual = validarUrl(atual.toString());

            HttpRequest request = HttpRequest.newBuilder(atual)
                .timeout(Duration.ofSeconds(15))
                .header("Accept", "text/html,application/xhtml+xml")
                .header("Accept-Language", "pt-BR,pt;q=0.9")
                .header("User-Agent", "SmartList-NFCe/1.0")
                .GET()
                .build();

            try {
                HttpResponse<InputStream> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofInputStream()
                );
                int status = response.statusCode();

                if (status >= 300 && status < 400) {
                    String location = response.headers().firstValue("location").orElse("");
                    response.body().close();
                    if (location.isBlank()) {
                        throw consultaIndisponivel();
                    }
                    atual = atual.resolve(location);
                    continue;
                }

                if (status < 200 || status >= 300) {
                    response.body().close();
                    throw consultaIndisponivel();
                }

                byte[] dados;
                try (InputStream corpo = response.body()) {
                    dados = corpo.readNBytes(LIMITE_RESPOSTA_BYTES + 1);
                }

                if (dados.length > LIMITE_RESPOSTA_BYTES) {
                    throw new RegraNegocioException(
                        HttpStatus.BAD_GATEWAY,
                        "O portal fiscal retornou uma nota grande demais para importar."
                    );
                }

                return new DocumentoRemoto(
                    atual,
                    new String(dados, StandardCharsets.UTF_8)
                );
            } catch (InterruptedException erro) {
                Thread.currentThread().interrupt();
                throw consultaIndisponivel();
            } catch (IOException erro) {
                throw consultaIndisponivel();
            }
        }

        throw new RegraNegocioException(
            HttpStatus.BAD_GATEWAY,
            "O portal fiscal redirecionou a consulta muitas vezes."
        );
    }

    private List<ItemNotaResponse> extrairItens(Document documento) {
        LinkedHashSet<Element> candidatos = new LinkedHashSet<>();
        candidatos.addAll(documento.select("#tabResult tr, table[id*=Result] tr, table[id*=result] tr"));
        candidatos.addAll(documento.select("tr:has(.txtTit), li:has(.txtTit), .item:has(.txtTit), .produto:has(.txtTit)"));

        List<ItemNotaResponse> itens = new ArrayList<>();
        for (Element candidato : candidatos) {
            Element titulo = candidato.selectFirst(".txtTit, .nome, .descricao, [class*=nomeProduto]");
            if (titulo == null) {
                continue;
            }

            String nome = limparNome(titulo.text());
            BigDecimal quantidade = decimalDoElemento(
                candidato,
                ".Rqtd, .qtd, [class*=quantidade], [id*=quantidade]"
            );
            BigDecimal unitario = decimalDoElemento(
                candidato,
                ".RvlUnit, .vlUnit, [class*=valorUnit], [id*=valorUnit]"
            );
            BigDecimal valorTotal = decimalDoElemento(
                candidato,
                ".valor, .vlTotal, [class*=valorTotal], [id*=valorTotal]"
            );
            String unidade = textoDoElemento(
                candidato,
                ".RUN, .un, [class*=unidade], [id*=unidade]"
            );

            if (nome.isBlank() || (unitario == null && valorTotal == null)) {
                continue;
            }

            quantidade = quantidade == null || quantidade.signum() <= 0
                ? BigDecimal.ONE
                : quantidade;
            if (unitario == null) {
                unitario = valorTotal.divide(quantidade, 4, RoundingMode.HALF_UP);
            }
            if (valorTotal == null) {
                valorTotal = unitario.multiply(quantidade);
            }

            itens.add(new ItemNotaResponse(
                nome,
                quantidade.stripTrailingZeros(),
                limparUnidade(unidade),
                unitario.setScale(2, RoundingMode.HALF_UP),
                valorTotal.setScale(2, RoundingMode.HALF_UP)
            ));
        }

        return itens;
    }

    private BigDecimal extrairTotal(Document documento) {
        for (String seletor : List.of(
            "#totalNota .txtMax", "#totalNota .valor", ".totalNumb",
            ".valorTotal", "[id*=valorTotal]", "[class*=valorTotal]"
        )) {
            Element elemento = documento.selectFirst(seletor);
            BigDecimal valor = decimal(elemento == null ? null : elemento.text());
            if (valor != null) {
                return valor.setScale(2, RoundingMode.HALF_UP);
            }
        }
        return null;
    }

    private String extrairMercado(Document documento) {
        for (String seletor : List.of(
            "#u20", ".txtTopo", ".emitente .nome", "[class*=emitente] [class*=nome]", "header h1"
        )) {
            Element elemento = documento.selectFirst(seletor);
            String texto = limparTexto(elemento == null ? "" : elemento.text());
            if (!texto.isBlank() && texto.length() <= 160) {
                return texto;
            }
        }
        return "Mercado da nota";
    }

    private String extrairChave(Document documento, URI origem) {
        Matcher noDocumento = CHAVE_ACESSO.matcher(documento.text());
        if (noDocumento.find()) {
            return noDocumento.group(1);
        }

        Matcher naUrl = CHAVE_ACESSO.matcher(origem.toString());
        return naUrl.find() ? naUrl.group(1) : "";
    }

    private BigDecimal decimalDoElemento(Element raiz, String seletor) {
        Element elemento = raiz.selectFirst(seletor);
        return decimal(elemento == null ? null : elemento.text());
    }

    private String textoDoElemento(Element raiz, String seletor) {
        Element elemento = raiz.selectFirst(seletor);
        return elemento == null ? "" : elemento.text();
    }

    private BigDecimal decimal(String texto) {
        if (texto == null) {
            return null;
        }

        Matcher matcher = NUMERO.matcher(texto.replace("R$", ""));
        if (!matcher.find()) {
            return null;
        }

        String numero = matcher.group();
        int ultimaVirgula = numero.lastIndexOf(',');
        int ultimoPonto = numero.lastIndexOf('.');

        if (ultimaVirgula > ultimoPonto) {
            numero = numero.replace(".", "").replace(',', '.');
        } else if (ultimoPonto > ultimaVirgula && ultimaVirgula >= 0) {
            numero = numero.replace(",", "");
        } else if (ultimaVirgula >= 0) {
            numero = numero.replace(',', '.');
        }

        try {
            return new BigDecimal(numero);
        } catch (NumberFormatException erro) {
            return null;
        }
    }

    private String limparNome(String nome) {
        return limparTexto(nome)
            .replaceFirst("(?i)\\s*\\(c[oó]digo:.*$", "")
            .trim();
    }

    private String limparUnidade(String unidade) {
        String limpa = limparTexto(unidade)
            .replaceFirst("(?i)^un(?:idade)?\\s*:?\\s*", "")
            .replaceAll("[^\\p{L}]", "")
            .toUpperCase(Locale.ROOT);
        return limpa.isBlank() ? "UN" : limpa.substring(0, Math.min(limpa.length(), 6));
    }

    private String limparTexto(String texto) {
        return texto == null ? "" : texto.trim().replaceAll("\\s+", " ");
    }

    private boolean portalFiscalOficial(String host, String caminho) {
        String hostNormalizado = host.toLowerCase(Locale.ROOT);
        String caminhoNormalizado = caminho == null ? "" : caminho.toLowerCase(Locale.ROOT);

        if (!(hostNormalizado.equals("gov.br") || hostNormalizado.endsWith(".gov.br"))) {
            return false;
        }

        return MARCADORES_FISCAIS.stream().anyMatch(hostNormalizado::contains)
            || caminhoNormalizado.contains("nfce")
            || caminhoNormalizado.contains("qrcode");
    }

    private void validarEnderecoPublico(String host) {
        try {
            for (InetAddress endereco : InetAddress.getAllByName(host)) {
                if (endereco.isAnyLocalAddress()
                    || endereco.isLoopbackAddress()
                    || endereco.isLinkLocalAddress()
                    || endereco.isSiteLocalAddress()
                    || endereco.isMulticastAddress()) {
                    throw urlInvalida();
                }
            }
        } catch (IOException erro) {
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível localizar o portal fiscal informado."
            );
        }
    }

    private RegraNegocioException urlInvalida() {
        return new RegraNegocioException(
            HttpStatus.BAD_REQUEST,
            "O QR Code não aponta para um portal fiscal oficial."
        );
    }

    private RegraNegocioException consultaIndisponivel() {
        return new RegraNegocioException(
            HttpStatus.BAD_GATEWAY,
            "O portal fiscal não respondeu agora. Aguarde um momento e tente novamente."
        );
    }

    private record DocumentoRemoto(URI uri, String html) {
    }
}

