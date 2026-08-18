package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Test;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;

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

    @Test
    @SuppressWarnings("unchecked")
    void pagadorPixIncluiNomeEmailETipoENumeroDoDocumento() {
        MercadoPagoService service = new MercadoPagoService(
            "TEST-token-ficticio",
            "https://api.example.com/api/pagamentos/webhook/mercado-pago",
            "segredo-webhook",
            30,
            "https://app.example.com"
        );
        Usuario usuario = new Usuario();
        usuario.setNome("Maria da Silva");
        usuario.setEmail("maria@example.com");

        Map<String, Object> pagador = service.montarPagadorPix(
            usuario,
            "529.982.247-25"
        );
        Map<String, Object> identificacao = (Map<String, Object>) pagador.get(
            "identification"
        );

        assertEquals("Maria", pagador.get("first_name"));
        assertEquals("da Silva", pagador.get("last_name"));
        assertEquals("maria@example.com", pagador.get("email"));
        assertEquals("CPF", identificacao.get("type"));
        assertEquals("52998224725", identificacao.get("number"));
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

