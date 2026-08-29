package br.com.minhalista.usuario;

import jakarta.validation.constraints.NotBlank;

public record AtualizarCpfRequest(
    @NotBlank(message = "Informe seu CPF.")
    String cpf
) {
}
