package br.com.minhalista.pagamento;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Service
public class KiwifyApiService {

    private static final Logger LOG =
        LoggerFactory.getLogger(KiwifyApiService.class);
    private static final String API_BASE_URL = "https://public-api.kiwify.com";

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final String accountId;
    private volatile String accessToken;
    private volatile Instant tokenExpiraEm = Instant.EPOCH;

    public KiwifyApiService(
        @Value("${app.kiwify.client-id:}") String clientId,
        @Value("${app.kiwify.client-secret:}") String clientSecret,
        @Value("${app.kiwify.account-id:}") String accountId
    ) {
        SimpleClientHttpRequestFactory requestFactory =
            new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(12));
        this.restClient = RestClient.builder()
            .baseUrl(API_BASE_URL)
            .requestFactory(requestFactory)
            .build();
        this.clientId = limpar(clientId);
        this.clientSecret = limpar(clientSecret);
        this.accountId = limpar(accountId);
        LOG.info(
            "Configuração Kiwify carregada: clientId={}, clientSecret={}, accountId={}.",
            StringUtils.hasText(this.clientId),
            StringUtils.hasText(this.clientSecret),
            StringUtils.hasText(this.accountId)
        );
    }

    public boolean configurado() {
        return StringUtils.hasText(clientId)
            && StringUtils.hasText(clientSecret)
            && StringUtils.hasText(accountId);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> consultarVenda(String orderId) {
        if (!configurado() || !StringUtils.hasText(orderId)) {
            throw new IllegalStateException(
                "As credenciais da API Kiwify não estão configuradas."
            );
        }

        return restClient.get()
            .uri("/v1/sales/{id}", orderId)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + obterToken())
            .header("x-kiwify-account-id", accountId)
            .retrieve()
            .body(Map.class);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listarVendasPagasRecentes(
        Instant inicio,
        Instant fim
    ) {
        if (!configurado()) {
            throw new IllegalStateException(
                "As credenciais da API Kiwify não estão configuradas."
            );
        }

        Map<String, Object> resposta = restClient.get()
            .uri(uriBuilder -> uriBuilder
                .path("/v1/sales")
                .queryParam("status", "paid")
                .queryParam("view_full_sale_details", true)
                .queryParam("page_size", 100)
                .queryParam(
                    "start_date",
                    inicio.atZone(ZoneOffset.UTC).toLocalDate()
                )
                .queryParam(
                    "end_date",
                    fim.atZone(ZoneOffset.UTC).toLocalDate()
                )
                .build()
            )
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + obterToken())
            .header("x-kiwify-account-id", accountId)
            .retrieve()
            .body(Map.class);

        Object dados = resposta == null ? null : resposta.get("data");
        if (!(dados instanceof List<?> vendas)) {
            return List.of();
        }

        return vendas.stream()
            .filter(Map.class::isInstance)
            .map(item -> (Map<String, Object>) item)
            .toList();
    }

    @SuppressWarnings("unchecked")
    private synchronized String obterToken() {
        if (StringUtils.hasText(accessToken)
            && Instant.now().isBefore(tokenExpiraEm.minusSeconds(60))) {
            return accessToken;
        }

        String corpo = "client_id=" + codificar(clientId)
            + "&client_secret=" + codificar(clientSecret);
        Map<String, Object> resposta = restClient.post()
            .uri("/v1/oauth/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(corpo)
            .retrieve()
            .body(Map.class);

        Object token = resposta == null ? null : resposta.get("access_token");
        if (!(token instanceof String texto) || !StringUtils.hasText(texto)) {
            throw new IllegalStateException(
                "A Kiwify não retornou um token OAuth válido."
            );
        }

        long segundos = 86_400L;
        Object expiresIn = resposta.get("expires_in");
        if (expiresIn instanceof Number numero) {
            segundos = numero.longValue();
        } else if (expiresIn != null) {
            try {
                segundos = Long.parseLong(expiresIn.toString());
            } catch (NumberFormatException ignorado) {
                // Mantém a validade padrão documentada.
            }
        }

        accessToken = texto;
        tokenExpiraEm = Instant.now().plusSeconds(Math.max(300L, segundos));
        return accessToken;
    }

    private String codificar(String valor) {
        return URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    private String limpar(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
