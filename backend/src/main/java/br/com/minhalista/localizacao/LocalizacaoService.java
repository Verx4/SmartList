package br.com.minhalista.localizacao;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.oferta.DescobertaMercadosService;
import br.com.minhalista.oferta.UnidadeMercado;
import br.com.minhalista.oferta.UnidadeMercadoRepository;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class LocalizacaoService {

    private static final Duration RETENCAO_COORDENADAS = Duration.ofHours(24);
    private static final Duration RETENCAO_LOCALIDADE = Duration.ofDays(30);
    private static final double FATOR_ARREDONDAMENTO = 1000.0;

    private final LocalizacaoUsuarioRepository repository;
    private final UnidadeMercadoRepository unidadeRepository;
    private final UsuarioService usuarioService;
    private final DescobertaMercadosService descobertaMercadosService;

    public LocalizacaoService(
        LocalizacaoUsuarioRepository repository,
        UnidadeMercadoRepository unidadeRepository,
        UsuarioService usuarioService,
        DescobertaMercadosService descobertaMercadosService
    ) {
        this.repository = repository;
        this.unidadeRepository = unidadeRepository;
        this.usuarioService = usuarioService;
        this.descobertaMercadosService = descobertaMercadosService;
    }

    @Transactional
    public LocalizacaoResponse salvar(LocalizacaoRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        validarCoordenadas(request);
        String cidade = limpar(request.cidade());
        String estado = limpar(request.estado());
        String bairro = limpar(request.bairro());
        if (request.origem() == OrigemLocalizacao.GPS
            && (cidade == null || estado == null)) {
            DescobertaMercadosService.LocalidadePublica publica =
                descobertaMercadosService.localizar(request.latitude(), request.longitude());
            cidade = cidade == null ? publica.cidade() : cidade;
            estado = estado == null ? publica.estado() : estado;
            bairro = bairro == null ? publica.bairro() : bairro;
        }
        if (cidade == null || estado == null || estado.length() != 2) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Não foi possível identificar cidade e estado. Informe-os manualmente."
            );
        }
        Instant agora = Instant.now();
        LocalizacaoUsuario localizacao = repository.findByUsuarioId(usuario.getId())
            .orElseGet(LocalizacaoUsuario::new);

        localizacao.setUsuario(usuario);
        localizacao.setOrigem(request.origem());
        localizacao.setBairro(bairro);
        localizacao.setCidade(cidade);
        localizacao.setEstado(estado.toUpperCase(Locale.ROOT));
        localizacao.setConsentimentoEm(
            localizacao.getConsentimentoEm() == null
                ? agora
                : localizacao.getConsentimentoEm()
        );
        localizacao.setAtualizadaEm(agora);
        localizacao.setLocalidadeExpiraEm(agora.plus(RETENCAO_LOCALIDADE));

        if (request.origem() == OrigemLocalizacao.GPS) {
            localizacao.setLatitude(arredondar(request.latitude()));
            localizacao.setLongitude(arredondar(request.longitude()));
            localizacao.setPrecisaoMetros(request.precisaoMetros());
            localizacao.setCoordenadasExpiramEm(agora.plus(RETENCAO_COORDENADAS));
        } else {
            apagarCoordenadas(localizacao);
        }
        return mapear(repository.save(localizacao), agora);
    }

    @Transactional(readOnly = true)
    public LocalizacaoResponse minha() {
        Usuario usuario = usuarioService.obterAutenticado();
        Instant agora = Instant.now();
        return repository.findByUsuarioId(usuario.getId())
            .filter(localizacao -> localizacao.getLocalidadeExpiraEm().isAfter(agora))
            .map(localizacao -> mapear(localizacao, agora))
            .orElseGet(() -> vazia(usuario));
    }

    @Transactional(readOnly = true)
    public Optional<LocalizacaoAtiva> ativaDoUsuario(Usuario usuario) {
        Instant agora = Instant.now();
        return repository.findByUsuarioId(usuario.getId())
            .filter(localizacao -> localizacao.getLocalidadeExpiraEm().isAfter(agora))
            .map(localizacao -> new LocalizacaoAtiva(
                coordenadasAtivas(localizacao, agora) ? localizacao.getLatitude() : null,
                coordenadasAtivas(localizacao, agora) ? localizacao.getLongitude() : null,
                localizacao.getBairro(),
                localizacao.getCidade(),
                localizacao.getEstado()
            ));
    }

    @Transactional
    public LocalizacaoResponse confirmarUnidade(ConfirmarUnidadeRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        LocalizacaoUsuario localizacao = repository.findByUsuarioId(usuario.getId())
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Autorize ou informe sua localização antes de confirmar a unidade."
            ));
        UnidadeMercado unidade = unidadeRepository.findById(request.unidadeId())
            .filter(UnidadeMercado::isAtiva)
            .orElseThrow(() -> new RegraNegocioException(
                HttpStatus.NOT_FOUND,
                "Unidade de mercado não encontrada."
            ));
        localizacao.setUnidadeConfirmada(unidade);
        localizacao.setUnidadeConfirmadaEm(Instant.now());
        localizacao.setAtualizadaEm(Instant.now());
        return mapear(repository.save(localizacao), Instant.now());
    }

    @Transactional
    public void revogar() {
        Usuario usuario = usuarioService.obterAutenticado();
        repository.findByUsuarioId(usuario.getId()).ifPresent(repository::delete);
    }

    @Scheduled(cron = "0 40 * * * *", zone = "America/Fortaleza")
    @Transactional
    public void limparDadosExpirados() {
        Instant agora = Instant.now();
        repository.apagarCoordenadasExpiradas(agora);
        repository.deleteByLocalidadeExpiraEmBefore(agora);
    }

    private void validarCoordenadas(LocalizacaoRequest request) {
        boolean temLatitude = request.latitude() != null;
        boolean temLongitude = request.longitude() != null;
        if (request.origem() == OrigemLocalizacao.GPS && (!temLatitude || !temLongitude)) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Latitude e longitude são obrigatórias para localização atual."
            );
        }
    }

    private LocalizacaoResponse mapear(LocalizacaoUsuario localizacao, Instant agora) {
        UnidadeMercado unidade = localizacao.getUnidadeConfirmada();
        return new LocalizacaoResponse(
            localizacao.getLocalidadeExpiraEm().isAfter(agora),
            coordenadasAtivas(localizacao, agora),
            localizacao.getBairro(),
            localizacao.getCidade(),
            localizacao.getEstado(),
            localizacao.getOrigem(),
            localizacao.getAtualizadaEm(),
            localizacao.getCoordenadasExpiramEm(),
            localizacao.getLocalidadeExpiraEm(),
            unidade == null ? null : unidade.getId(),
            unidade == null ? null : unidade.getNome(),
            unidade == null ? null : unidade.getRede()
        );
    }

    private LocalizacaoResponse vazia(Usuario usuario) {
        return new LocalizacaoResponse(
            false,
            false,
            null,
            usuario.getCidade(),
            usuario.getEstado(),
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

    private boolean coordenadasAtivas(LocalizacaoUsuario localizacao, Instant agora) {
        return localizacao.getLatitude() != null
            && localizacao.getLongitude() != null
            && localizacao.getCoordenadasExpiramEm() != null
            && localizacao.getCoordenadasExpiramEm().isAfter(agora);
    }

    private void apagarCoordenadas(LocalizacaoUsuario localizacao) {
        localizacao.setLatitude(null);
        localizacao.setLongitude(null);
        localizacao.setPrecisaoMetros(null);
        localizacao.setCoordenadasExpiramEm(null);
    }

    private Double arredondar(Double valor) {
        return valor == null ? null : Math.round(valor * FATOR_ARREDONDAMENTO) / FATOR_ARREDONDAMENTO;
    }

    private String limpar(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
