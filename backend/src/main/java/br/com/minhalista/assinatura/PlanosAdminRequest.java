package br.com.minhalista.assinatura;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record PlanosAdminRequest(
    @NotNull(message = "Informe o valor mensal.")
    @DecimalMin(value = "0.01", message = "O valor mensal deve ser maior que zero.")
    @Digits(integer = 7, fraction = 2, message = "Use no máximo duas casas decimais no valor mensal.")
    BigDecimal mensal,

    @NotNull(message = "Informe o valor trimestral.")
    @DecimalMin(value = "0.01", message = "O valor trimestral deve ser maior que zero.")
    @Digits(integer = 7, fraction = 2, message = "Use no máximo duas casas decimais no valor trimestral.")
    BigDecimal trimestral,

    @NotNull(message = "Informe o valor anual.")
    @DecimalMin(value = "0.01", message = "O valor anual deve ser maior que zero.")
    @Digits(integer = 7, fraction = 2, message = "Use no máximo duas casas decimais no valor anual.")
    BigDecimal anual
) {
}
