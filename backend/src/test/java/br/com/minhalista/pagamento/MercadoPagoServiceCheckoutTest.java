package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
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
class MercadoPagoServiceCheckoutTest {

    @Mock
    private Usuario usuario;

    @Mock
    private Assinatura assinatura;

    private MercadoPagoService service;

    @BeforeEach
    void preparar() {
        service = new MercadoPagoService(
            "TEST-token",
            "https://api.exemplo.com/webhook",
            "segredo",
            "https://smart-list.exemplo.com"
        );
        lenient().when(usuario.getId()).thenReturn(UUID.randomUUID());
        lenient().when(usuario.getEmail()).thenReturn("cliente@example.com");
        lenient().when(usuario.getCpf()).thenReturn("52998224725");
        lenient().when(assinatura.getId()).thenReturn(UUID.randomUUID());
    }

    @Test
    void enviaPlanoSemCupomComValorOriginal() {
        prepararPlano(CicloAssinatura.MENSAL, "9.97");

        Map<String, Object> corpo = service.montarCorpoPreferencia(usuario, assinatura);

        assertEquals(new BigDecimal("9.97"), valorUnitario(corpo));
        assertTrue(item(corpo).get("title") instanceof String);
        assertEquals(1, item(corpo).get("quantity"));
        assertTrue(valorUnitario(corpo).signum() > 0);
        assertEquals("CPF", identificacao(corpo).get("type"));
        assertEquals("52998224725", identificacao(corpo).get("number"));
        assertFalse(metadata(corpo).containsKey("cupom_codigo"));
        assertFalse(contemNuloOuTextoVazio(corpo));
    }

    @Test
    void enviaSmart5ComoNumeroMonetarioDeNoveEQuarentaESete() {
        prepararPlano(CicloAssinatura.MENSAL, "9.47");
        when(assinatura.getCupomCodigo()).thenReturn("SMART5");
        when(assinatura.getCupomPercentualDesconto()).thenReturn(new BigDecimal("5.00"));
        when(assinatura.getCupomValorOriginal()).thenReturn(new BigDecimal("9.97"));
        when(assinatura.getCupomValorDesconto()).thenReturn(new BigDecimal("0.50"));

        Map<String, Object> corpo = service.montarCorpoPreferencia(usuario, assinatura);

        assertEquals(new BigDecimal("9.47"), valorUnitario(corpo));
        assertEquals("BRL", item(corpo).get("currency_id"));
        assertEquals("SMART5", metadata(corpo).get("cupom_codigo"));
        assertEquals(new BigDecimal("5.00"), metadata(corpo).get("cupom_percentual_desconto"));
        assertEquals(new BigDecimal("9.97"), metadata(corpo).get("cupom_valor_original"));
        assertEquals(new BigDecimal("0.50"), metadata(corpo).get("cupom_valor_desconto"));
        assertFalse(contemNuloOuTextoVazio(corpo));
    }

    @Test
    void enviaSmart10ComoNumeroMonetarioDeVinteEQuatroEVinteEDois() {
        prepararPlano(CicloAssinatura.TRIMESTRAL, "24.22");

        Map<String, Object> corpo = service.montarCorpoPreferencia(usuario, assinatura);

        assertEquals(new BigDecimal("24.22"), valorUnitario(corpo));
    }

    @Test
    void impedeCheckoutQuandoPerfilAindaNaoTemCpfValido() {
        when(usuario.getCpf()).thenReturn(null);

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            () -> service.montarCorpoPreferencia(usuario, assinatura)
        );

        assertTrue(erro.getMessage().contains("CPF válido no seu perfil"));
    }

    @Test
    void segredoDoWebhookNaoBloqueiaCriacaoDaPreferencia() {
        MercadoPagoService semSegredo = new MercadoPagoService(
            "TEST-token",
            "https://api.exemplo.com/webhook",
            "",
            "http://127.0.0.1:5500"
        );

        semSegredo.exigirConfiguracaoCheckout();
    }

    @Test
    void informaAsDuasVariaveisAceitasQuandoTokenEstaAusente() {
        MercadoPagoService semToken = new MercadoPagoService(
            "",
            "https://api.exemplo.com/webhook",
            "segredo",
            "https://smart-list.exemplo.com"
        );

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            semToken::exigirConfiguracaoCheckout
        );

        assertTrue(erro.getMessage().contains("MERCADO_PAGO_ACCESS_TOKEN"));
        assertTrue(erro.getMessage().contains("MERCADO_PAGO_TOKEN"));
    }

    @Test
    void bloqueiaUrlLocalEmCheckoutDeProducao() {
        MercadoPagoService producaoLocal = new MercadoPagoService(
            "APP_USR-token",
            "https://api.exemplo.com/webhook",
            "segredo",
            "http://127.0.0.1:5500"
        );

        RegraNegocioException erro = assertThrows(
            RegraNegocioException.class,
            producaoLocal::exigirConfiguracaoCheckout
        );

        assertTrue(erro.getMessage().contains("URL de retorno"));
    }

    private void prepararPlano(CicloAssinatura ciclo, String valor) {
        when(assinatura.getCiclo()).thenReturn(ciclo);
        when(assinatura.getValor()).thenReturn(new BigDecimal(valor));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> item(Map<String, Object> corpo) {
        return ((List<Map<String, Object>>) corpo.get("items")).get(0);
    }

    private BigDecimal valorUnitario(Map<String, Object> corpo) {
        return (BigDecimal) item(corpo).get("unit_price");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> metadata(Map<String, Object> corpo) {
        return (Map<String, Object>) corpo.get("metadata");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> identificacao(Map<String, Object> corpo) {
        Map<String, Object> pagador = (Map<String, Object>) corpo.get("payer");
        return (Map<String, Object>) pagador.get("identification");
    }

    private boolean contemNuloOuTextoVazio(Object valor) {
        if (valor == null) {
            return true;
        }

        if (valor instanceof String texto) {
            return texto.isBlank();
        }

        if (valor instanceof Map<?, ?> mapa) {
            return mapa.values().stream().anyMatch(this::contemNuloOuTextoVazio);
        }

        if (valor instanceof Iterable<?> itens) {
            for (Object item : itens) {
                if (contemNuloOuTextoVazio(item)) {
                    return true;
                }
            }
        }

        return false;
    }
}
