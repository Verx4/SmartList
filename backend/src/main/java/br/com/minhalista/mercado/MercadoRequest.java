package br.com.minhalista.mercado;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MercadoRequest(
    @NotBlank(message = "Informe o nome do mercado.")
    @Size(max = 120, message = "O nome deve possuir no máximo 120 caracteres.")
    String nome,

    @Size(max = 100, message = "A cidade deve possuir no máximo 100 caracteres.")
    String cidade,

    @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Informe a UF com duas letras.")
    String estado,

    Double latitude,
    Double longitude,
    Boolean favorito
) {
}
