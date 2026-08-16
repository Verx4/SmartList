package br.com.minhalista.localizacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class LocalizacaoAdminServiceTest {

    @Mock
    private LocalizacaoUsuarioRepository localizacaoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private LocalizacaoAdminService service;

    @Test
    void deveAgruparUsuariosAtivosPeloEstadoInformadoNoCadastro() {
        when(usuarioRepository.findAllByOrderByCriadoEmDesc()).thenReturn(List.of(
            usuario("Recife", "pe", true),
            usuario("Olinda", "PE", true),
            usuario("São Paulo", "SP", true),
            usuario("Rio de Janeiro", "RJ", false)
        ));
        when(localizacaoRepository.buscarAtivasParaAgregacao(any())).thenReturn(List.of());

        LocalizacaoAdminResponse resposta = service.resumo();

        assertEquals(3, resposta.usuariosComLocalidade());
        assertEquals("PE", resposta.estados().getFirst().estado());
        assertEquals(2, resposta.estados().getFirst().usuarios());
        assertEquals("SP", resposta.estados().get(1).estado());
        assertEquals(1, resposta.estados().get(1).usuarios());
    }

    private Usuario usuario(String cidade, String estado, boolean ativo) {
        Usuario usuario = new Usuario();
        usuario.setCidade(cidade);
        usuario.setEstado(estado);
        usuario.setAtivo(ativo);
        return usuario;
    }
}
