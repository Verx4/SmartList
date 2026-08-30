package br.com.minhalista.pagamento;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/pagamentos/webhook/kiwify")
public class KiwifyWebhookController {

    private static final Logger LOG =
        LoggerFactory.getLogger(KiwifyWebhookController.class);

    @PostMapping
    public ResponseEntity<Map<String, String>> receber(
        @RequestBody(required = false) JsonNode payload
    ) {
        String evento = primeiroTexto(
            payload,
            "webhook_event_type",
            "event",
            "event_type",
            "type"
        );

        LOG.info(
            "Webhook Kiwify recebido: evento={}, estrutura={}.",
            evento == null ? "NAO_INFORMADO" : evento,
            payload == null ? "VAZIO" : payload.fieldNames()
        );

        return ResponseEntity.ok(Map.of(
            "status", "received",
            "provider", "kiwify"
        ));
    }

    private String primeiroTexto(JsonNode payload, String... campos) {
        if (payload == null) {
            return null;
        }

        for (String campo : campos) {
            JsonNode valor = payload.path(campo);
            if (valor.isTextual() && !valor.asText().isBlank()) {
                return valor.asText();
            }
        }

        return null;
    }
}
