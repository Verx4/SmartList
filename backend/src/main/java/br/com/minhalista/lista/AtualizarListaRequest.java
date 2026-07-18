package br.com.minhalista.lista;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

public record AtualizarListaRequest(
    @Size(max = 120, message = "O nome da lista deve possuir no máximo 120 caracteres.")
    String nome,

    @DecimalMin(value = "0.00", message = "O orçamento não pode ser negativo.")
    BigDecimal orcamento,

    UUID mercadoId
) {
}
