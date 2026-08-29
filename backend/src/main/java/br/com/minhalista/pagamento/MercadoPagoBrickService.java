package br.com.minhalista.pagamento;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
import br.com.minhalista.usuario.Cpf;
import br.com.minhalista.usuario.Usuario;

@Service
public class MercadoPagoBrickService {

    private static final Logger LOG = LoggerFactory.getLogger(MercadoPagoBrickService.class);
    private static final String API_BASE_URL = "https://api.mercadopago.com";

    private final RestClient restClient;
    private final String accessToken;
    private final String publicKey;
    private final String webhookUrl;
    private final String environment;

    public MercadoPagoBrickService(
        @Value("${app.mercado-pago.access-token:}") String accessToken,
        @Value("${app.mercado-pago.public-key:}") String publicKey,
        @Value("${app.mercado-pago.webhook-url:}") String webhookUrl,
        @Value("${app.mercado-pago.environment:production}") String environment
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(20));

        this.restClient = RestClient.builder()
            .baseUrl(API_BASE_URL)
            .requestFactory(requestFactory)
            .build();
        this.accessToken = textoLimpo(accessToken);
        this.publicKey = textoLimpo(publicKey);
        this.webhookUrl = textoLimpo(webhookUrl);
        this.environment = normalizarAmbiente(environment);
    }

    public BrickConfigResponse configuracaoPublica() {
        if (!StringUtils.hasText(publicKey)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "A Public Key do Mercado Pago ainda não foi configurada no servidor."
            );
        }

        return new BrickConfigResponse(publicKey, environment);
    }

    @SuppressWarnings("unchecked")
    public PagamentoBrickResultado criarPagamento(
        Usuario usuario,
        Assinatura assinatura,
        String selectedPaymentMethod,
        Map<String, Object> formData
    ) {
        exigirConfiguracaoPrivada();
        validarComprador(usuario);
        validarCheckout(assinatura, formData);

        BigDecimal valor = assinatura.getValor().setScale(2, RoundingMode.HALF_UP);
        String paymentMethodId = texto(formData.get("payment_method_id"));

        if (!StringUtils.hasText(paymentMethodId)) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "O Mercado Pago não informou o meio de pagamento selecionado."
            );
        }

        boolean pix = "pix".equalsIgnoreCase(paymentMethodId);
        Map<String, Object> corpo = montarCorpoBase(usuario, assinatura, valor, paymentMethodId);

        if (!pix) {
            prepararPagamentoCartao(corpo, formData);
        }

        LOG.info(
            "Criando pagamento Checkout Bricks: checkout={}, usuario={}, meio={}, selecao={}, valor={}.",
            assinatura.getId(),
            usuario.getId(),
            paymentMethodId,
            textoSeguro(selectedPaymentMethod),
            valor
        );

        try {
            Map<String, Object> resposta = restClient.post()
                .uri("/v1/payments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header("X-Idempotency-Key", assinatura.getId().toString())
                .body(corpo)
                .retrieve()
                .body(Map.class);

            if (resposta == null) {
                throw new RegraNegocioException(
                    HttpStatus.BAD_GATEWAY,
                    "O Mercado Pago não retornou os dados do pagamento."
                );
            }

            String pagamentoId = texto(resposta.get("id"));
            String status = texto(resposta.get("status"));
            String statusDetail = texto(resposta.get("status_detail"));
            String metodoRetornado = texto(resposta.get("payment_method_id"));
            Map<String, Object> metadata = resposta.get("metadata") instanceof Map<?, ?> mapa
                ? (Map<String, Object>) mapa
                : Map.of();

            if (!StringUtils.hasText(pagamentoId) || !StringUtils.hasText(status)) {
                throw new RegraNegocioException(
                    HttpStatus.BAD_GATEWAY,
                    "O Mercado Pago retornou uma resposta de pagamento incompleta."
                );
            }

            PagamentoConsultado pagamento = new PagamentoConsultado(
                pagamentoId,
                status,
                texto(resposta.get("external_reference")),
                texto(metadata.get("assinatura_id")),
                texto(metadata.get("ciclo")),
                decimal(resposta.get("transaction_amount")),
                texto(resposta.get("currency_id")),
                Boolean.TRUE.equals(resposta.get("live_mode"))
            );

            Map<String, Object> threeDs = resposta.get("three_ds_info") instanceof Map<?, ?> mapa
                ? (Map<String, Object>) mapa
                : Map.of();
            String externalResourceUrl = texto(threeDs.get("external_resource_url"));
            String creq = texto(threeDs.get("creq"));

            LOG.info(
                "Pagamento Checkout Bricks criado: checkout={}, pagamento={}, status={}, detalhe={}, liveMode={}.",
                assinatura.getId(),
                pagamentoId,
                status,
                statusDetail,
                pagamento.ambienteProducao()
            );

            return new PagamentoBrickResultado(
                pagamento,
                statusDetail,
                StringUtils.hasText(metodoRetornado) ? metodoRetornado : paymentMethodId,
                externalResourceUrl,
                creq
            );
        } catch (RegraNegocioException erro) {
            throw erro;
        } catch (RestClientResponseException erro) {
            String resposta = respostaSegura(erro.getResponseBodyAsString());
            LOG.warn(
                "Mercado Pago recusou pagamento Checkout Bricks {}: HTTP {}, resposta={}.",
                assinatura.getId(),
                erro.getStatusCode().value(),
                resposta
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                mensagemGateway(erro.getStatusCode().value(), erro.getResponseBodyAsString()),
                Map.of(
                    "gateway", "Mercado Pago",
                    "httpStatus", erro.getStatusCode().value(),
                    "response", resposta
                )
            );
        } catch (RestClientException erro) {
            LOG.warn(
                "Falha de comunicação com Mercado Pago no Checkout Bricks {}: {}.",
                assinatura.getId(),
                erro.getClass().getSimpleName()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível processar o pagamento no Mercado Pago. Tente novamente em instantes."
            );
        }
    }

    private Map<String, Object> montarCorpoBase(
        Usuario usuario,
        Assinatura assinatura,
        BigDecimal valor,
        String paymentMethodId
    ) {
        String cpf = Cpf.somenteDigitos(usuario.getCpf());
        String[] nomes = separarNome(usuario.getNome());

        Map<String, Object> identificacao = new LinkedHashMap<>();
        identificacao.put("type", "CPF");
        identificacao.put("number", cpf);

        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("email", usuario.getEmail().trim());
        payer.put("identification", identificacao);
        if (StringUtils.hasText(nomes[0])) {
            payer.put("first_name", nomes[0]);
        }
        if (StringUtils.hasText(nomes[1])) {
            payer.put("last_name", nomes[1]);
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("assinatura_id", assinatura.getId().toString());
        metadata.put("usuario_id", usuario.getId().toString());
        metadata.put("ciclo", assinatura.getCiclo().name());
        adicionarSePresente(metadata, "cupom_codigo", assinatura.getCupomCodigo());
        adicionarSePresente(
            metadata,
            "cupom_percentual_desconto",
            assinatura.getCupomPercentualDesconto()
        );
        adicionarSePresente(metadata, "cupom_valor_original", assinatura.getCupomValorOriginal());
        adicionarSePresente(metadata, "cupom_valor_desconto", assinatura.getCupomValorDesconto());

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", "premium-" + assinatura.getCiclo().name().toLowerCase(Locale.ROOT));
        item.put("title", "Smart List Premium " + assinatura.getCiclo().getNome());
        item.put("description", "Acesso aos recursos Premium do Smart List");
        item.put("quantity", 1);
        item.put("unit_price", valor);

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("transaction_amount", valor);
        corpo.put("description", "Smart List Premium " + assinatura.getCiclo().getNome());
        corpo.put("payment_method_id", paymentMethodId);
        corpo.put("payer", payer);
        corpo.put("external_reference", assinatura.getId().toString());
        corpo.put("metadata", metadata);
        corpo.put("notification_url", montarWebhookUrl());
        corpo.put("binary_mode", false);
        corpo.put("capture", true);
        corpo.put("additional_info", Map.of("items", List.of(item)));
        return corpo;
    }

    private void prepararPagamentoCartao(
        Map<String, Object> corpo,
        Map<String, Object> formData
    ) {
        String token = texto(formData.get("token"));
        Integer installments = inteiro(formData.get("installments"));

        if (!StringUtils.hasText(token)) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Não foi possível gerar o token seguro do cartão. Confira os dados e tente novamente."
            );
        }

        if (installments == null || installments < 1 || installments > 24) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "A quantidade de parcelas selecionada é inválida."
            );
        }

        corpo.put("token", token);
        corpo.put("installments", installments);
        corpo.put("three_d_secure_mode", "optional");

        Object issuerId = formData.get("issuer_id");
        if (issuerId != null && StringUtils.hasText(String.valueOf(issuerId))) {
            corpo.put("issuer_id", issuerId);
        }
    }

    private void validarCheckout(Assinatura assinatura, Map<String, Object> formData) {
        if (assinatura == null || assinatura.getId() == null
            || assinatura.getCiclo() == null || assinatura.getValor() == null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Não foi possível identificar o checkout da assinatura."
            );
        }

        if (formData == null || formData.isEmpty()) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "O Mercado Pago não retornou os dados do formulário de pagamento."
            );
        }

        BigDecimal valorTela = decimal(formData.get("transaction_amount"));
        BigDecimal valorServidor = assinatura.getValor().setScale(2, RoundingMode.HALF_UP);

        if (valorTela == null
            || valorServidor.compareTo(valorTela.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new RegraNegocioException(
                HttpStatus.CONFLICT,
                "O valor do plano foi atualizado. Recarregue o checkout antes de pagar."
            );
        }
    }

    private void validarComprador(Usuario usuario) {
        if (usuario == null || usuario.getId() == null
            || !StringUtils.hasText(usuario.getEmail())) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "A conta precisa ter um e-mail válido para realizar o pagamento."
            );
        }

        String cpf = Cpf.somenteDigitos(usuario.getCpf());
        if (!Cpf.valido(cpf)) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Cadastre um CPF válido no seu perfil antes de realizar o pagamento."
            );
        }
    }

    private void exigirConfiguracaoPrivada() {
        if (!StringUtils.hasText(accessToken)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O Access Token do Mercado Pago não foi configurado no servidor."
            );
        }

        if (!urlHttpsPublica(webhookUrl)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "A URL do webhook do Mercado Pago precisa ser uma URL HTTPS pública."
            );
        }
    }

    private String montarWebhookUrl() {
        String separador = webhookUrl.contains("?") ? "&" : "?";
        return webhookUrl + separador + "source_news=webhooks";
    }

    private void adicionarSePresente(Map<String, Object> mapa, String chave, Object valor) {
        if (valor == null) {
            return;
        }
        if (valor instanceof String texto && !StringUtils.hasText(texto)) {
            return;
        }
        mapa.put(chave, valor);
    }

    private String[] separarNome(String nome) {
        if (!StringUtils.hasText(nome)) {
            return new String[] { "", "" };
        }
        String[] partes = nome.trim().split("\\s+", 2);
        return new String[] { partes[0], partes.length > 1 ? partes[1] : "" };
    }

    private boolean urlHttpsPublica(String valor) {
        try {
            URI uri = URI.create(valor);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                && StringUtils.hasText(host)
                && uri.getUserInfo() == null
                && !"localhost".equalsIgnoreCase(host)
                && !"127.0.0.1".equals(host)
                && !"0.0.0.0".equals(host);
        } catch (IllegalArgumentException erro) {
            return false;
        }
    }

    private String normalizarAmbiente(String valor) {
        String ambiente = textoLimpo(valor).toLowerCase(Locale.ROOT);
        if (!StringUtils.hasText(ambiente)) {
            return "production";
        }
        if (List.of("production", "producao", "prod").contains(ambiente)) {
            return "production";
        }
        if (List.of("sandbox", "test", "teste").contains(ambiente)) {
            return "sandbox";
        }
        throw new IllegalStateException(
            "app.mercado-pago.environment deve ser production ou sandbox."
        );
    }

    private String mensagemGateway(int status, String corpo) {
        String resposta = StringUtils.hasText(corpo)
            ? corpo.toLowerCase(Locale.ROOT)
            : "";

        if (status == 401 || status == 403) {
            return "A credencial do Mercado Pago foi recusada. Confira as credenciais de produção do servidor.";
        }
        if (resposta.contains("card_token") || resposta.contains("token")) {
            return "Os dados seguros do cartão expiraram. Confira o cartão e tente novamente.";
        }
        if (resposta.contains("payer") || resposta.contains("identification")) {
            return "O Mercado Pago recusou os dados de identificação do comprador. Confira seu perfil.";
        }
        if (resposta.contains("transaction_amount")) {
            return "O Mercado Pago recusou o valor do pagamento. Recarregue o checkout e tente novamente.";
        }
        return "O Mercado Pago não conseguiu processar este pagamento. Confira os dados e tente novamente.";
    }

    private String respostaSegura(String corpo) {
        if (!StringUtils.hasText(corpo)) {
            return "sem corpo";
        }
        String resposta = corpo
            .replaceAll("[\\r\\n\\t]+", " ")
            .replaceAll("(?i)(\\\"token\\\"\\s*:\\s*\\\")[^\\\"]+", "$1[oculto]")
            .replaceAll("(?i)(\\\"number\\\"\\s*:\\s*\\\")[^\\\"]+", "$1[oculto]")
            .replaceAll("(?i)(\\\"email\\\"\\s*:\\s*\\\")[^\\\"]+", "$1[oculto]");
        return resposta.length() <= 1200
            ? resposta
            : resposta.substring(0, 1200) + "...";
    }

    private String textoSeguro(String valor) {
        if (!StringUtils.hasText(valor)) {
            return "[ausente]";
        }
        return valor.replaceAll("[^A-Za-z0-9_-]", "");
    }

    private String textoLimpo(String valor) {
        return valor == null ? "" : valor.trim();
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

    private Integer inteiro(Object valor) {
        if (valor == null) {
            return null;
        }
        try {
            return new BigDecimal(String.valueOf(valor)).intValueExact();
        } catch (ArithmeticException | NumberFormatException erro) {
            return null;
        }
    }
}
