package br.com.minhalista.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ApiExceptionHandlerTest {

    @Test
    void producaoRetornaMensagemEIdentificadorSemDetalhesInternos() {
        ApiExceptionHandler handler = new ApiExceptionHandler(false);
        RegraNegocioException erro = new RegraNegocioException(
            HttpStatus.BAD_GATEWAY,
            "O Mercado Pago recusou a criação do pagamento.",
            Map.of("response", "erro interno"),
            "MP-TESTE"
        );

        ResponseEntity<Map<String, Object>> resposta = handler.tratarRegra(erro);
        Map<String, Object> corpo = resposta.getBody();

        assertNotNull(corpo);
        assertEquals(true, corpo.get("error"));
        assertEquals(erro.getMessage(), corpo.get("message"));
        assertEquals("MP-TESTE", corpo.get("diagnosticId"));
        assertFalse(corpo.containsKey("details"));
    }

    @Test
    void desenvolvimentoRetornaDetalhesTecnicosDaFalha() {
        ApiExceptionHandler handler = new ApiExceptionHandler(true);
        RegraNegocioException erro = new RegraNegocioException(
            HttpStatus.BAD_GATEWAY,
            "Falha no gateway.",
            Map.of("httpStatus", 400, "response", "invalid payer"),
            "MP-DEBUG"
        );

        Map<String, Object> corpo = handler.tratarRegra(erro).getBody();

        assertNotNull(corpo);
        assertTrue(corpo.containsKey("details"));
        assertEquals(corpo.get("details"), corpo.get("detalhes"));
    }
}
