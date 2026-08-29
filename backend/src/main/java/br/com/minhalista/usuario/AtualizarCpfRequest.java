package br.com.minhalista.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AtualizarCpfRequest(
    @NotBlank(message = "Informe seu CPF.")
    @Pattern(
        regexp = "^(?:\\d{11}|\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2})$",
        message = "Informe um CPF válido."
    )
    String cpf
) {
}
