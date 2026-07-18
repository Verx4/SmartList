package br.com.minhalista.admin;

import java.math.BigDecimal;

public record ScraperConfigResponse(
    BigDecimal margemPercentual,
    String regra,
    boolean preservaPrecoOriginal
) {
}
