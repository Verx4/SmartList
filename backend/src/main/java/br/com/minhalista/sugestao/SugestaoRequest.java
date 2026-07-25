package br.com.minhalista.sugestao;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SugestaoRequest(
    @NotBlank
    @Size(max = 60)
    String categoria,

    @NotBlank
    @Size(max = 120)
    String titulo,

    @NotBlank
    @Size(max = 1500)
    String descricao
) {
}
