package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.assinatura.CicloAssinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;

@ExtendWith(MockitoExtension.class)
class MercadoPagoBrickServiceTest {

    @Mock
    private Usuario usuario;

    @Mock
    private Assinatura assinatura;

    private MercadoPagoBrickService service;

    @BeforeEach
    void preparar() {
        service = new MercadoPagoBrickService(
            "APP_USR-token",
            "APP_USR-public-key",
            "https://smart-list-backend.exemplo.com/api/webhooks/mercado-pago",
            "production"
        );
    }

    @Test
    void expoeSomentePublicKeyEAmbienteNoFrontend() {
        BrickConfigResponse config = service.configuracaoPublica();

        assertEquals("APP_USR-public-key", config.publicKey());
        assertEquals("production", config.environment());
    }

    @Test
    void bloqueiaValorDoBrickDiferenteDoValorCalculadoNoServidor() {
        prepararDadosPagamento();

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            () -> service.criarPagamento(
                usuario,
                assinatura,
                "credit_card",
                Map.of(
                    "transaction_amount", new BigDecimal("1.00"),
                    "payment_method_id", "visa",
                    "token", "token-seguro",
                    "installments", 1
                )
            )
        );

        assertTrue(erro.getMessage().contains("valor do plano"));
    }

    @Test
    void cartaoSemTokenSeguroNaoChegaAApiDoMercadoPago() {
        prepararDadosPagamento();

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            () -> service.criarPagamento(
                usuario,
                assinatura,
                "credit_card",
                Map.of(
                    "transaction_amount", new BigDecimal("9.97"),
                    "payment_method_id", "visa",
                    "installments", 1
                )
            )
        );

        assertTrue(erro.getMessage().contains("token seguro"));
    }

    @Test
    void exigePublicKeyAntesDeRenderizarBrick() {
        MercadoPagoBrickService semPublicKey = new MercadoPagoBrickService(
            "APP_USR-token",
            "",
            "https://smart-list-backend.exemplo.com/api/webhooks/mercado-pago",
            "production"
        );

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            semPublicKey::configuracaoPublica
        );

        assertTrue(erro.getMessage().contains("Public Key"));
    }

    private void prepararDadosPagamento() {
        when(usuario.getId()).thenReturn(UUID.randomUUID());
        when(usuario.getEmail()).thenReturn("cliente@example.com");
        when(usuario.getCpf()).thenReturn("52998224725");
        when(usuario.getNome()).thenReturn("Cliente Teste");
        when(assinatura.getId()).thenReturn(UUID.randomUUID());
        when(assinatura.getCiclo()).thenReturn(CicloAssinatura.MENSAL);
        when(assinatura.getValor()).thenReturn(new BigDecimal("9.97"));
    }
}
