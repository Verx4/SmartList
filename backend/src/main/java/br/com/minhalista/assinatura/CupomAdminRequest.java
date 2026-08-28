package br.com.minhalista.assinatura;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CupomAdminRequest(
    @NotBlank(message = "Informe o código do cupom.")
    @Pattern(
        regexp = "[A-Za-z0-9_-]{1,30}",
        message = "Use de 1 a 30 letras, números, hífen ou sublinhado no cupom."
    )
    String codigo,

    @NotNull(message = "Informe o percentual de desconto.")
    @DecimalMin(value = "0.01", message = "O desconto deve ser maior que zero.")
    @DecimalMax(value = "90.00", message = "O desconto máximo é de 90%.")
    BigDecimal percentualDesconto,

    boolean ativo
) {
}
