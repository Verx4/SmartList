package br.com.minhalista.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
    @NotBlank(message = "O token de recuperação é obrigatório.")
    @Size(max = 200, message = "O token de recuperação é inválido.")
    String token,

    @NotBlank(message = "Informe a nova senha.")
    @Size(min = 6, max = 72, message = "A nova senha deve possuir entre 6 e 72 caracteres.")
    String novaSenha,

    @NotBlank(message = "Confirme a nova senha.")
    @Size(min = 6, max = 72, message = "A confirmação deve possuir entre 6 e 72 caracteres.")
    String confirmarSenha
) {
}
