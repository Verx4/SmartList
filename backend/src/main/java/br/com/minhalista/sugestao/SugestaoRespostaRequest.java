package br.com.minhalista.sugestao;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SugestaoRespostaRequest(
    @NotBlank
    @Size(max = 2000)
    String resposta
) {
}
