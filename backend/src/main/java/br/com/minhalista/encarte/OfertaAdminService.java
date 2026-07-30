package br.com.minhalista.encarte;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.oferta.UnidadeMercado;
import br.com.minhalista.oferta.UnidadeMercadoRepository;

@Service
public class OfertaAdminService {

    private final UnidadeMercadoRepository unidadeRepository;
    private final FonteEncarteRepository fonteRepository;
    private final UrlPublicaValidator urlValidator;
    private final CapturaEncarteService capturaService;

    public OfertaAdminService(
        UnidadeMercadoRepository unidadeRepository,
        FonteEncarteRepository fonteRepository,
        UrlPublicaValidator urlValidator,
        CapturaEncarteService capturaService
    ) {
        this.unidadeRepository = unidadeRepository;
        this.fonteRepository = fonteRepository;
        this.urlValidator = urlValidator;
        this.capturaService = capturaService;
    }

    @Transactional(readOnly = true)
    public List<UnidadeMercadoAdminResponse> unidades() {
        return unidadeRepository.findAll().stream()
            .sorted(Comparator
                .comparing(UnidadeMercado::getEstado)
                .thenComparing(UnidadeMercado::getCidade)
                .thenComparing(UnidadeMercado::getRede)
                .thenComparing(UnidadeMercado::getNome))
            .map(this::mapearUnidade)
            .toList();
    }

    @Transactional
    public UnidadeMercadoAdminResponse salvarUnidade(UnidadeMercadoAdminRequest request) {
        String chave = request.chaveExterna() == null || request.chaveExterna().isBlank()
            ? chaveUnidade(request)
            : request.chaveExterna().trim();
        UnidadeMercado unidade = unidadeRepository.findByChaveExterna(chave)
            .orElseGet(UnidadeMercado::new);
        unidade.setChaveExterna(chave);
        unidade.setRede(request.rede().trim());
        unidade.setNome(request.nome().trim());
        unidade.setEndereco(limpar(request.endereco()));
        unidade.setBairro(limpar(request.bairro()));
        unidade.setCidade(request.cidade().trim());
        unidade.setEstado(request.estado().trim().toUpperCase(Locale.ROOT));
        unidade.setLatitude(request.latitude());
        unidade.setLongitude(request.longitude());
        unidade.setAtiva(request.ativa());
        return mapearUnidade(unidadeRepository.save(unidade));
    }

    @Transactional(readOnly = true)
    public List<FonteEncarteAdminResponse> fontes() {
        return fonteRepository.listarComUnidade().stream().map(this::mapearFonte).toList();
    }

    @Transactional
    public FonteEncarteAdminResponse salvarFonte(FonteEncarteAdminRequest request) {
        UnidadeMercado unidade = unidadeRepository.findById(request.unidadeId())
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Unidade de mercado não encontrada."
            ));
        String url = urlValidator.validar(request.url()).toString();
        String chave = sha256(unidade.getId() + "|" + url);
        FonteEncarte fonte = fonteRepository.findByChaveFonte(chave)
            .orElseGet(FonteEncarte::new);
        fonte.setUnidade(unidade);
        fonte.setChaveFonte(chave);
        fonte.setNome(request.nome().trim());
        fonte.setUrl(url);
        fonte.setTipo(request.tipo());
        fonte.setAtiva(request.ativa());
        if (fonte.getStatus() == null) {
            fonte.setStatus(StatusFonteEncarte.AGUARDANDO);
        }
        return mapearFonte(fonteRepository.save(fonte));
    }

    public FonteEncarteAdminResponse processar(UUID fonteId) {
        return mapearFonte(capturaService.processar(fonteId));
    }

    private UnidadeMercadoAdminResponse mapearUnidade(UnidadeMercado unidade) {
        return new UnidadeMercadoAdminResponse(
            unidade.getId(),
            unidade.getChaveExterna(),
            unidade.getRede(),
            unidade.getNome(),
            unidade.getEndereco(),
            unidade.getBairro(),
            unidade.getCidade(),
            unidade.getEstado(),
            unidade.getLatitude(),
            unidade.getLongitude(),
            unidade.isAtiva()
        );
    }

    private FonteEncarteAdminResponse mapearFonte(FonteEncarte fonte) {
        return new FonteEncarteAdminResponse(
            fonte.getId(),
            fonte.getUnidade().getId(),
            fonte.getUnidade().getRede(),
            fonte.getUnidade().getNome(),
            fonte.getNome(),
            fonte.getUrl(),
            fonte.getTipo(),
            fonte.getStatus(),
            fonte.isAtiva(),
            fonte.getVerificadaEm(),
            fonte.getProcessadaEm(),
            fonte.getProximaTentativaEm(),
            fonte.getOfertasExtraidas(),
            fonte.getMensagemStatus()
        );
    }

    private String chaveUnidade(UnidadeMercadoAdminRequest request) {
        return "smartlist-" + sha256(String.join(
            "|",
            request.rede().trim().toLowerCase(Locale.ROOT),
            request.nome().trim().toLowerCase(Locale.ROOT),
            request.cidade().trim().toLowerCase(Locale.ROOT),
            request.estado().trim().toLowerCase(Locale.ROOT),
            limpar(request.endereco()) == null ? "" : limpar(request.endereco()).toLowerCase(Locale.ROOT)
        )).substring(0, 24);
    }

    private String sha256(String valor) {
        try {
            return HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8))
            );
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }

    private String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
