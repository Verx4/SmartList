package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
        when(usuario.getId()).thenReturn(UUID.randomUUID());
        when(usuario.getEmail()).thenReturn("cliente@example.com");
        when(assinatura.getId()).thenReturn(UUID.randomUUID());
    }

    @Test
    void enviaPlanoSemCupomComValorOriginal() {
        prepararPlano(CicloAssinatura.MENSAL, "9.97");

        Map<String, Object> corpo = service.montarCorpoPreferencia(usuario, assinatura);

        assertEquals(new BigDecimal("9.97"), valorUnitario(corpo));
    }

    @Test
    void enviaSmart5ComoNumeroMonetarioDeNoveEQuarentaESete() {
        prepararPlano(CicloAssinatura.MENSAL, "9.47");

        Map<String, Object> corpo = service.montarCorpoPreferencia(usuario, assinatura);

        assertEquals(new BigDecimal("9.47"), valorUnitario(corpo));
        assertEquals("BRL", item(corpo).get("currency_id"));
        assertFalse(metadata(corpo).containsKey("cupom_valor_original"));
        assertFalse(metadata(corpo).containsKey("cupom_valor_desconto"));
    }

    @Test
    void enviaSmart10ComoNumeroMonetarioDeVinteEQuatroEVinteEDois() {
        prepararPlano(CicloAssinatura.TRIMESTRAL, "24.22");

        Map<String, Object> corpo = service.montarCorpoPreferencia(usuario, assinatura);

        assertEquals(new BigDecimal("24.22"), valorUnitario(corpo));
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
}
