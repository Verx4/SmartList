package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import br.com.minhalista.common.RegraNegocioException;

class MercadoPagoServiceConfiguracaoTest {

    @Test
    void accessTokenAusenteMantemPagamentoIndisponivelSemExporCredencial() {
        MercadoPagoService service = new MercadoPagoService(
            "",
            "https://api.example.com/api/pagamentos/webhook/mercado-pago",
            "segredo-webhook",
            30,
            "https://app.example.com"
        );

        assertThrows(RegraNegocioException.class, service::exigirConfiguracao);
    }

    @Test
    void ambienteDeTesteAceitaSomentePagamentoDeTeste() {
        MercadoPagoService service = new MercadoPagoService(
            "TEST-token-ficticio",
            "https://api.example.com/api/pagamentos/webhook/mercado-pago",
            "segredo-webhook",
            30,
            "https://app.example.com"
        );

        assertTrue(service.ambienteCompativel(pagamento(false)));
        assertFalse(service.ambienteCompativel(pagamento(true)));
    }

    private PagamentoConsultado pagamento(boolean liveMode) {
        return new PagamentoConsultado(
            "123",
            "pending",
            null,
            null,
            null,
            null,
            null,
            liveMode
        );
    }
}
