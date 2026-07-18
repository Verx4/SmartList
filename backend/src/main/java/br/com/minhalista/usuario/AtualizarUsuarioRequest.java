package br.com.minhalista.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AtualizarUsuarioRequest(
    @NotBlank(message = "Informe o nome.")
    @Size(min = 2, max = 120, message = "O nome deve possuir entre 2 e 120 caracteres.")
    String nome,

    @Size(max = 30, message = "O telefone deve possuir no máximo 30 caracteres.")
    @Pattern(
        regexp = "^$|^[0-9()+\\-\\s]{8,30}$",
        message = "Informe um telefone válido."
    )
    String telefone,

    @Size(max = 100, message = "A cidade deve possuir no máximo 100 caracteres.")
    String cidade,

    @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Informe um estado válido.")
    String estado,

    boolean notificarPromocoes,
    boolean notificarPrecos
) {
}
