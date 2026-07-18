package br.com.minhalista.admin;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

public record ScraperConfigRequest(
    @NotNull(message = "Informe a margem percentual.")
    BigDecimal margemPercentual
) {
}
