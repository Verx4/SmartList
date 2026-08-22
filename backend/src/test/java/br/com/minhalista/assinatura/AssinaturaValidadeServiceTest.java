package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import br.com.minhalista.usuario.TipoAcesso;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class AssinaturaValidadeServiceTest {

    @Mock
    private AssinaturaRepository assinaturaRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private AssinaturaValidadeService service;

    private Usuario usuario;
    private Assinatura assinatura;

    @BeforeEach
    void preparar() {
        usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", UUID.randomUUID());
        usuario.setTipoAcesso(TipoAcesso.PREMIUM);

        assinatura = new Assinatura();
        assinatura.setUsuario(usuario);
        assinatura.setStatus(StatusAssinatura.ATIVA);
        assinatura.setVenceEm(Instant.now().minusSeconds(60));
    }

    @Test
    void deveVoltarUsuarioParaFreeQuandoAssinaturaVencer() {
        when(assinaturaRepository.findAllByStatusAndVenceEmLessThanEqual(
            any(),
            any(Instant.class)
        )).thenReturn(List.of(assinatura));
        when(assinaturaRepository.existsByUsuarioIdAndStatusAndVenceEmAfter(
            any(),
            any(),
            any(Instant.class)
        )).thenReturn(false);

        service.sincronizarAssinaturasExpiradas();

        assertEquals(StatusAssinatura.EXPIRADA, assinatura.getStatus());
        assertEquals(TipoAcesso.FREE, usuario.getTipoAcesso());
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void deveManterPremiumQuandoExisteRenovacaoVigente() {
        when(assinaturaRepository.findAllByStatusAndVenceEmLessThanEqual(
            any(),
            any(Instant.class)
        )).thenReturn(List.of(assinatura));
        when(assinaturaRepository.existsByUsuarioIdAndStatusAndVenceEmAfter(
            any(),
            any(),
            any(Instant.class)
        )).thenReturn(true);

        service.sincronizarAssinaturasExpiradas();

        assertEquals(StatusAssinatura.EXPIRADA, assinatura.getStatus());
        assertEquals(TipoAcesso.PREMIUM, usuario.getTipoAcesso());
        verify(usuarioRepository, never()).save(usuario);
    }
}
