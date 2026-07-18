package br.com.minhalista.auth.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CadastroRequest(
    @NotBlank(message = "Informe seu nome.")
    @Size(max = 120, message = "O nome deve possuir no máximo 120 caracteres.")
    String nome,

    @NotBlank(message = "Informe seu e-mail.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 180, message = "O e-mail é muito longo.")
    String email,

    @NotBlank(message = "Informe uma senha.")
    @Size(min = 6, max = 72, message = "A senha deve possuir entre 6 e 72 caracteres.")
    String senha,

    @AssertTrue(message = "Você precisa aceitar os Termos de Uso.")
    Boolean aceiteTermos,

    Boolean aceiteMarketing
) {
}
