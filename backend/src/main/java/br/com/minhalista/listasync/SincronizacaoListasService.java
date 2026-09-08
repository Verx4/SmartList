package br.com.minhalista.listasync;

import java.util.Optional;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;
import tools.jackson.databind.ObjectMapper;

@Service
public class SincronizacaoListasService {

    private final EstadoListasUsuarioRepository repository;
    private final UsuarioService usuarioService;
    private final ObjectMapper objectMapper;

    public SincronizacaoListasService(
        EstadoListasUsuarioRepository repository,
        UsuarioService usuarioService,
        ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.usuarioService = usuarioService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public EstadoListasResponse consultar() {
        Usuario usuario = usuarioService.obterAutenticado();
        return repository.findByUsuarioId(usuario.getId())
            .map(EstadoListasResponse::de)
            .orElseGet(EstadoListasResponse::vazio);
    }

    @Transactional
    public EstadoListasResponse salvar(AtualizarEstadoListasRequest request) {
        validarConteudo(request.conteudo());

        Usuario usuario = usuarioService.obterAutenticado();
        Optional<EstadoListasUsuario> existente = repository
            .buscarParaAtualizacao(usuario.getId());
        long versaoAtual = existente.map(EstadoListasUsuario::getVersao).orElse(0L);
        long versaoBase = request.versaoBase() == null ? 0L : request.versaoBase();

        if (versaoBase != versaoAtual) {
            throw conflitoDeVersao();
        }

        EstadoListasUsuario estado = existente.orElseGet(() -> {
            EstadoListasUsuario novo = new EstadoListasUsuario();
            novo.setUsuario(usuario);
            return novo;
        });
        estado.setConteudoJson(request.conteudo());
        estado.setVersao(versaoAtual + 1);

        try {
            return EstadoListasResponse.de(repository.saveAndFlush(estado));
        } catch (DataIntegrityViolationException erro) {
            throw conflitoDeVersao();
        }
    }

    private void validarConteudo(String conteudo) {
        try {
            if (!objectMapper.readTree(conteudo).isObject()) {
                throw new IllegalArgumentException("O conteúdo deve ser um objeto JSON.");
            }
        } catch (Exception erro) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Os dados das listas são inválidos."
            );
        }
    }

    private RegraNegocioException conflitoDeVersao() {
        return new RegraNegocioException(
            HttpStatus.CONFLICT,
            "As listas foram atualizadas em outro dispositivo. Sincronize e tente novamente."
        );
    }
}
