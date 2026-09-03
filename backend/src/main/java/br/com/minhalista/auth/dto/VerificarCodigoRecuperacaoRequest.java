package br.com.minhalista.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerificarCodigoRecuperacaoRequest(
    @NotBlank(message = "Informe seu e-mail.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 180, message = "O e-mail é muito longo.")
    String email,

    @NotBlank(message = "Informe o código de recuperação.")
    @Pattern(regexp = "^[0-9]{6}$", message = "Informe o código de 6 dígitos.")
    String codigo
) {
}
