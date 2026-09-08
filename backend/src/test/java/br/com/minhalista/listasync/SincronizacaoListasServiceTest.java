package br.com.minhalista.listasync;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class SincronizacaoListasServiceTest {

    @Mock
    private EstadoListasUsuarioRepository repository;

    @Mock
    private UsuarioService usuarioService;

    private SincronizacaoListasService service;

    @BeforeEach
    void preparar() {
        service = new SincronizacaoListasService(
            repository,
            usuarioService,
            new ObjectMapper()
        );
        when(usuarioService.obterAutenticado()).thenReturn(new Usuario());
    }

    @Test
    void criaPrimeiraVersaoDoEstadoDoUsuario() {
        when(repository.buscarParaAtualizacao(null)).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any(EstadoListasUsuario.class)))
            .thenAnswer(invocacao -> invocacao.getArgument(0));

        EstadoListasResponse resposta = service.salvar(
            new AtualizarEstadoListasRequest("{\"formato\":1,\"listas\":[]}", 0L)
        );

        assertEquals(1, resposta.versao());
    }

    @Test
    void rejeitaAtualizacaoComVersaoAntiga() {
        EstadoListasUsuario existente = new EstadoListasUsuario();
        existente.setVersao(3);
        when(repository.buscarParaAtualizacao(null)).thenReturn(Optional.of(existente));

        assertThrows(
            RegraNegocioException.class,
            () -> service.salvar(
                new AtualizarEstadoListasRequest("{\"formato\":1}", 2L)
            )
        );
    }
}
