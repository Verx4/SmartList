package br.com.minhalista.nota;

import java.math.BigDecimal;

public record ItemNotaResponse(
    String nome,
    BigDecimal quantidade,
    String unidade,
    BigDecimal valorUnitario,
    BigDecimal valorTotal
) {
}
