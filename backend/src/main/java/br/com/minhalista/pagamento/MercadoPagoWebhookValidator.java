package br.com.minhalista.pagamento;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import br.com.minhalista.common.RegraNegocioException;

@Component
public class MercadoPagoWebhookValidator {

    private final String secret;
    private final Duration tolerancia;
    private final Clock clock;

    @Autowired
    public MercadoPagoWebhookValidator(
        @Value("${app.mercado-pago.webhook-secret:}") String secret,
        @Value("${app.mercado-pago.webhook-tolerancia-minutos:5}") long toleranciaMinutos
    ) {
        this(
            secret,
            Duration.ofMinutes(Math.max(1, toleranciaMinutos)),
            Clock.systemUTC()
        );
    }

    MercadoPagoWebhookValidator(
        String secret,
        Duration tolerancia,
        Clock clock
    ) {
        this.secret = secret == null ? "" : secret.trim();
        this.tolerancia = tolerancia;
        this.clock = clock;
    }

    public boolean validar(
        String xSignature,
        String xRequestId,
        String dataId
    ) {
        exigirConfiguracao();

        String assinatura = normalizar(xSignature);
        String requestId = normalizar(xRequestId);
        String id = normalizar(dataId);

        if (assinatura == null || id == null) {
            return false;
        }

        Map<String, String> partes = separarCabecalho(assinatura);
        String timestampTexto = partes.get("ts");
        String hashRecebido = partes.get("v1");

        if (timestampTexto == null
            || hashRecebido == null
            || !hashRecebido.matches("(?i)[0-9a-f]{64}")) {
            return false;
        }

        long timestamp;

        try {
            timestamp = Long.parseLong(timestampTexto);
        } catch (NumberFormatException erro) {
            return false;
        }

        Instant instante;

        try {
            instante = timestamp < 100_000_000_000L
                ? Instant.ofEpochSecond(timestamp)
                : Instant.ofEpochMilli(timestamp);
        } catch (RuntimeException erro) {
            return false;
        }

        if (Duration.between(instante, clock.instant()).abs().compareTo(tolerancia) > 0) {
            return false;
        }

        StringBuilder manifesto = new StringBuilder("id:")
            .append(id)
            .append(';');

        if (requestId != null) {
            manifesto.append("request-id:")
                .append(requestId)
                .append(';');
        }

        manifesto.append("ts:")
            .append(timestampTexto)
            .append(';');

        String hashEsperado = calcularHmac(manifesto.toString());

        return MessageDigest.isEqual(
            hashEsperado.getBytes(StandardCharsets.US_ASCII),
            hashRecebido.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII)
        );
    }

    public void exigirConfiguracao() {
        if (!StringUtils.hasText(secret)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "A assinatura secreta do webhook do Mercado Pago não foi configurada."
            );
        }
    }

    private Map<String, String> separarCabecalho(String cabecalho) {
        Map<String, String> partes = new HashMap<>();

        for (String parte : cabecalho.split(",")) {
            int separador = parte.indexOf('=');

            if (separador <= 0 || separador == parte.length() - 1) {
                continue;
            }

            String chave = parte.substring(0, separador)
                .trim()
                .toLowerCase(Locale.ROOT);
            String valor = parte.substring(separador + 1).trim();

            if (StringUtils.hasText(chave) && StringUtils.hasText(valor)) {
                partes.put(chave, valor);
            }
        }

        return partes;
    }

    private String calcularHmac(String manifesto) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
            ));
            return HexFormat.of().formatHex(
                hmac.doFinal(manifesto.getBytes(StandardCharsets.UTF_8))
            );
        } catch (GeneralSecurityException erro) {
            throw new IllegalStateException("HMAC-SHA256 indisponível.", erro);
        }
    }

    private String normalizar(String valor) {
        if (valor == null) {
            return null;
        }

        String limpo = valor.trim();
        return limpo.isEmpty() ? null : limpo;
    }
}
