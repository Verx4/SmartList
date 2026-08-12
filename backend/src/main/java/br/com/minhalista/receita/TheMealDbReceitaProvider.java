package br.com.minhalista.receita;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import br.com.minhalista.receita.ReceitaEstruturada.IngredienteEstruturado;
import br.com.minhalista.receita.ReceitaEstruturada.PassoEstruturado;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class TheMealDbReceitaProvider {

    private static final Map<Character, String> FRACOES = Map.of(
        '½', "1/2", '¼', "1/4", '¾', "3/4", '⅓', "1/3", '⅔', "2/3"
    );

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String baseUrl;

    public TheMealDbReceitaProvider(
        ObjectMapper objectMapper,
        @Value("${app.receitas.themealdb-api-key:}") String apiKey,
        @Value("${app.receitas.themealdb-base-url:https://www.themealdb.com/api/json/v1}") String baseUrl
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    }

    public boolean configurado() {
        return apiKey != null && !apiKey.isBlank();
    }

    public List<ReceitaEstruturada> buscar(String busca) {
        if (!configurado() || busca == null || busca.isBlank()) return List.of();
        String termo = URLEncoder.encode(busca.trim(), StandardCharsets.UTF_8);
        URI uri = URI.create(baseUrl + "/" + apiKey.trim() + "/search.php?s=" + termo);
        HttpRequest request = HttpRequest.newBuilder(uri)
            .timeout(Duration.ofSeconds(25))
            .header("Accept", "application/json")
            .GET()
            .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) return List.of();
            JsonNode refeicoes = objectMapper.readTree(response.body()).path("meals");
            if (!refeicoes.isArray()) return List.of();
            List<ReceitaEstruturada> resultado = new ArrayList<>();
            for (JsonNode item : refeicoes) resultado.add(mapear(item));
            return resultado.stream().limit(24).toList();
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            return List.of();
        } catch (IOException | RuntimeException erro) {
            return List.of();
        }
    }

    private ReceitaEstruturada mapear(JsonNode item) {
        String idOriginal = texto(item, "idMeal", "sem-id");
        List<IngredienteEstruturado> ingredientes = new ArrayList<>();
        for (int indice = 1; indice <= 20; indice++) {
            String nome = texto(item, "strIngredient" + indice, "");
            if (nome.isBlank()) continue;
            Medida medida = medida(texto(item, "strMeasure" + indice, ""));
            ingredientes.add(new IngredienteEstruturado(nome, medida.quantidade(), medida.unidade(), true, false));
        }
        List<PassoEstruturado> passos = passos(texto(item, "strInstructions", ""));
        String categoriaOriginal = texto(item, "strCategory", "");
        String nome = texto(item, "strMeal", "Receita do catálogo");
        String fonteExterna = texto(item, "strSource", "");
        String referencia = fonteExterna.isBlank()
            ? "https://www.themealdb.com/meal/" + idOriginal
            : fonteExterna;
        return new ReceitaEstruturada(
            "themealdb-" + idOriginal,
            nome,
            "Receita do catálogo TheMealDB, normalizada para o Smart List sem uso de fotografias.",
            "◇",
            categoria(categoriaOriginal, nome),
            tipo(categoriaOriginal, nome),
            0,
            "Não informada",
            "Não informado",
            "THEMEALDB",
            "TheMealDB",
            referencia,
            List.of(),
            ingredientes,
            passos
        );
    }

    private List<PassoEstruturado> passos(String instrucoes) {
        String normalizado = instrucoes.replace("\r", "\n").replaceAll("\n+", "\n").trim();
        if (normalizado.isBlank()) {
            return List.of(new PassoEstruturado(
                "Consulte a fonte", "O catálogo de origem não informou o modo de preparo.",
                List.of(), List.of(), List.of(), List.of("Consulte a referência original da receita."),
                "", "", "", List.of()
            ));
        }
        String[] blocos = normalizado.contains("\n")
            ? normalizado.split("\n")
            : normalizado.split("(?<=[.!?])\\s+(?=[A-Z])");
        List<PassoEstruturado> resultado = new ArrayList<>();
        for (String bloco : blocos) {
            String acao = bloco.trim();
            if (acao.isBlank()) continue;
            int numero = resultado.size() + 1;
            resultado.add(new PassoEstruturado(
                "Etapa " + numero,
                limitar(acao, 1200),
                List.of(), List.of(), List.of(), List.of(limitar(acao, 1200)),
                "", "", "", List.of()
            ));
            if (resultado.size() == 20) break;
        }
        return resultado;
    }

    private Medida medida(String original) {
        String valor = original.trim();
        for (Map.Entry<Character, String> fracao : FRACOES.entrySet()) {
            valor = valor.replace(String.valueOf(fracao.getKey()), " " + fracao.getValue());
        }
        String[] partes = valor.trim().split("\\s+");
        BigDecimal quantidade = BigDecimal.ZERO;
        int consumidos = 0;
        for (String parte : partes) {
            BigDecimal parcela = numero(parte);
            if (parcela == null) break;
            quantidade = quantidade.add(parcela);
            consumidos++;
            if (consumidos == 2) break;
        }
        String unidade = String.join(" ", java.util.Arrays.copyOfRange(partes, consumidos, partes.length)).trim();
        if (quantidade.signum() <= 0) {
            quantidade = BigDecimal.ONE;
            unidade = valor.isBlank() ? "porção indicada" : valor;
        }
        return new Medida(quantidade.setScale(3, RoundingMode.HALF_UP), unidade(unidade));
    }

    private BigDecimal numero(String valor) {
        try {
            if (valor.contains("/")) {
                String[] fracao = valor.split("/");
                if (fracao.length == 2) {
                    return new BigDecimal(fracao[0]).divide(new BigDecimal(fracao[1]), 6, RoundingMode.HALF_UP);
                }
            }
            return new BigDecimal(valor.replace(',', '.'));
        } catch (NumberFormatException | ArithmeticException erro) {
            return null;
        }
    }

    private String unidade(String valor) {
        String chave = valor.toLowerCase(Locale.ROOT).replaceAll("[.,]", "").trim();
        if (chave.matches("kilogram(s)?|kg")) return "kg";
        if (chave.matches("gram(s)?|g")) return "g";
        if (chave.matches("lit(er|re)(s)?|l")) return "l";
        if (chave.matches("millilit(er|re)(s)?|ml")) return "ml";
        if (chave.matches("clove(s)?|slice(s)?|piece(s)?|unit(s)?")) return "unidade";
        if (chave.matches("tablespoon(s)?|tbsp")) return "colher de sopa";
        if (chave.matches("teaspoon(s)?|tsp")) return "colher de chá";
        return limitar(valor.isBlank() ? "unidade" : valor, 30);
    }

    private String categoria(String categoria, String nome) {
        String valor = (categoria + " " + nome).toLowerCase(Locale.ROOT);
        if (valor.matches(".*(breakfast|brunch).*")) return "cafe-da-manha";
        if (valor.matches(".*(snack|starter|dessert|cake|pie|biscuit).*")) return "lanche";
        if (valor.matches(".*(supper|dinner).*")) return "jantar";
        return "almoco";
    }

    private String tipo(String categoria, String nome) {
        String valor = (categoria + " " + nome).toLowerCase(Locale.ROOT);
        return valor.matches(".*(dessert|sweet|cake|pie|pudding|biscuit).*" ) ? "doce" : "salgada";
    }

    private String texto(JsonNode item, String campo, String padrao) {
        String valor = item.path(campo).asText("").trim();
        return valor.isBlank() ? padrao : valor;
    }

    private String limitar(String valor, int limite) {
        return valor.length() <= limite ? valor : valor.substring(0, limite);
    }

    private record Medida(BigDecimal quantidade, String unidade) { }
}
