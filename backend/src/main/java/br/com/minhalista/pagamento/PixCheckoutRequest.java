package br.com.minhalista.pagamento;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PixCheckoutRequest(
    @NotBlank(message = "Informe o plano.")
    @Pattern(
        regexp = "premium_(monthly|quarterly|yearly)",
        message = "Plano Premium inválido."
    )
    String planId
) {
}
