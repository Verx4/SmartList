package br.com.minhalista.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecuperarSenhaRequest(
    @NotBlank(message = "Informe seu e-mail.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 180, message = "O e-mail é muito longo.")
    String email
) {
}
