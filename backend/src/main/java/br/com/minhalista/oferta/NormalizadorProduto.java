package br.com.minhalista.oferta;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

public final class NormalizadorProduto {

    private static final Set<String> TERMOS_DESCARTAVEIS = Set.of(
        "de", "da", "do", "das", "dos", "com", "un", "und", "unidade"
    );

    private NormalizadorProduto() {
    }

    public static String normalizar(String valor) {
        String limpo = Normalizer.normalize(valor == null ? "" : valor, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("(\\d)\\s*(litros?|lts?)\\b", "$1l")
            .replaceAll("(\\d)\\s*(quilos?|kgs?)\\b", "$1kg")
            .replaceAll("(\\d)\\s*(gramas?|grs?)\\b", "$1g")
            .replaceAll("(\\d)\\s*(mililitros?|mls?)\\b", "$1ml")
            .replaceAll("[^a-z0-9]+", " ")
            .trim();

        return Arrays.stream(limpo.split("\\s+"))
            .filter(termo -> !termo.isBlank())
            .filter(termo -> !TERMOS_DESCARTAVEIS.contains(termo))
            .distinct()
            .sorted()
            .collect(Collectors.joining(" "));
    }

    public static boolean corresponde(String consulta, String chaveOferta) {
        Set<String> termosConsulta = termos(normalizar(consulta));
        Set<String> termosOferta = termos(chaveOferta);
        return !termosConsulta.isEmpty() && termosOferta.containsAll(termosConsulta);
    }

    private static Set<String> termos(String valor) {
        return Arrays.stream((valor == null ? "" : valor).split("\\s+"))
            .filter(termo -> !termo.isBlank())
            .collect(Collectors.toSet());
    }
}
