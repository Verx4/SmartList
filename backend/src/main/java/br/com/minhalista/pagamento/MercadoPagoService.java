package br.com.minhalista.pagamento;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.usuario.Usuario;

@Service
public class MercadoPagoService {

    private static final Logger LOG = LoggerFactory.getLogger(MercadoPagoService.class);
    private static final String API_BASE_URL = "https://api.mercadopago.com";

    private final RestClient restClient;
    private final String accessToken;
    private final String webhookUrl;
    private final String webhookSecret;
    private final String frontendUrl;
    private final boolean modoTeste;
    private final long pixExpiracaoMinutos;

    public MercadoPagoService(
        @Value("${app.mercado-pago.access-token:}") String accessToken,
        @Value("${app.mercado-pago.webhook-url:}") String webhookUrl,
        @Value("${app.mercado-pago.webhook-secret:}") String webhookSecret,
        @Value("${app.mercado-pago.pix-expiracao-minutos:30}") long pixExpiracaoMinutos,
        @Value("${app.frontend-url}") String frontendUrl
    ) {
        SimpleClientHttpRequestFactory requestFactory =
            new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
            .baseUrl(API_BASE_URL)
            .requestFactory(requestFactory)
            .build();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.webhookUrl = webhookUrl == null ? "" : webhookUrl.trim();
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
        this.frontendUrl = normalizarFrontendUrl(frontendUrl);
        this.modoTeste = this.accessToken.startsWith("TEST-");
        this.pixExpiracaoMinutos = Math.max(10, Math.min(1440, pixExpiracaoMinutos));
    }

    @SuppressWarnings("unchecked")
    public CheckoutResponse criarPreferencia(Usuario usuario, Assinatura assinatura) {
        exigirConfiguracao();

        String assinaturaId = assinatura.getId().toString();
        String retornoBase = frontendUrl + "/assinatura.html";

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("items", List.of(Map.of(
            "id", "premium-" + assinatura.getCiclo().name().toLowerCase(),
            "title", "Smart List Premium " + assinatura.getCiclo().getNome(),
            "description", "Acesso aos recursos Premium do Smart List",
            "quantity", 1,
            "currency_id", "BRL",
            "unit_price", assinatura.getValor()
        )));
        corpo.put("payer", Map.of("email", usuario.getEmail()));
        corpo.put("external_reference", assinaturaId);
        corpo.put("metadata", Map.of(
            "assinatura_id", assinaturaId,
            "usuario_id", usuario.getId().toString(),
            "ciclo", assinatura.getCiclo().name()
        ));
        corpo.put("back_urls", Map.of(
            "success", retornoBase + "?pagamento=sucesso",
            "pending", retornoBase + "?pagamento=pendente",
            "failure", retornoBase + "?pagamento=falha"
        ));
        corpo.put("auto_return", "approved");
        corpo.put("notification_url", montarWebhookUrl());

        try {
            Map<String, Object> resposta = restClient.post()
                .uri("/checkout/preferences")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header("X-Idempotency-Key", assinaturaId)
                .body(corpo)
                .retrieve()
                .body(Map.class);

            String preferenciaId = texto(resposta == null ? null : resposta.get("id"));
            String initPoint = texto(resposta == null ? null : resposta.get("init_point"));
            String sandboxInitPoint =
                texto(resposta == null ? null : resposta.get("sandbox_init_point"));
            String checkoutUrl = modoTeste && StringUtils.hasText(sandboxInitPoint)
                ? sandboxInitPoint
                : initPoint;

            if (!StringUtils.hasText(preferenciaId)
                || !urlCheckoutValida(checkoutUrl)) {
                throw new RegraNegocioException(
                    HttpStatus.BAD_GATEWAY,
                    "O Mercado Pago não retornou um checkout válido."
                );
            }

            return new CheckoutResponse(
                preferenciaId,
                checkoutUrl,
                checkoutUrl,
                checkoutUrl
            );
        } catch (RestClientResponseException erro) {
            LOG.warn(
                "Mercado Pago recusou a criação da preferência com HTTP {}.",
                erro.getStatusCode().value()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "O Mercado Pago recusou a criação do pagamento. Tente novamente."
            );
        } catch (RestClientException erro) {
            LOG.warn("Falha de comunicação ao criar preferência no Mercado Pago.");
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível conectar ao Mercado Pago. Tente novamente em instantes."
            );
        }
    }

    @SuppressWarnings("unchecked")
    public MercadoPagoPixCriado criarPagamentoPix(
        Usuario usuario,
        Pagamento pagamento
    ) {
        exigirConfiguracao();

        Instant expiraEm = Instant.now().plus(Duration.ofMinutes(pixExpiracaoMinutos));
        String assinaturaId = pagamento.getAssinatura().getId().toString();

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("transaction_amount", pagamento.getAmount());
        corpo.put(
            "description",
            "Smart List Premium " + pagamento.getAssinatura().getCiclo().getNome()
        );
        corpo.put("payment_method_id", "pix");
        corpo.put("payer", Map.of("email", usuario.getEmail()));
        corpo.put("external_reference", pagamento.getExternalReference());
        corpo.put("notification_url", montarWebhookUrl());
        corpo.put(
            "date_of_expiration",
            OffsetDateTime.ofInstant(expiraEm, ZoneOffset.UTC).toString()
        );
        corpo.put("metadata", Map.of(
            "assinatura_id", assinaturaId,
            "usuario_id", usuario.getId().toString(),
            "ciclo", pagamento.getAssinatura().getCiclo().name(),
            "plan_id", pagamento.getPlanId(),
            "payment_public_id", pagamento.getPublicId().toString()
        ));

        try {
            Map<String, Object> resposta = restClient.post()
                .uri("/v1/payments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header("X-Idempotency-Key", pagamento.getIdempotencyKey().toString())
                .body(corpo)
                .retrieve()
                .body(Map.class);

            if (resposta == null) {
                throw respostaPixInvalida();
            }

            Map<String, Object> pontoInteracao = mapa(resposta.get("point_of_interaction"));
            Map<String, Object> dadosTransacao = mapa(pontoInteracao.get("transaction_data"));
            String paymentId = texto(resposta.get("id"));
            String qrCode = texto(dadosTransacao.get("qr_code"));
            String qrCodeBase64 = texto(dadosTransacao.get("qr_code_base64"));

            if (!StringUtils.hasText(paymentId)
                || !StringUtils.hasText(qrCode)
                || !StringUtils.hasText(qrCodeBase64)) {
                throw respostaPixInvalida();
            }

            return new MercadoPagoPixCriado(
                paymentId,
                texto(resposta.get("status")),
                qrCode,
                qrCodeBase64,
                texto(dadosTransacao.get("ticket_url")),
                primeiroInstante(resposta.get("date_of_expiration"), expiraEm)
            );
        } catch (RestClientResponseException erro) {
            LOG.warn(
                "Mercado Pago recusou a criação do PIX com HTTP {}.",
                erro.getStatusCode().value()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível gerar o PIX neste momento. Tente novamente."
            );
        } catch (RestClientException erro) {
            LOG.warn("Falha de comunicação ao criar PIX no Mercado Pago.");
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível gerar o PIX neste momento. Tente novamente."
            );
        }
    }

    @SuppressWarnings("unchecked")
    public PagamentoConsultado consultarPagamento(String pagamentoId) {
        exigirConfiguracao();

        try {
            Map<String, Object> resposta = restClient.get()
                .uri("/v1/payments/{id}", pagamentoId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .body(Map.class);

            if (resposta == null) {
                throw new RegraNegocioException(
                    HttpStatus.BAD_GATEWAY,
                    "Pagamento não encontrado no Mercado Pago."
                );
            }

            Map<String, Object> metadata = mapa(resposta.get("metadata"));

            return new PagamentoConsultado(
                texto(resposta.get("id")),
                texto(resposta.get("status")),
                texto(resposta.get("external_reference")),
                texto(metadata.get("assinatura_id")),
                texto(metadata.get("ciclo")),
                texto(metadata.get("usuario_id")),
                texto(metadata.get("plan_id")),
                texto(metadata.get("payment_public_id")),
                decimal(resposta.get("transaction_amount")),
                texto(resposta.get("currency_id")),
                texto(resposta.get("payment_method_id")),
                Boolean.TRUE.equals(resposta.get("live_mode")),
                instante(resposta.get("date_approved")),
                instante(resposta.get("date_of_expiration"))
            );
        } catch (RestClientResponseException erro) {
            LOG.warn(
                "Não foi possível consultar pagamento no Mercado Pago: HTTP {}.",
                erro.getStatusCode().value()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível confirmar o pagamento no Mercado Pago."
            );
        } catch (RestClientException erro) {
            LOG.warn("Falha de comunicação ao consultar pagamento no Mercado Pago.");
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível conectar ao Mercado Pago para confirmar o pagamento."
            );
        }
    }

    public boolean ambienteCompativel(PagamentoConsultado pagamento) {
        return pagamento.ambienteProducao() != modoTeste;
    }

    public void exigirConfiguracao() {
        if (!StringUtils.hasText(accessToken)
            || !StringUtils.hasText(webhookSecret)
            || !webhookUrlValida(webhookUrl)) {
            LOG.warn("Configuração privada do Mercado Pago incompleta no backend.");
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O pagamento está temporariamente indisponível. Tente novamente mais tarde."
            );
        }
    }

    private String montarWebhookUrl() {
        String separador = webhookUrl.contains("?") ? "&" : "?";
        return webhookUrl + separador + "source_news=webhooks";
    }

    private boolean webhookUrlValida(String valor) {
        try {
            URI uri = URI.create(valor);
            return "https".equalsIgnoreCase(uri.getScheme())
                && StringUtils.hasText(uri.getHost())
                && uri.getUserInfo() == null;
        } catch (IllegalArgumentException erro) {
            return false;
        }
    }

    private boolean urlCheckoutValida(String valor) {
        try {
            URI uri = URI.create(valor);
            String host = uri.getHost();

            return "https".equalsIgnoreCase(uri.getScheme())
                && host != null
                && (
                    host.equals("mercadopago.com.br")
                    || host.endsWith(".mercadopago.com.br")
                    || host.equals("mercadopago.com")
                    || host.endsWith(".mercadopago.com")
                );
        } catch (IllegalArgumentException erro) {
            return false;
        }
    }

    private String normalizarFrontendUrl(String valor) {
        String url = valor == null ? "" : valor.trim().replaceAll("/+$", "");

        try {
            URI uri = URI.create(url);

            if (!List.of("http", "https").contains(uri.getScheme())
                || !StringUtils.hasText(uri.getHost())
                || uri.getUserInfo() != null) {
                throw new IllegalArgumentException();
            }

            return url;
        } catch (IllegalArgumentException erro) {
            throw new IllegalStateException("app.frontend-url precisa ser uma URL HTTP(S) válida.");
        }
    }

    private String texto(Object valor) {
        return valor == null ? null : String.valueOf(valor);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> mapa(Object valor) {
        return valor instanceof Map<?, ?> mapa
            ? (Map<String, Object>) mapa
            : Map.of();
    }

    private BigDecimal decimal(Object valor) {
        if (valor == null) {
            return null;
        }

        try {
            return new BigDecimal(String.valueOf(valor));
        } catch (NumberFormatException erro) {
            return null;
        }
    }

    private Instant primeiroInstante(Object valor, Instant padrao) {
        Instant convertido = instante(valor);
        return convertido == null ? padrao : convertido;
    }

    private Instant instante(Object valor) {
        if (valor == null) {
            return null;
        }

        String texto = String.valueOf(valor).trim();

        if (texto.isEmpty()) {
            return null;
        }

        try {
            return OffsetDateTime.parse(texto).toInstant();
        } catch (DateTimeParseException ignorado) {
            try {
                return Instant.parse(texto);
            } catch (DateTimeParseException invalido) {
                return null;
            }
        }
    }

    private RegraNegocioException respostaPixInvalida() {
        return new RegraNegocioException(
            HttpStatus.BAD_GATEWAY,
            "O Mercado Pago não retornou um PIX válido. Tente novamente."
        );
    }
}
