package br.com.minhalista.receita;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Map;

public final class NormalizadorIngrediente {

    private static final Map<String, String> ALIASES = Map.ofEntries(
        Map.entry("farofa", "farinha de mandioca"),
        Map.entry("farinha mandioca", "farinha de mandioca"),
        Map.entry("linguica calabresa", "calabresa"),
        Map.entry("linguica", "calabresa"),
        Map.entry("carne seca", "charque"),
        Map.entry("jaba", "charque"),
        Map.entry("ovo", "ovos"),
        Map.entry("mussarela", "queijo"),
        Map.entry("mucarela", "queijo"),
        Map.entry("goma de tapioca", "tapioca"),
        Map.entry("flocos de milho", "flocao de milho"),
        Map.entry("oleo", "azeite")
    );

    private NormalizadorIngrediente() {
    }

    public static String chave(String valor) {
        String texto = semAcentos(valor)
            .toLowerCase(Locale.ROOT)
            .trim()
            .replaceAll("[()]", " ")
            .replaceAll("\\s+", " ");
        texto = ALIASES.getOrDefault(texto, texto);
        return texto.replaceAll("\\b(de|da|do)\\b", " ").replaceAll("\\s+", " ").trim();
    }

    public static UnidadeCanonica converter(BigDecimal quantidade, String unidade) {
        BigDecimal valor = quantidade == null || quantidade.signum() < 0 ? BigDecimal.ZERO : quantidade;
        String texto = semAcentos(unidade).toLowerCase(Locale.ROOT).trim().replace(".", "");
        return switch (texto) {
            case "kg", "quilo", "quilos" -> new UnidadeCanonica(valor.multiply(BigDecimal.valueOf(1000)), "g");
            case "g", "grama", "gramas" -> new UnidadeCanonica(valor, "g");
            case "l", "litro", "litros" -> new UnidadeCanonica(valor.multiply(BigDecimal.valueOf(1000)), "ml");
            case "ml", "mililitro", "mililitros" -> new UnidadeCanonica(valor, "ml");
            case "un", "unidade", "unidades", "dente", "dentes", "fatia", "fatias", "maco", "macos" ->
                new UnidadeCanonica(valor, "unidade");
            default -> new UnidadeCanonica(valor, texto.isBlank() ? "unidade" : texto);
        };
    }

    public static String unidade(String unidade) {
        return converter(BigDecimal.ONE, unidade).unidade();
    }

    private static String semAcentos(String valor) {
        if (valor == null) return "";
        return Normalizer.normalize(valor, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    public record UnidadeCanonica(BigDecimal quantidade, String unidade) {
    }
}
