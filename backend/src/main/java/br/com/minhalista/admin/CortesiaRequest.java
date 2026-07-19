package br.com.minhalista.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CortesiaRequest(
    @NotBlank(message = "Informe o e-mail.")
    @Email(message = "Informe um e-mail válido.")
    String email,

    @Min(value = 1, message = "A cortesia deve possuir pelo menos 1 dia.")
    @Max(value = 3650, message = "A cortesia deve possuir no máximo 3650 dias.")
    int dias,

    @NotBlank(message = "Informe o motivo da cortesia.")
    @Size(max = 300, message = "O motivo deve possuir no máximo 300 caracteres.")
    String motivo,

    boolean confirmarAssinaturaAtiva
) {
}
