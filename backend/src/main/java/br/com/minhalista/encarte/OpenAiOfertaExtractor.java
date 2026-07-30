package br.com.minhalista.encarte;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class OpenAiOfertaExtractor {

    private static final URI API_URI =
        URI.create("https://api.openai.com/v1/chat/completions");
    private static final int LIMITE_TEXTO = 55_000;
    private static final String INSTRUCAO = """
        Você extrai ofertas de texto OCR de encartes brasileiros.
        Use exclusivamente os dados presentes no texto. Nunca invente produto, preço,
        marca, validade, condição ou unidade. Ignore endereços, telefones, rodapés,
        parcelamentos sem produto e textos institucionais.

        Responda apenas JSON no formato:
        {"ofertas":[{
          "produto":"string",
          "categoria":"string ou null",
          "marca":"string ou null",
          "peso_volume":"string ou null",
          "quantidade_embalagem":0.0,
          "unidade_medida":"kg|g|l|ml|unidade ou null",
          "preco_promocional":0.00,
          "preco_anterior":0.00,
          "condicao_especial":"string ou null",
          "valida_de":"AAAA-MM-DD ou null",
          "valida_ate":"AAAA-MM-DD ou null",
          "confianca":0.0
        }]}
        Não inclua itens sem preço promocional claramente associado ao produto.
        A confiança deve ficar entre 0 e 1.
        """;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public OpenAiOfertaExtractor(
        ObjectMapper objectMapper,
        @Value("${app.ofertas.openai-api-key:}") String apiKey,
        @Value("${app.ofertas.openai-model:gpt-5-nano}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    public boolean configurado() {
        return apiKey != null && !apiKey.isBlank();
    }

    public List<OfertaExtraida> extrair(String textoOcr) {
        if (!configurado()) {
            return List.of();
        }
        String textoLimitado = textoOcr.length() > LIMITE_TEXTO
            ? textoOcr.substring(0, LIMITE_TEXTO)
            : textoOcr;
        try {
            Map<String, Object> corpo = Map.of(
                "model",
                model,
                "messages",
                List.of(
                    Map.of("role", "system", "content", INSTRUCAO),
                    Map.of("role", "user", "content", textoLimitado)
                ),
                "response_format",
                Map.of("type", "json_object")
            );
            HttpRequest request = HttpRequest.newBuilder(API_URI)
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                    objectMapper.writeValueAsString(corpo)
                ))
                .build();
            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException(
                    "Extração por IA recusada (HTTP " + response.statusCode() + ")."
                );
            }
            JsonNode raiz = objectMapper.readTree(response.body());
            String conteudo = raiz.path("choices").path(0).path("message").path("content")
                .asText("");
            return lerOfertas(objectMapper.readTree(conteudo));
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Extração inteligente interrompida.", erro);
        } catch (IOException erro) {
            throw new IllegalStateException("Falha na extração inteligente das ofertas.", erro);
        }
    }

    private List<OfertaExtraida> lerOfertas(JsonNode raiz) {
        List<OfertaExtraida> ofertas = new ArrayList<>();
        for (JsonNode item : raiz.path("ofertas")) {
            String produto = texto(item, "produto");
            BigDecimal preco = decimal(item, "preco_promocional");
            if (produto == null || preco == null || preco.signum() <= 0) {
                continue;
            }
            ofertas.add(new OfertaExtraida(
                produto,
                texto(item, "categoria"),
                texto(item, "marca"),
                texto(item, "peso_volume"),
                decimal(item, "quantidade_embalagem"),
                texto(item, "unidade_medida"),
                preco,
                decimal(item, "preco_anterior"),
                texto(item, "condicao_especial"),
                data(item, "valida_de"),
                data(item, "valida_ate"),
                confianca(item)
            ));
        }
        return ofertas.stream().limit(250).toList();
    }

    private String texto(JsonNode item, String campo) {
        JsonNode valor = item.path(campo);
        if (valor.isMissingNode() || valor.isNull()) {
            return null;
        }
        String texto = valor.asText("").trim();
        return texto.isBlank() ? null : texto;
    }

    private BigDecimal decimal(JsonNode item, String campo) {
        JsonNode valor = item.path(campo);
        if (valor.isMissingNode() || valor.isNull()) {
            return null;
        }
        try {
            return valor.isNumber()
                ? valor.decimalValue()
                : new BigDecimal(valor.asText().replace(',', '.'));
        } catch (NumberFormatException erro) {
            return null;
        }
    }

    private LocalDate data(JsonNode item, String campo) {
        String valor = texto(item, campo);
        if (valor == null) {
            return null;
        }
        try {
            return LocalDate.parse(valor);
        } catch (DateTimeParseException erro) {
            return null;
        }
    }

    private BigDecimal confianca(JsonNode item) {
        BigDecimal valor = decimal(item, "confianca");
        if (valor == null) {
            return new BigDecimal("0.7000");
        }
        return valor.max(BigDecimal.ZERO).min(BigDecimal.ONE);
    }
}
