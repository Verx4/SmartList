package br.com.minhalista.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AdministradorRequest(
    @NotBlank(message = "Informe o e-mail do novo administrador.")
    @Email(message = "Informe um e-mail válido.")
    String email
) {
}
