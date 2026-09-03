package br.com.minhalista.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarSenhaRequest(
    @NotBlank(message = "Informe a senha atual.")
    @Size(max = 72, message = "A senha atual deve possuir no máximo 72 caracteres.")
    String senhaAtual,

    @NotBlank(message = "Informe a nova senha.")
    @Size(min = 6, max = 72, message = "A nova senha deve possuir entre 6 e 72 caracteres.")
    String novaSenha
) {
}
