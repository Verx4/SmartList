package br.com.minhalista.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

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

    @Test
    void devePriorizarInatividadeDepoisDeQuarentaDiasSemUso() {
        Usuario usuario = new Usuario();
        usuario.setNome("Carlos");
        usuario.setEmail("carlos@example.com");
        usuario.setTipoAcesso(TipoAcesso.PREMIUM);
        usuario.setAtivo(true);
        usuario.setUltimoAcessoEm(Instant.now().minus(41, ChronoUnit.DAYS));

        UsuarioAdminResponse inativo = UsuarioAdminResponse.de(usuario, "MENSAL");

        assertEquals("INATIVO", inativo.classificacaoAcesso());
        assertEquals(usuario.getUltimoAcessoEm(), inativo.ultimoAcessoEm());

        usuario.setUltimoAcessoEm(Instant.now().minus(39, ChronoUnit.DAYS));

        assertEquals(
            "PREMIUM_MANUAL",
            UsuarioAdminResponse.de(usuario, null).classificacaoAcesso()
        );
    }
}
