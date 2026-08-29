package br.com.minhalista.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import br.com.minhalista.auth.dto.AuthResponse;
import br.com.minhalista.auth.dto.LoginRequest;
import br.com.minhalista.assinatura.AssinaturaValidadeService;
import br.com.minhalista.usuario.Perfil;
import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AuthServiceLoginTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AssinaturaValidadeService assinaturaValidadeService;

    @InjectMocks
    private AuthService service;

    private Usuario usuario;

    @BeforeEach
    void preparar() {
        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        usuario.setNome("Fernando");
        usuario.setEmail("fernando@example.com");
        usuario.setSenhaHash("senha-codificada");
        usuario.setPerfil(Perfil.USUARIO);
        usuario.setTipoAcesso(TipoAcesso.FREE);
        usuario.setAtivo(true);
    }

    @Test
    void devePermitirLoginQuandoSincronizacaoDaAssinaturaFalhar() {
        LoginRequest request = new LoginRequest("FERNANDO@EXAMPLE.COM", "segredo123");

        when(usuarioRepository.findByEmailIgnoreCase("fernando@example.com"))
            .thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("segredo123", "senha-codificada")).thenReturn(true);
        doThrow(new IllegalStateException("Falha simulada no banco"))
            .when(assinaturaValidadeService).sincronizarUsuario(usuario);
        when(usuarioRepository.save(usuario)).thenReturn(usuario);
        when(jwtService.gerarToken(usuario)).thenReturn("token-valido");
        when(jwtService.getExpiracaoSegundos()).thenReturn(7_200L);

        AuthResponse resposta = service.login(request);

        assertEquals("token-valido", resposta.accessToken());
        assertEquals("fernando@example.com", resposta.usuario().email());
        assertEquals("FREE", resposta.usuario().tipoAcesso());
        assertNotNull(usuario.getUltimoAcessoEm());
        verify(usuarioRepository).save(usuario);
    }
}
