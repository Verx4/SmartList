package br.com.minhalista.assinatura;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record BrickCheckoutRequest(
    @NotNull(message = "Informe o ciclo da assinatura.")
    CicloAssinatura ciclo,

    @Pattern(
        regexp = "[A-Za-z0-9_-]{1,30}",
        message = "O código do cupom é inválido."
    )
    String cupom,

    @NotBlank(message = "Informe o meio de pagamento selecionado.")
    String selectedPaymentMethod,

    @NotNull(message = "Os dados do pagamento são obrigatórios.")
    Map<String, Object> formData
) {
}
