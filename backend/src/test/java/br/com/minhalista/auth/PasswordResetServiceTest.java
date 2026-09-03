package br.com.minhalista.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import br.com.minhalista.auth.dto.CodigoRecuperacaoResponse;
import br.com.minhalista.auth.dto.RecuperarSenhaRequest;
import br.com.minhalista.auth.dto.RedefinirSenhaRequest;
import br.com.minhalista.auth.dto.VerificarCodigoRecuperacaoRequest;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailRecuperacaoService emailService;

    private PasswordResetService service;

    @BeforeEach
    void configurar() {
        PasswordResetProperties properties = new PasswordResetProperties();
        properties.setPepper("segredo-de-teste-com-mais-de-trinta-e-dois-caracteres");
        properties.setEmailEnabled(true);
        properties.setEmailFrom("naoresponda@smartlist.test");
        service = new PasswordResetService(
            tokenRepository,
            usuarioRepository,
            passwordEncoder,
            emailService,
            properties
        );
    }

    @Test
    void deveEnviarCodigoParaUsuarioCadastradoSemExporConta() {
        when(emailService.disponivel()).thenReturn(true);
        Usuario usuario = usuarioAtivo();
        when(usuarioRepository.findByEmailIgnoreCase("cliente@example.com"))
            .thenReturn(Optional.of(usuario));
        when(tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(anyString()))
            .thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash-do-codigo");

        var resposta = service.solicitarRecuperacao(
            new RecuperarSenhaRequest("CLIENTE@example.com"),
            "127.0.0.1"
        );

        assertEquals(PasswordResetService.MENSAGEM_GENERICA, resposta.mensagem());
        verify(tokenRepository).saveAndFlush(any(PasswordResetToken.class));
        verify(emailService).enviarCodigo(
            eq("cliente@example.com"),
            eq("Cliente"),
            org.mockito.ArgumentMatchers.matches("^[0-9]{6}$")
        );
    }

    @Test
    void deveManterRespostaGenericaQuandoEmailNaoExiste() {
        when(emailService.disponivel()).thenReturn(true);
        when(usuarioRepository.findByEmailIgnoreCase("ausente@example.com"))
            .thenReturn(Optional.empty());
        when(tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(anyString()))
            .thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash-do-codigo");

        var resposta = service.solicitarRecuperacao(
            new RecuperarSenhaRequest("ausente@example.com"),
            "127.0.0.1"
        );

        assertEquals(PasswordResetService.MENSAGEM_GENERICA, resposta.mensagem());
        verify(emailService, never()).enviarCodigo(anyString(), anyString(), anyString());
    }

    @Test
    void deveValidarCodigoCorretoEEmitirTokenDeUsoUnico() {
        PasswordResetToken registro = tokenValido();
        when(tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(anyString()))
            .thenReturn(Optional.of(registro));
        when(passwordEncoder.matches("654321", "hash-do-codigo")).thenReturn(true);

        CodigoRecuperacaoResponse resposta = service.verificarCodigo(
            new VerificarCodigoRecuperacaoRequest("cliente@example.com", "654321")
        );

        assertNotNull(resposta.token());
        assertTrue(resposta.token().length() >= 40);
        assertEquals(64, registro.getTokenRedefinicaoHash().length());
        assertNotNull(registro.getVerificadoEm());
        verify(tokenRepository).saveAndFlush(registro);
    }

    @Test
    void deveBloquearNaQuintaTentativaIncorreta() {
        PasswordResetToken registro = tokenValido();
        registro.setTentativas(4);
        when(tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(anyString()))
            .thenReturn(Optional.of(registro));
        when(passwordEncoder.matches("111111", "hash-do-codigo")).thenReturn(false);

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            () -> service.verificarCodigo(
                new VerificarCodigoRecuperacaoRequest("cliente@example.com", "111111")
            )
        );

        assertEquals(5, registro.getTentativas());
        assertTrue(erro.getMessage().contains("máximo de tentativas"));
        verify(tokenRepository).saveAndFlush(registro);
    }

    @Test
    void deveRejeitarCodigoExpirado() {
        PasswordResetToken registro = tokenValido();
        registro.setExpiraEm(Instant.now().minusSeconds(1));
        when(tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(anyString()))
            .thenReturn(Optional.of(registro));

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            () -> service.verificarCodigo(
                new VerificarCodigoRecuperacaoRequest("cliente@example.com", "654321")
            )
        );

        assertTrue(erro.getMessage().contains("expirou"));
    }

    @Test
    void deveRedefinirSenhaEInvalidarUsoRepetido() {
        PasswordResetToken registro = tokenValido();
        when(tokenRepository.findFirstByEmailHashOrderByCriadoEmDesc(anyString()))
            .thenReturn(Optional.of(registro));
        when(passwordEncoder.matches("654321", "hash-do-codigo")).thenReturn(true);
        CodigoRecuperacaoResponse verificacao = service.verificarCodigo(
            new VerificarCodigoRecuperacaoRequest("cliente@example.com", "654321")
        );
        when(tokenRepository.findByTokenRedefinicaoHash(
            registro.getTokenRedefinicaoHash()
        )).thenReturn(Optional.of(registro));
        when(passwordEncoder.matches("senha-nova", "hash-senha-atual")).thenReturn(false);
        when(passwordEncoder.encode("senha-nova")).thenReturn("hash-senha-nova");

        service.redefinirSenha(
            new RedefinirSenhaRequest(verificacao.token(), "senha-nova", "senha-nova")
        );

        assertEquals("hash-senha-nova", registro.getUsuario().getSenhaHash());
        assertNotNull(registro.getUtilizadoEm());
        verify(usuarioRepository).saveAndFlush(registro.getUsuario());

        RegraNegocioException reutilizacao = assertThrows(
            RegraNegocioException.class,
            () -> service.redefinirSenha(
                new RedefinirSenhaRequest(verificacao.token(), "outra-senha", "outra-senha")
            )
        );
        assertTrue(reutilizacao.getMessage().contains("já foi utilizado"));
    }

    private PasswordResetToken tokenValido() {
        PasswordResetToken token = new PasswordResetToken();
        token.setUsuario(usuarioAtivo());
        token.setEmailHash("email-hash");
        token.setIpHash("ip-hash");
        token.setCodigoHash("hash-do-codigo");
        token.setCriadoEm(Instant.now());
        token.setExpiraEm(Instant.now().plusSeconds(600));
        return token;
    }

    private Usuario usuarioAtivo() {
        Usuario usuario = new Usuario();
        usuario.setNome("Cliente");
        usuario.setEmail("cliente@example.com");
        usuario.setSenhaHash("hash-senha-atual");
        usuario.setAtivo(true);
        return usuario;
    }
}
