package br.com.minhalista.pagamento;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;

import br.com.minhalista.common.RegraNegocioException;

class MercadoPagoWebhookValidatorTest {

    private static final String SECRET = "segredo-de-teste-do-webhook";
    private static final Instant AGORA = Instant.parse("2026-07-17T20:00:00Z");
    private static final String DATA_ID = "123456789";
    private static final String REQUEST_ID = "req-123";

    @Test
    void aceitaAssinaturaValidaDentroDaJanela() {
        MercadoPagoWebhookValidator validator = validator();
        String timestamp = String.valueOf(AGORA.toEpochMilli());
        String assinatura = cabecalhoAssinado(DATA_ID, REQUEST_ID, timestamp);

        assertTrue(validator.validar(assinatura, REQUEST_ID, DATA_ID));
    }

    @Test
    void rejeitaQuandoDataIdFoiAlterado() {
        MercadoPagoWebhookValidator validator = validator();
        String timestamp = String.valueOf(AGORA.toEpochMilli());
        String assinatura = cabecalhoAssinado(DATA_ID, REQUEST_ID, timestamp);

        assertFalse(validator.validar(assinatura, REQUEST_ID, "999999999"));
    }

    @Test
    void rejeitaAssinaturaForaDaJanelaDeReplay() {
        MercadoPagoWebhookValidator validator = validator();
        String timestamp = String.valueOf(
            AGORA.minus(Duration.ofMinutes(6)).toEpochMilli()
        );
        String assinatura = cabecalhoAssinado(DATA_ID, REQUEST_ID, timestamp);

        assertFalse(validator.validar(assinatura, REQUEST_ID, DATA_ID));
    }

    @Test
    void exigeSegredoConfigurado() {
        MercadoPagoWebhookValidator validator = new MercadoPagoWebhookValidator(
            "",
            Duration.ofMinutes(5),
            Clock.fixed(AGORA, ZoneOffset.UTC)
        );

        assertThrows(
            RegraNegocioException.class,
            () -> validator.validar("ts=1,v1=" + "0".repeat(64), REQUEST_ID, DATA_ID)
        );
    }

    private MercadoPagoWebhookValidator validator() {
        return new MercadoPagoWebhookValidator(
            SECRET,
            Duration.ofMinutes(5),
            Clock.fixed(AGORA, ZoneOffset.UTC)
        );
    }

    private String cabecalhoAssinado(
        String dataId,
        String requestId,
        String timestamp
    ) {
        String manifesto = "id:" + dataId
            + ";request-id:" + requestId
            + ";ts:" + timestamp
            + ";";

        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(
                SECRET.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
            ));
            String hash = HexFormat.of().formatHex(
                hmac.doFinal(manifesto.getBytes(StandardCharsets.UTF_8))
            );
            return "ts=" + timestamp + ",v1=" + hash;
        } catch (Exception erro) {
            throw new IllegalStateException(erro);
        }
    }
}