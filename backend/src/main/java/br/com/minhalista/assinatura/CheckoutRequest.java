package br.com.minhalista.assinatura;

import jakarta.validation.constraints.NotNull;

public record CheckoutRequest(
    @NotNull(message = "Informe o ciclo da assinatura.")
    CicloAssinatura ciclo,

    @jakarta.validation.constraints.Pattern(
        regexp = "[A-Za-z0-9_-]{3,30}",
        message = "O código do cupom é inválido."
    )
    String cupom
) {
}
