package br.com.minhalista.assinatura;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class CicloAssinaturaPlanosTest {

    @Test
    void mantemPrecosOficiaisSomenteNoBackend() {
        assertEquals(new BigDecimal("9.97"), CicloAssinatura.MENSAL.getValor());
        assertEquals(new BigDecimal("26.91"), CicloAssinatura.TRIMESTRAL.getValor());
        assertEquals(new BigDecimal("95.64"), CicloAssinatura.ANUAL.getValor());
    }

    @Test
    void resolveSomentePlanIdsConhecidos() {
        assertEquals(
            CicloAssinatura.MENSAL,
            CicloAssinatura.porPlanId("premium_monthly")
        );
        assertEquals(
            CicloAssinatura.TRIMESTRAL,
            CicloAssinatura.porPlanId("premium_quarterly")
        );
        assertEquals(
            CicloAssinatura.ANUAL,
            CicloAssinatura.porPlanId("premium_yearly")
        );
        assertNull(CicloAssinatura.porPlanId("premium_fake"));
    }
}
