package br.com.minhalista.scraper;

import java.math.BigDecimal;

public record FontePrecoResultado(
    String produto,
    String mercado,
    BigDecimal preco,
    String urlFonte
) {
}
