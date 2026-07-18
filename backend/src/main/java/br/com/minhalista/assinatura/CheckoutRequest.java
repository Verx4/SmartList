package br.com.minhalista.assinatura;

import jakarta.validation.constraints.NotNull;

public record CheckoutRequest(
    @NotNull(message = "Informe o ciclo da assinatura.")
    CicloAssinatura ciclo
) {
}
