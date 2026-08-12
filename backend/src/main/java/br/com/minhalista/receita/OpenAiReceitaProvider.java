package br.com.minhalista.receita;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.receita.GerarReceitaRequest.ItemDespensaIa;
import br.com.minhalista.receita.ReceitaEstruturada.IngredienteEstruturado;
import br.com.minhalista.receita.ReceitaEstruturada.IngredientePassoEstruturado;
import br.com.minhalista.receita.ReceitaEstruturada.PassoEstruturado;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class OpenAiReceitaProvider {

    private static final URI API_URI = URI.create("https://api.openai.com/v1/chat/completions");
    private static final String INSTRUCAO = """
        Você cria uma receita culinária estruturada em português do Brasil para o Smart List.
        Responda somente JSON. Não inclua fotos, URLs, marcas, alegações médicas ou fatos que não sejam
        necessários para preparar a receita. Use quantidades e unidades objetivas. A despensa é contexto,
        não uma restrição: a receita pode incluir ingredientes faltantes.

        Formato obrigatório:
        {"receita":{"nome":"string","descricao":"string","categoria":"cafe-da-manha|almoco|lanche|jantar",
        "tipo":"salgada|doce","tempoMinutos":30,"dificuldade":"Fácil|Média|Difícil","rendimento":"string",
        "utensilios":["string"],"ingredientes":[{"nome":"string","quantidade":1.0,"unidade":"g|kg|ml|l|unidade|dente|fatia|maço|pitada","obrigatorio":true,"basico":false}],
        "passos":[{"titulo":"string","descricao":"string","ingredientes":[{"nome":"string","quantidade":1.0,"unidade":"string"}],
        "utensilios":["string"],"continueUsando":["string"],"acoes":["string"],"tempoAproximado":"string",
        "intensidadeFogo":"string","pontoEsperado":"string","observacoes":["string"]}]}}
        Todos os ingredientes citados nos passos devem existir na lista geral. Produza de 2 a 12 passos.
        """;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String model;

    public OpenAiReceitaProvider(
        ObjectMapper objectMapper,
        @Value("${app.receitas.openai-api-key:}") String apiKey,
        @Value("${app.receitas.openai-model:gpt-5-nano}") String model
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    }

    public ReceitaEstruturada gerar(String busca, List<ItemDespensaIa> despensa) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RegraNegocioException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "A criação de receitas por IA ainda não foi configurada no servidor."
            );
        }
        try {
            String contexto = objectMapper.writeValueAsString(Map.of(
                "pedido", busca,
                "despensa", despensa == null ? List.of() : despensa
            ));
            Map<String, Object> corpo = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", INSTRUCAO),
                    Map.of("role", "user", "content", contexto)
                ),
                "response_format", Map.of("type", "json_object")
            );
            HttpRequest request = HttpRequest.newBuilder(API_URI)
                .timeout(Duration.ofSeconds(75))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(corpo)))
                .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RegraNegocioException(HttpStatus.BAD_GATEWAY, "O serviço de IA não conseguiu criar a receita agora.");
            }
            JsonNode raiz = objectMapper.readTree(response.body());
            String conteudo = raiz.path("choices").path(0).path("message").path("content").asText("");
            return mapear(objectMapper.readTree(conteudo).path("receita"));
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new RegraNegocioException(HttpStatus.SERVICE_UNAVAILABLE, "A criação da receita foi interrompida.");
        } catch (IOException | IllegalArgumentException erro) {
            throw new RegraNegocioException(HttpStatus.BAD_GATEWAY, "A receita criada não pôde ser validada.");
        }
    }

    private ReceitaEstruturada mapear(JsonNode receita) {
        String nome = obrigatorio(receita, "nome");
        List<IngredienteEstruturado> ingredientes = new ArrayList<>();
        for (JsonNode item : receita.path("ingredientes")) {
            String ingrediente = texto(item, "nome");
            BigDecimal quantidade = decimal(item, "quantidade");
            if (ingrediente.isBlank() || quantidade.signum() <= 0) continue;
            ingredientes.add(new IngredienteEstruturado(
                ingrediente, quantidade, padrao(texto(item, "unidade"), "unidade"),
                item.path("obrigatorio").asBoolean(true), item.path("basico").asBoolean(false)
            ));
        }
        if (ingredientes.isEmpty()) throw new IllegalArgumentException("Receita sem ingredientes.");
        List<PassoEstruturado> passos = new ArrayList<>();
        for (JsonNode item : receita.path("passos")) {
            List<IngredientePassoEstruturado> usados = new ArrayList<>();
            for (JsonNode usado : item.path("ingredientes")) {
                String ingrediente = texto(usado, "nome");
                if (!ingrediente.isBlank()) usados.add(new IngredientePassoEstruturado(
                    ingrediente, decimal(usado, "quantidade"), padrao(texto(usado, "unidade"), "unidade")
                ));
            }
            passos.add(new PassoEstruturado(
                padrao(texto(item, "titulo"), "Etapa " + (passos.size() + 1)),
                padrao(texto(item, "descricao"), primeiro(item.path("acoes"))),
                usados,
                textos(item.path("utensilios")),
                textos(item.path("continueUsando")),
                textos(item.path("acoes")),
                texto(item, "tempoAproximado"),
                texto(item, "intensidadeFogo"),
                texto(item, "pontoEsperado"),
                textos(item.path("observacoes"))
            ));
        }
        if (passos.size() < 2) throw new IllegalArgumentException("Receita sem passos suficientes.");
        return new ReceitaEstruturada(
            "ia-" + UUID.randomUUID(),
            nome,
            padrao(texto(receita, "descricao"), "Receita criada sob demanda."),
            "◇",
            categoria(texto(receita, "categoria")),
            "doce".equals(texto(receita, "tipo")) ? "doce" : "salgada",
            Math.max(1, receita.path("tempoMinutos").asInt(30)),
            padrao(texto(receita, "dificuldade"), "Não informada"),
            padrao(texto(receita, "rendimento"), "Não informado"),
            "IA",
            "OpenAI",
            null,
            textos(receita.path("utensilios")),
            ingredientes.stream().limit(30).toList(),
            passos.stream().limit(12).toList()
        );
    }

    private String categoria(String valor) {
        return switch (valor) {
            case "cafe-da-manha", "almoco", "lanche", "jantar" -> valor;
            default -> "almoco";
        };
    }

    private List<String> textos(JsonNode no) {
        List<String> resultado = new ArrayList<>();
        if (no.isArray()) for (JsonNode item : no) if (!item.asText("").isBlank()) resultado.add(item.asText().trim());
        return resultado;
    }

    private String primeiro(JsonNode no) {
        return no.isArray() && !no.isEmpty() ? no.path(0).asText("") : "";
    }

    private String obrigatorio(JsonNode item, String campo) {
        String valor = texto(item, campo);
        if (valor.isBlank()) throw new IllegalArgumentException("Campo obrigatório ausente.");
        return valor;
    }

    private String texto(JsonNode item, String campo) {
        return item.path(campo).asText("").trim();
    }

    private BigDecimal decimal(JsonNode item, String campo) {
        try {
            JsonNode valor = item.path(campo);
            return valor.isNumber() ? valor.decimalValue() : new BigDecimal(valor.asText("0").replace(',', '.'));
        } catch (NumberFormatException erro) {
            return BigDecimal.ZERO;
        }
    }

    private String padrao(String valor, String padrao) {
        return valor == null || valor.isBlank() ? padrao : valor;
    }
}
