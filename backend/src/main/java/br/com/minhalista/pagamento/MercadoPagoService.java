package br.com.minhalista.pagamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.Duration;
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

    public MercadoPagoService(
        @Value("${app.mercado-pago.access-token:}") String accessToken,
        @Value("${app.mercado-pago.webhook-url:}") String webhookUrl,
        @Value("${app.mercado-pago.webhook-secret:}") String webhookSecret,
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
    }

    @SuppressWarnings("unchecked")
    public CheckoutResponse criarPreferencia(Usuario usuario, Assinatura assinatura) {
        exigirConfiguracao();

        String assinaturaId = assinatura.getId().toString();

        LOG.info(
            "Criando preferência Mercado Pago: checkout={}, usuario={}, ciclo={}, cupom={}, valorOriginal={}, desconto={}, total={}.",
            assinaturaId,
            usuario.getId(),
            assinatura.getCiclo(),
            StringUtils.hasText(assinatura.getCupomCodigo())
                ? assinatura.getCupomCodigo()
                : "SEM_CUPOM",
            assinatura.getCupomValorOriginal() == null
                ? assinatura.getValor()
                : assinatura.getCupomValorOriginal(),
            assinatura.getCupomValorDesconto() == null
                ? BigDecimal.ZERO.setScale(2)
                : assinatura.getCupomValorDesconto(),
            assinatura.getValor()
        );

        try {
            Map<String, Object> corpo = montarCorpoPreferencia(usuario, assinatura);

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
        } catch (RegraNegocioException erro) {
            throw erro;
        } catch (RestClientResponseException erro) {
            LOG.warn(
                "Mercado Pago recusou a preferência do checkout {}: HTTP {}, resposta={}.",
                assinaturaId,
                erro.getStatusCode().value(),
                respostaSegura(erro.getResponseBodyAsString())
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "O Mercado Pago recusou a criação do pagamento. Tente novamente em instantes."
            );
        } catch (RestClientException erro) {
            LOG.warn(
                "Falha de comunicação ao criar a preferência do checkout {} no Mercado Pago: {}.",
                assinaturaId,
                erro.getClass().getSimpleName()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível conectar ao Mercado Pago. Tente novamente em instantes."
            );
        } catch (RuntimeException erro) {
            LOG.error(
                "Falha interna ao preparar a preferência Mercado Pago do checkout {}.",
                assinaturaId,
                erro
            );
            throw new RegraNegocioException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível preparar o pagamento. Tente novamente."
            );
        }
    }

    Map<String, Object> montarCorpoPreferencia(
        Usuario usuario,
        Assinatura assinatura
    ) {
        if (usuario == null || usuario.getId() == null
            || !StringUtils.hasText(usuario.getEmail())) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "A conta precisa ter um e-mail válido para iniciar o pagamento."
            );
        }

        if (assinatura == null || assinatura.getId() == null
            || assinatura.getCiclo() == null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Não foi possível identificar o plano escolhido."
            );
        }

        BigDecimal valorCobranca = normalizarValorCobranca(assinatura.getValor());
        String assinaturaId = assinatura.getId().toString();
        String retornoBase = frontendUrl + "/assinatura.html";
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("assinatura_id", assinaturaId);
        metadata.put("usuario_id", usuario.getId().toString());
        metadata.put("ciclo", assinatura.getCiclo().name());

        // A auditoria do cupom permanece no banco do Smart List. Para o Mercado
        // Pago seguem apenas os identificadores necessários à confirmação; assim
        // o request com cupom difere do normal somente pelo unit_price oficial.
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", "premium-" + assinatura.getCiclo().name().toLowerCase());
        item.put("title", "Smart List Premium " + assinatura.getCiclo().getNome());
        item.put("description", "Acesso aos recursos Premium do Smart List");
        item.put("quantity", 1);
        item.put("currency_id", "BRL");
        item.put("unit_price", valorCobranca);

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("items", List.of(item));
        corpo.put("payer", Map.of("email", usuario.getEmail()));
        corpo.put("external_reference", assinaturaId);
        corpo.put("metadata", metadata);
        corpo.put("back_urls", Map.of(
            "success", retornoBase + "?pagamento=sucesso",
            "pending", retornoBase + "?pagamento=pendente",
            "failure", retornoBase + "?pagamento=falha"
        ));
        corpo.put("auto_return", "approved");
        corpo.put("notification_url", montarWebhookUrl());
        return corpo;
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

            Map<String, Object> metadata = resposta.get("metadata") instanceof Map<?, ?> mapa
                ? (Map<String, Object>) mapa
                : Map.of();

            return new PagamentoConsultado(
                texto(resposta.get("id")),
                texto(resposta.get("status")),
                texto(resposta.get("external_reference")),
                texto(metadata.get("assinatura_id")),
                texto(metadata.get("ciclo")),
                decimal(resposta.get("transaction_amount")),
                texto(resposta.get("currency_id")),
                Boolean.TRUE.equals(resposta.get("live_mode"))
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
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Mercado Pago ainda não foi configurado com token, webhook HTTPS e assinatura secreta."
            );
        }
    }

    private String montarWebhookUrl() {
        String separador = webhookUrl.contains("?") ? "&" : "?";
        return webhookUrl + separador + "source_news=webhooks";
    }

    private BigDecimal normalizarValorCobranca(BigDecimal valor) {
        if (valor == null || valor.signum() <= 0) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "O valor do plano é inválido."
            );
        }

        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private String respostaSegura(String corpo) {
        if (!StringUtils.hasText(corpo)) {
            return "sem corpo";
        }

        String normalizado = corpo
            .replaceAll("[\\r\\n\\t]+", " ")
            .replaceAll("(?i)bearer\\s+[a-z0-9._-]+", "Bearer [oculto]");
        return normalizado.length() <= 1200
            ? normalizado
            : normalizado.substring(0, 1200) + "...";
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
}
