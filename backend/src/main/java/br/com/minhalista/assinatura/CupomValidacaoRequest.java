package br.com.minhalista.assinatura;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CupomValidacaoRequest(
    @NotBlank(message = "Informe o código do cupom.")
    @Pattern(
        regexp = "[A-Za-z0-9_-]{3,30}",
        message = "O código do cupom é inválido."
    )
    String codigo,

    @NotNull(message = "Informe o ciclo da assinatura.")
    CicloAssinatura ciclo
) {
}
