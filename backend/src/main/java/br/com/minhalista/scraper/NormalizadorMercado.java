package br.com.minhalista.scraper;

import java.text.Normalizer;
import java.util.Locale;

final class NormalizadorMercado {

    private NormalizadorMercado() {
    }

    static String normalizar(String valor) {
        String semAcentos = Normalizer.normalize(valor == null ? "" : valor, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return semAcentos.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }
}
