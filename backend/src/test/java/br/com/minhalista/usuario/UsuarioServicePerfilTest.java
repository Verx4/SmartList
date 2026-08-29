package br.com.minhalista.usuario;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import br.com.minhalista.assinatura.AssinaturaValidadeService;

@ExtendWith(MockitoExtension.class)
class UsuarioServicePerfilTest {

    @Mock
    private UsuarioRepository repository;

    @Mock
    private AssinaturaValidadeService assinaturaValidadeService;

    @InjectMocks
    private UsuarioService service;

    @AfterEach
    void limparContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deveManterSessaoQuandoSincronizacaoDaAssinaturaFalhar() {
        Usuario usuario = new Usuario();
        usuario.setEmail("admin@example.com");
        usuario.setPerfil(Perfil.ADMIN);
        usuario.setTipoAcesso(TipoAcesso.FREE);

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("admin@example.com", null)
        );
        when(repository.findByEmailIgnoreCase("admin@example.com"))
            .thenReturn(Optional.of(usuario));
        doThrow(new IllegalStateException("Falha simulada no banco"))
            .when(assinaturaValidadeService).sincronizarUsuario(usuario);

        Usuario resposta = service.consultarPerfil();

        assertSame(usuario, resposta);
        verify(assinaturaValidadeService).sincronizarUsuario(usuario);
    }

    @Test
    void deveSalvarCpfHigienizadoEExibirSomenteMascara() {
        Usuario usuario = new Usuario();
        usuario.setEmail("cliente@example.com");

        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("cliente@example.com", null)
        );
        when(repository.findByEmailIgnoreCase("cliente@example.com"))
            .thenReturn(Optional.of(usuario));
        when(repository.existsByCpf("52998224725")).thenReturn(false);

        CpfPerfilResponse resposta = service.atualizarCpf(
            new AtualizarCpfRequest("529.982.247-25")
        );

        assertEquals("52998224725", usuario.getCpf());
        assertEquals("529.982.247-25", resposta.cpf());
        assertEquals("***.***.***-25", resposta.cpfMascarado());
        verify(repository).saveAndFlush(usuario);
    }
}
