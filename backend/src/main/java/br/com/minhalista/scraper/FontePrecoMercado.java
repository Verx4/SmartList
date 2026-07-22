package br.com.minhalista.scraper;

import java.io.IOException;
import java.util.List;

public interface FontePrecoMercado {

    String mercado();

    default List<String> aliases() {
        return List.of(mercado());
    }

    default boolean atende(String nomeMercado) {
        String procurado = NormalizadorMercado.normalizar(nomeMercado);
        return aliases().stream()
            .map(NormalizadorMercado::normalizar)
            .anyMatch(procurado::equals);
    }

    List<FontePrecoResultado> buscar(String produto, String cidade) throws IOException;
}
