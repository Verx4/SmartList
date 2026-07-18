package br.com.minhalista.pagamento;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.minhalista.assinatura.AssinaturaService;

@RestController
@RequestMapping("/api/pagamentos/webhook/mercado-pago")
public class WebhookMercadoPagoController {

    private static final Logger LOG =
        LoggerFactory.getLogger(WebhookMercadoPagoController.class);

    private final MercadoPagoService mercadoPagoService;
    private final MercadoPagoWebhookValidator webhookValidator;
    private final AssinaturaService assinaturaService;

    public WebhookMercadoPagoController(
        MercadoPagoService mercadoPagoService,
        MercadoPagoWebhookValidator webhookValidator,
        AssinaturaService assinaturaService
    ) {
        this.mercadoPagoService = mercadoPagoService;
        this.webhookValidator = webhookValidator;
        this.assinaturaService = assinaturaService;
    }

    @PostMapping
    public ResponseEntity<Void> receber(
        @RequestParam(name = "data.id", required = false) String dataId,
        @RequestParam(name = "type", required = false) String tipoQuery,
        @RequestHeader(name = "x-signature", required = false) String xSignature,
        @RequestHeader(name = "x-request-id", required = false) String xRequestId,
        @RequestBody(required = false) Map<String, Object> corpo
    ) {
        if (!webhookValidator.validar(xSignature, xRequestId, dataId)) {
            LOG.warn("Webhook Mercado Pago rejeitado por assinatura inválida.");
            return ResponseEntity.status(401).build();
        }

        String tipo = primeiroNaoVazio(tipoQuery, texto(corpo, "type"));

        if (!"payment".equalsIgnoreCase(tipo)) {
            return ResponseEntity.ok().build();
        }

        if (!StringUtils.hasText(dataId) || !dataId.matches("[0-9]{1,30}")) {
            return ResponseEntity.badRequest().build();
        }

        String dataIdCorpo = extrairDataId(corpo);

        if (StringUtils.hasText(dataIdCorpo) && !dataId.equals(dataIdCorpo)) {
            return ResponseEntity.badRequest().build();
        }

        PagamentoConsultado pagamento =
            mercadoPagoService.consultarPagamento(dataId);

        if (!mercadoPagoService.ambienteCompativel(pagamento)) {
            LOG.warn(
                "Pagamento Mercado Pago {} ignorado por pertencer a outro ambiente.",
                pagamento.id()
            );
            return ResponseEntity.ok().build();
        }

        assinaturaService.processarPagamento(pagamento);
        return ResponseEntity.ok().build();
    }

    private String extrairDataId(Map<String, Object> corpo) {
        if (corpo == null) {
            return null;
        }

        Object data = corpo.get("data");

        if (data instanceof Map<?, ?> mapa && mapa.get("id") != null) {
            return String.valueOf(mapa.get("id"));
        }

        return null;
    }

    private String texto(Map<String, Object> corpo, String chave) {
        if (corpo == null || corpo.get(chave) == null) {
            return null;
        }

        return String.valueOf(corpo.get(chave));
    }

    private String primeiroNaoVazio(String... valores) {
        for (String valor : valores) {
            if (StringUtils.hasText(valor)) {
                return valor;
            }
        }

        return null;
    }
}
