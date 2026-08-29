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
import br.com.minhalista.usuario.Cpf;
import br.com.minhalista.usuario.Usuario;

@Service
public class MercadoPagoService {

    private static final Logger LOG = LoggerFactory.getLogger(MercadoPagoService.class);
    private static final String API_BASE_URL = "https://api.mercadopago.com";
    private static final String IDENTITY_API_BASE_URL = "https://api.mercadolibre.com";

    private final RestClient restClient;
    private final RestClient identityRestClient;
    private final String accessToken;
    private final String webhookUrl;
    private final String webhookSecret;
    private final String frontendUrl;
    private final String ambienteConfigurado;
    private final boolean modoTeste;
    private volatile Boolean credencialTesteDetectada;

    public MercadoPagoService(
        @Value("${app.mercado-pago.access-token:}") String accessToken,
        @Value("${app.mercado-pago.webhook-url:}") String webhookUrl,
        @Value("${app.mercado-pago.webhook-secret:}") String webhookSecret,
        @Value("${app.mercado-pago.environment:production}") String environment,
        @Value("${app.frontend-url}") String frontendUrl
    ) {
        SimpleClientHttpRequestFactory requestFactory =
            new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(10));

        SimpleClientHttpRequestFactory identityRequestFactory =
            new SimpleClientHttpRequestFactory();
        identityRequestFactory.setConnectTimeout(Duration.ofSeconds(5));
        identityRequestFactory.setReadTimeout(Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
            .baseUrl(API_BASE_URL)
            .requestFactory(requestFactory)
            .build();
        this.identityRestClient = RestClient.builder()
            .baseUrl(IDENTITY_API_BASE_URL)
            .requestFactory(identityRequestFactory)
            .build();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.webhookUrl = webhookUrl == null ? "" : webhookUrl.trim();
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
        this.frontendUrl = normalizarFrontendUrl(frontendUrl);
        this.ambienteConfigurado = normalizarAmbiente(environment);
        this.modoTeste = "sandbox".equals(this.ambienteConfigurado);

        LOG.info(
            "Configuração Mercado Pago carregada: tokenConfigurado={}, ambiente={}, frontend={}, webhook={}, webhookSecretConfigurado={}.",
            StringUtils.hasText(this.accessToken),
            this.modoTeste ? "SANDBOX" : "PRODUCAO",
            descreverUrl(this.frontendUrl),
            descreverUrl(this.webhookUrl),
            StringUtils.hasText(this.webhookSecret)
        );
    }

    @SuppressWarnings("unchecked")
    public CheckoutResponse criarPreferencia(Usuario usuario, Assinatura assinatura) {
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
            exigirConfiguracaoCheckout();
            validarAmbienteCredencial();
            Map<String, Object> corpo = montarCorpoPreferencia(usuario, assinatura);
            // Deixe o Mercado Pago coletar os dados do comprador no próprio Checkout Pro.
            // Isso preserva o pagamento como convidado e evita vincular o checkout
            // à sessão/identidade usada no cadastro do Smart List.
            corpo.remove("payer");

            LOG.info(
                "Payload Mercado Pago preparado: checkout={}, body={}.",
                assinaturaId,
                payloadSeguro(corpo)
            );

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

            LOG.info(
                "Preferência Mercado Pago criada: checkout={}, preferencia={}, ambiente={}, host={}.",
                assinaturaId,
                preferenciaId,
                modoTeste ? "SANDBOX" : "PRODUCAO",
                descreverUrl(checkoutUrl)
            );

            return new CheckoutResponse(
                preferenciaId,
                checkoutUrl,
                checkoutUrl,
                checkoutUrl
            );
        } catch (RegraNegocioException erro) {
            throw erro;
        } catch (RestClientResponseException erro) {
            String resposta = erro.getResponseBodyAsString();
            LOG.warn(
                "Mercado Pago recusou a preferência do checkout {}: HTTP {}, resposta={}.",
                assinaturaId,
                erro.getStatusCode().value(),
                respostaSegura(resposta)
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                mensagemRejeicao(erro.getStatusCode().value(), resposta),
                detalhesGateway(erro.getStatusCode().value(), resposta)
            );
        } catch (RestClientException erro) {
            LOG.warn(
                "Falha de comunicação ao criar a preferência do checkout {} no Mercado Pago: {}.",
                assinaturaId,
                erro.getClass().getSimpleName()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_GATEWAY,
                "Não foi possível conectar ao Mercado Pago. Tente novamente em instantes.",
                Map.of(
                    "gateway", "Mercado Pago",
                    "exception", erro.getClass().getName(),
                    "message", String.valueOf(erro.getMessage())
                )
            );
        } catch (RuntimeException erro) {
            LOG.error(
                "Falha interna ao preparar a preferência Mercado Pago do checkout {}.",
                assinaturaId,
                erro
            );
            throw new RegraNegocioException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível preparar o pagamento. Tente novamente.",
                detalhesExcecao(erro)
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

        String cpf = Cpf.somenteDigitos(usuario.getCpf());

        if (!Cpf.valido(cpf)) {
            LOG.warn(
                "Checkout bloqueado antes do Mercado Pago: usuário {} sem CPF válido no banco.",
                usuario.getId()
            );
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Cadastre um CPF válido no seu perfil antes de iniciar o pagamento."
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

        if (StringUtils.hasText(assinatura.getCupomCodigo())) {
            metadata.put("cupom_codigo", assinatura.getCupomCodigo().trim());
            adicionarSePresente(
                metadata,
                "cupom_percentual_desconto",
                assinatura.getCupomPercentualDesconto()
            );
            adicionarSePresente(
                metadata,
                "cupom_valor_original",
                assinatura.getCupomValorOriginal()
            );
            adicionarSePresente(
                metadata,
                "cupom_valor_desconto",
                assinatura.getCupomValorDesconto()
            );
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", "premium-" + assinatura.getCiclo().name().toLowerCase());
        item.put("title", "Smart List Premium " + assinatura.getCiclo().getNome());
        item.put("description", "Acesso aos recursos Premium do Smart List");
        item.put("quantity", 1);
        item.put("currency_id", "BRL");
        item.put("unit_price", valorCobranca);

        Map<String, Object> identificacao = new LinkedHashMap<>();
        identificacao.put("type", "CPF");
        identificacao.put("number", cpf);

        Map<String, Object> pagador = new LinkedHashMap<>();
        pagador.put("email", usuario.getEmail().trim());
        pagador.put("identification", identificacao);

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("items", List.of(item));
        corpo.put("payer", pagador);
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

    private void adicionarSePresente(
        Map<String, Object> destino,
        String chave,
        Object valor
    ) {
        if (valor != null && (!(valor instanceof String texto) || StringUtils.hasText(texto))) {
            destino.put(chave, valor);
        }
    }

    @SuppressWarnings("unchecked")
    public PagamentoConsultado consultarPagamento(String pagamentoId) {
        exigirConfiguracaoConsulta();

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

    void exigirConfiguracaoCheckout() {
        if (!StringUtils.hasText(accessToken)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O token do Mercado Pago não foi configurado. Defina MERCADO_PAGO_ACCESS_TOKEN ou MERCADO_PAGO_TOKEN no servidor."
            );
        }

        if (!webhookUrlValida(webhookUrl)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "A URL do webhook do Mercado Pago precisa ser uma URL HTTPS pública."
            );
        }

        if (!modoTeste && !urlHttpsPublica(frontendUrl)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "A URL de retorno do checkout precisa ser uma URL HTTPS pública."
            );
        }
    }

    void exigirConfiguracaoConsulta() {
        if (!StringUtils.hasText(accessToken)) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O token do Mercado Pago não foi configurado. Defina MERCADO_PAGO_ACCESS_TOKEN ou MERCADO_PAGO_TOKEN no servidor."
            );
        }
    }

    private void validarAmbienteCredencial() {
        Boolean credencialTeste = credencialDeTeste();

        if (credencialTeste == null) {
            return;
        }

        if (!modoTeste && credencialTeste) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O site está em produção, mas o Access Token configurado pertence a uma conta de teste do Mercado Pago. Configure o Access Token de produção em MERCADO_PAGO_ACCESS_TOKEN."
            );
        }

        if (modoTeste && !credencialTeste) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "O checkout está configurado como sandbox, mas o Access Token pertence a uma conta real do Mercado Pago. Ajuste MERCADO_PAGO_ENVIRONMENT ou use credenciais de teste."
            );
        }
    }

    @SuppressWarnings("unchecked")
    private Boolean credencialDeTeste() {
        Boolean cache = credencialTesteDetectada;

        if (cache != null) {
            return cache;
        }

        if (!StringUtils.hasText(accessToken)) {
            return null;
        }

        synchronized (this) {
            if (credencialTesteDetectada != null) {
                return credencialTesteDetectada;
            }

            try {
                Map<String, Object> usuario = identityRestClient.get()
                    .uri("/users/me")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);

                Object tagsValor = usuario == null ? null : usuario.get("tags");
                boolean teste = false;

                if (tagsValor instanceof Iterable<?> tags) {
                    for (Object tag : tags) {
                        if ("test_user".equalsIgnoreCase(String.valueOf(tag))) {
                            teste = true;
                            break;
                        }
                    }
                }

                credencialTesteDetectada = teste;
                LOG.info(
                    "Ambiente da credencial Mercado Pago validado pela conta vinculada: {}.",
                    teste ? "TESTE" : "PRODUCAO"
                );
                return teste;
            } catch (RestClientResponseException erro) {
                LOG.warn(
                    "Não foi possível validar o ambiente da credencial Mercado Pago: HTTP {}.",
                    erro.getStatusCode().value()
                );
                return null;
            } catch (RestClientException erro) {
                LOG.warn(
                    "Não foi possível consultar a conta vinculada ao Access Token para validar o ambiente: {}.",
                    erro.getClass().getSimpleName()
                );
                return null;
            }
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

    @SuppressWarnings("unchecked")
    private Map<String, Object> payloadSeguro(Map<String, Object> corpo) {
        Map<String, Object> seguro = new LinkedHashMap<>(corpo);
        Map<String, Object> pagadorOriginal = corpo.get("payer") instanceof Map<?, ?> mapa
            ? (Map<String, Object>) mapa
            : Map.of();
        Map<String, Object> pagador = new LinkedHashMap<>(pagadorOriginal);
        Map<String, Object> identificacaoOriginal =
            pagadorOriginal.get("identification") instanceof Map<?, ?> mapa
                ? (Map<String, Object>) mapa
                : Map.of();
        Map<String, Object> identificacao = new LinkedHashMap<>(identificacaoOriginal);

        pagador.put("email", mascararEmail(texto(pagadorOriginal.get("email"))));
        identificacao.put("number", Cpf.mascarar(texto(identificacaoOriginal.get("number"))));
        pagador.put("identification", identificacao);
        seguro.put("payer", pagador);
        return seguro;
    }

    private String respostaSegura(String corpo) {
        if (!StringUtils.hasText(corpo)) {
            return "sem corpo";
        }

        String normalizado = corpo
            .replaceAll("[\\r\\n\\t]+", " ")
            .replaceAll("(?i)bearer\\s+[a-z0-9._-]+", "Bearer [oculto]")
            .replaceAll("(?i)(\\\"number\\\"\\s*:\\s*\\\")[^\\\"]+", "$1[oculto]")
            .replaceAll("(?i)(\\\"email\\\"\\s*:\\s*\\\")[^\\\"]+", "$1[oculto]");
        return normalizado.length() <= 1200
            ? normalizado
            : normalizado.substring(0, 1200) + "...";
    }

    private boolean erroDeIdentificacao(String corpo) {
        if (!StringUtils.hasText(corpo)) {
            return false;
        }

        String resposta = corpo.toLowerCase(java.util.Locale.ROOT);
        return resposta.contains("identification")
            || resposta.contains("payer")
            || resposta.contains("cpf");
    }

    private String mensagemRejeicao(int status, String corpo) {
        String resposta = StringUtils.hasText(corpo)
            ? corpo.toLowerCase(java.util.Locale.ROOT)
            : "";

        if (status == 401 || status == 403) {
            return "A credencial do Mercado Pago foi recusada. Verifique o token configurado no servidor.";
        }

        if (erroDeIdentificacao(corpo)) {
            return "Falha na validação dos dados do comprador. Confira o CPF salvo no seu perfil.";
        }

        if (resposta.contains("notification_url")) {
            return "O Mercado Pago recusou a URL de notificação configurada no servidor.";
        }

        if (resposta.contains("back_url") || resposta.contains("back_urls")) {
            return "O Mercado Pago recusou a URL de retorno configurada no servidor.";
        }

        if (resposta.contains("unit_price") || resposta.contains("items")) {
            return "O Mercado Pago recusou o valor ou os itens do plano selecionado.";
        }

        return "O Mercado Pago recusou a criação do pagamento. Tente novamente em instantes.";
    }

    private Map<String, Object> detalhesGateway(int status, String resposta) {
        Map<String, Object> detalhes = new LinkedHashMap<>();
        detalhes.put("gateway", "Mercado Pago");
        detalhes.put("httpStatus", status);
        detalhes.put("response", respostaSegura(resposta));
        return detalhes;
    }

    private Map<String, Object> detalhesExcecao(RuntimeException erro) {
        Map<String, Object> detalhes = new LinkedHashMap<>();
        detalhes.put("exception", erro.getClass().getName());
        detalhes.put("message", String.valueOf(erro.getMessage()));

        if (erro.getCause() != null) {
            detalhes.put("cause", erro.getCause().getClass().getName());
            detalhes.put("causeMessage", String.valueOf(erro.getCause().getMessage()));
        }

        return detalhes;
    }

    private String mascararEmail(String email) {
        if (!StringUtils.hasText(email) || !email.contains("@")) {
            return "[ausente]";
        }

        int separador = email.indexOf('@');
        String usuario = email.substring(0, separador);
        String dominio = email.substring(separador);
        String inicio = usuario.isEmpty() ? "*" : usuario.substring(0, 1);
        return inicio + "***" + dominio;
    }

    private boolean webhookUrlValida(String valor) {
        return urlHttpsPublica(valor);
    }

    private boolean urlHttpsPublica(String valor) {
        try {
            URI uri = URI.create(valor);
            String host = uri.getHost();
            return "https".equalsIgnoreCase(uri.getScheme())
                && StringUtils.hasText(host)
                && uri.getUserInfo() == null
                && !host.equalsIgnoreCase("localhost")
                && !host.equals("127.0.0.1")
                && !host.equals("0.0.0.0");
        } catch (IllegalArgumentException erro) {
            return false;
        }
    }

    private String descreverUrl(String valor) {
        if (!StringUtils.hasText(valor)) {
            return "[ausente]";
        }

        try {
            URI uri = URI.create(valor);
            String porta = uri.getPort() < 0 ? "" : ":" + uri.getPort();
            return uri.getScheme() + "://" + uri.getHost() + porta + uri.getPath();
        } catch (IllegalArgumentException erro) {
            return "[invalida]";
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

    private String normalizarAmbiente(String valor) {
        String ambiente = valor == null
            ? "production"
            : valor.trim().toLowerCase(java.util.Locale.ROOT);

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
