package br.com.minhalista.assinatura;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConfirmarPagamentoRequest(
    @NotBlank(message = "Informe o identificador do pagamento.")
    @Pattern(
        regexp = "[0-9]{1,30}",
        message = "O identificador do pagamento é inválido."
    )
    String pagamentoId
) {
}
