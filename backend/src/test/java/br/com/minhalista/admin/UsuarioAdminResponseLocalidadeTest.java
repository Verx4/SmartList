package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;

class UsuarioAdminResponseLocalidadeTest {

    @Test
    void deveExporCidadeEEstadoAoAdministrador() {
        Usuario usuario = new Usuario();
        usuario.setNome("Ana");
        usuario.setEmail("ana@example.com");
        usuario.setCidade("Recife");
        usuario.setEstado("PE");
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);

        UsuarioAdminResponse resposta = UsuarioAdminResponse.de(usuario, null);

        assertEquals("Recife", resposta.cidade());
        assertEquals("PE", resposta.estado());
    }
}
