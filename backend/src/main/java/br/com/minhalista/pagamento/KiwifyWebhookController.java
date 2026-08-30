package br.com.minhalista.pagamento;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.assinatura.AssinaturaService;

@RestController
@RequestMapping("/api/pagamentos/webhook/kiwify")
public class KiwifyWebhookController {

    private static final Logger LOG =
        LoggerFactory.getLogger(KiwifyWebhookController.class);

    private final KiwifyApiService kiwifyApiService;
    private final AssinaturaService assinaturaService;

    public KiwifyWebhookController(
        KiwifyApiService kiwifyApiService,
        AssinaturaService assinaturaService
    ) {
        this.kiwifyApiService = kiwifyApiService;
        this.assinaturaService = assinaturaService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> receber(
        @RequestBody(required = false) Map<String, Object> payload
    ) {
        String evento = primeiroTexto(
            payload,
            "webhook_event_type",
            "event",
            "event_type",
            "type"
        );
        String pedidoId = primeiroTexto(
            payload,
            "order_id",
            "order_ref"
        );

        LOG.info(
            "Webhook Kiwify recebido: evento={}, pedido={}.",
            evento == null ? "NAO_INFORMADO" : evento,
            pedidoId == null ? "NAO_INFORMADO" : pedidoId
        );

        if (pedidoId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", "invalid",
                "provider", "kiwify"
            ));
        }

        Map<String, Object> venda = kiwifyApiService.consultarVenda(pedidoId);
        assinaturaService.processarVendaKiwify(venda, evento);

        return ResponseEntity.ok(Map.of(
            "status", "processed",
            "provider", "kiwify"
        ));
    }

    private String primeiroTexto(
        Map<String, Object> payload,
        String... campos
    ) {
        if (payload == null) {
            return null;
        }

        for (String campo : campos) {
            Object valor = payload.get(campo);
            if (valor != null && !valor.toString().isBlank()) {
                return valor.toString();
            }
        }

        return null;
    }
}
