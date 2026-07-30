package br.com.minhalista.oferta;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.localizacao.LocalizacaoAtiva;
import br.com.minhalista.localizacao.LocalizacaoService;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class OfertaService {

    private static final int LIMITE_OFERTAS_POR_PRODUTO = 200;
    private static final double RAIO_PADRAO_KM = 25.0;

    private final OfertaRepository ofertaRepository;
    private final UnidadeMercadoRepository unidadeRepository;
    private final UsuarioService usuarioService;
    private final LocalizacaoService localizacaoService;
    private final DescobertaMercadosService descobertaMercadosService;

    public OfertaService(
        OfertaRepository ofertaRepository,
        UnidadeMercadoRepository unidadeRepository,
        UsuarioService usuarioService,
        LocalizacaoService localizacaoService,
        DescobertaMercadosService descobertaMercadosService
    ) {
        this.ofertaRepository = ofertaRepository;
        this.unidadeRepository = unidadeRepository;
        this.usuarioService = usuarioService;
        this.localizacaoService = localizacaoService;
        this.descobertaMercadosService = descobertaMercadosService;
    }

    @Transactional(readOnly = true)
    public OfertaListaResponse buscar(OfertaBuscaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        usuarioService.exigirPremium(usuario);

        LocalDate hoje = LocalDate.now();
        Optional<LocalizacaoAtiva> localizacaoSalva = localizacaoService.ativaDoUsuario(usuario);
        Double latitude = coordenadaCompleta(request.latitude(), request.longitude())
            ? request.latitude()
            : localizacaoSalva.map(LocalizacaoAtiva::latitude).orElse(null);
        Double longitude = coordenadaCompleta(request.latitude(), request.longitude())
            ? request.longitude()
            : localizacaoSalva.map(LocalizacaoAtiva::longitude).orElse(null);
        String cidade = primeiroPreenchido(
            request.cidade(),
            localizacaoSalva.map(LocalizacaoAtiva::cidade).orElse(null),
            usuario.getCidade()
        );
        String bairro = primeiroPreenchido(
            request.bairro(),
            localizacaoSalva.map(LocalizacaoAtiva::bairro).orElse(null)
        );
        double raioKm = request.raioKm() == null ? RAIO_PADRAO_KM : request.raioKm();

        List<OfertaProdutoResponse> produtos = request.produtos().stream()
            .map(String::trim)
            .filter(produto -> !produto.isBlank())
            .distinct()
            .map(produto -> new OfertaProdutoResponse(
                produto,
                ofertasParaProduto(
                    produto,
                    hoje,
                    latitude,
                    longitude,
                    raioKm,
                    cidade,
                    bairro,
                    request.mercado(),
                    request.categoria()
                )
            ))
            .toList();

        String aviso = latitude == null
            ? "Distância indisponível. Informe sua localização ou filtre por cidade."
            : "Distâncias aproximadas em linha reta; confirme a unidade antes de sair.";
        return new OfertaListaResponse(Instant.now(), aviso, produtos);
    }

    @Transactional
    public List<UnidadeProximaResponse> unidadesProximas(
        double latitude,
        double longitude,
        double raioKm
    ) {
        Usuario usuario = usuarioService.obterAutenticado();
        LocalizacaoAtiva autorizada = localizacaoService.ativaDoUsuario(usuario)
            .filter(localizacao -> localizacao.latitude() != null
                && localizacao.longitude() != null)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Autorize sua localização atual para identificar mercados próximos."
            ));
        latitude = autorizada.latitude();
        longitude = autorizada.longitude();
        double raioSeguro = Math.max(1, Math.min(100, raioKm));
        descobertaMercadosService.descobrir(latitude, longitude, raioSeguro);
        double deltaLatitude = raioSeguro / 111.32;
        double divisorLongitude = Math.max(0.2, Math.cos(Math.toRadians(latitude)));
        double deltaLongitude = raioSeguro / (111.32 * divisorLongitude);

        return unidadeRepository.findByAtivaTrueAndLatitudeBetweenAndLongitudeBetween(
                latitude - deltaLatitude,
                latitude + deltaLatitude,
                longitude - deltaLongitude,
                longitude + deltaLongitude
            ).stream()
            .filter(unidade -> unidade.getLatitude() != null && unidade.getLongitude() != null)
            .map(unidade -> new UnidadeComDistancia(
                unidade,
                Distancias.emQuilometros(
                    latitude,
                    longitude,
                    unidade.getLatitude(),
                    unidade.getLongitude()
                )
            ))
            .filter(resultado -> resultado.distanciaKm() <= raioSeguro)
            .sorted(Comparator.comparingDouble(UnidadeComDistancia::distanciaKm))
            .limit(100)
            .map(resultado -> new UnidadeProximaResponse(
                resultado.unidade().getId(),
                resultado.unidade().getRede(),
                resultado.unidade().getNome(),
                resultado.unidade().getEndereco(),
                resultado.unidade().getBairro(),
                resultado.unidade().getCidade(),
                resultado.unidade().getEstado(),
                arredondarDistancia(resultado.distanciaKm())
            ))
            .toList();
    }

    @Transactional
    public Oferta registrar(OfertaRegistro registro) {
        validarRegistro(registro);
        String chaveProduto = NormalizadorProduto.normalizar(
            String.join(
                " ",
                valor(registro.produto()),
                valor(registro.marca()),
                valor(registro.pesoVolume())
            )
        );
        String impressaoDigital = impressaoDigital(registro, chaveProduto);

        Optional<Oferta> existente = ofertaRepository.findByImpressaoDigital(impressaoDigital);
        Oferta oferta = existente.orElseGet(Oferta::new);
        oferta.setUnidade(registro.unidade());
        oferta.setProdutoNome(registro.produto().trim());
        oferta.setProdutoChave(chaveProduto);
        oferta.setCategoria(limpar(registro.categoria()));
        oferta.setMarca(limpar(registro.marca()));
        oferta.setPesoVolume(limpar(registro.pesoVolume()));
        oferta.setQuantidadeEmbalagem(registro.quantidadeEmbalagem());
        oferta.setUnidadeMedida(normalizarUnidade(registro.unidadeMedida()));
        oferta.setPrecoPromocional(registro.precoPromocional().setScale(2, RoundingMode.HALF_UP));
        oferta.setPrecoAnterior(registro.precoAnterior() == null
            ? null
            : registro.precoAnterior().setScale(2, RoundingMode.HALF_UP));
        oferta.setCondicaoEspecial(limpar(registro.condicaoEspecial()));
        oferta.setValidaDe(registro.validaDe());
        oferta.setValidaAte(registro.validaAte());
        oferta.setCapturadaEm(Instant.now());
        oferta.setFonteNome(registro.fonteNome().trim());
        oferta.setFonteUrl(registro.fonteUrl().trim());
        oferta.setConfiancaIa(registro.confianca().max(BigDecimal.ZERO).min(BigDecimal.ONE));
        oferta.setImpressaoDigital(impressaoDigital);
        oferta.setAtiva(true);
        return ofertaRepository.save(oferta);
    }

    @Scheduled(cron = "0 20 3 * * *", zone = "America/Fortaleza")
    @Transactional
    public void expirarOfertasVencidas() {
        ofertaRepository.desativarVencidas(LocalDate.now());
        ofertaRepository.deleteByAtivaFalseAndValidaAteBefore(LocalDate.now().minusMonths(3));
    }

    private List<OfertaResponse> ofertasParaProduto(
        String produto,
        LocalDate hoje,
        Double latitude,
        Double longitude,
        double raioKm,
        String cidade,
        String bairro,
        String mercado,
        String categoria
    ) {
        String chaveBusca = NormalizadorProduto.normalizar(produto);
        String termoPrincipal = chaveBusca.contains(" ")
            ? chaveBusca.substring(0, chaveBusca.indexOf(' '))
            : chaveBusca;

        return ofertaRepository.buscarVigentes(
                hoje,
                termoPrincipal,
                valor(cidade),
                valor(bairro),
                valor(mercado),
                valor(categoria),
                PageRequest.of(0, LIMITE_OFERTAS_POR_PRODUTO)
            ).stream()
            .filter(oferta -> NormalizadorProduto.corresponde(produto, oferta.getProdutoChave()))
            .map(oferta -> mapear(oferta, latitude, longitude))
            .filter(oferta -> oferta.distanciaKm() == null || oferta.distanciaKm() <= raioKm)
            .sorted(Comparator
                .comparing(OfertaResponse::precoPromocional)
                .thenComparing(
                    OfertaResponse::distanciaKm,
                    Comparator.nullsLast(Comparator.naturalOrder())
                ))
            .limit(30)
            .toList();
    }

    private OfertaResponse mapear(Oferta oferta, Double latitude, Double longitude) {
        UnidadeMercado unidade = oferta.getUnidade();
        Double distancia = null;
        if (latitude != null && unidade.getLatitude() != null && unidade.getLongitude() != null) {
            distancia = arredondarDistancia(Distancias.emQuilometros(
                latitude,
                longitude,
                unidade.getLatitude(),
                unidade.getLongitude()
            ));
        }
        PrecoBase precoBase = precoPorUnidadeBase(oferta);
        return new OfertaResponse(
            oferta.getId(),
            oferta.getProdutoNome(),
            oferta.getMarca(),
            oferta.getCategoria(),
            oferta.getPesoVolume(),
            oferta.getPrecoPromocional(),
            oferta.getPrecoAnterior(),
            precoBase.preco(),
            precoBase.unidade(),
            oferta.getCondicaoEspecial(),
            unidade.getRede(),
            unidade.getNome(),
            unidade.getEndereco(),
            unidade.getBairro(),
            unidade.getCidade(),
            unidade.getEstado(),
            distancia,
            oferta.getValidaAte(),
            oferta.getCapturadaEm(),
            oferta.getConfiancaIa()
        );
    }

    private PrecoBase precoPorUnidadeBase(Oferta oferta) {
        BigDecimal quantidade = oferta.getQuantidadeEmbalagem();
        String unidade = normalizarUnidade(oferta.getUnidadeMedida());
        if (quantidade == null || quantidade.signum() <= 0 || unidade == null) {
            return new PrecoBase(null, null);
        }

        BigDecimal quantidadeBase = quantidade;
        String unidadeBase = unidade;
        if ("g".equals(unidade)) {
            quantidadeBase = quantidade.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP);
            unidadeBase = "kg";
        } else if ("ml".equals(unidade)) {
            quantidadeBase = quantidade.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP);
            unidadeBase = "l";
        }
        return new PrecoBase(
            oferta.getPrecoPromocional().divide(quantidadeBase, 2, RoundingMode.HALF_UP),
            unidadeBase
        );
    }

    private void validarRegistro(OfertaRegistro registro) {
        if (registro == null
            || registro.unidade() == null
            || registro.produto() == null
            || registro.produto().isBlank()
            || registro.precoPromocional() == null
            || registro.precoPromocional().signum() <= 0
            || registro.fonteNome() == null
            || registro.fonteNome().isBlank()
            || registro.fonteUrl() == null
            || registro.fonteUrl().isBlank()
            || registro.confianca() == null) {
            throw new IllegalArgumentException("Oferta incompleta.");
        }
    }

    private String impressaoDigital(OfertaRegistro registro, String chaveProduto) {
        String base = String.join(
            "|",
            registro.unidade().getChaveExterna(),
            chaveProduto,
            registro.precoPromocional().setScale(2, RoundingMode.HALF_UP).toPlainString(),
            String.valueOf(registro.validaDe()),
            String.valueOf(registro.validaAte()),
            registro.fonteUrl().trim()
        );
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(base.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }

    private boolean coordenadaCompleta(Double latitude, Double longitude) {
        return latitude != null && longitude != null;
    }

    private String normalizarUnidade(String unidade) {
        if (unidade == null || unidade.isBlank()) {
            return null;
        }
        String limpa = unidade.trim().toLowerCase(Locale.ROOT);
        return switch (limpa) {
            case "litro", "litros", "lt" -> "l";
            case "quilo", "quilos", "kgs" -> "kg";
            case "grama", "gramas", "gr" -> "g";
            case "mililitro", "mililitros" -> "ml";
            case "un", "und", "unidades" -> "unidade";
            default -> limpa;
        };
    }

    private String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private String valor(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private String primeiroPreenchido(String... valores) {
        for (String valor : valores) {
            if (valor != null && !valor.isBlank()) {
                return valor.trim();
            }
        }
        return "";
    }

    private double arredondarDistancia(double distancia) {
        return Math.round(distancia * 10.0) / 10.0;
    }

    private record UnidadeComDistancia(UnidadeMercado unidade, double distanciaKm) {
    }

    private record PrecoBase(BigDecimal preco, String unidade) {
    }
}
