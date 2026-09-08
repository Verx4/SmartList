package br.com.minhalista.listasync;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AtualizarEstadoListasRequest(
    @NotBlank(message = "Os dados das listas são obrigatórios.")
    @Size(max = 1_000_000, message = "Os dados das listas ultrapassaram o limite permitido.")
    String conteudo,

    @PositiveOrZero(message = "A versão das listas não pode ser negativa.")
    Long versaoBase
) {
}
