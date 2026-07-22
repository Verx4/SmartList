package br.com.minhalista.comparacao;

import java.math.BigDecimal;
import java.time.Instant;

public record ItemPrecoComparacaoResponse(
    String itemLista,
    String produtoEncontrado,
    BigDecimal quantidade,
    BigDecimal precoUnitario,
    BigDecimal subtotal,
    BigDecimal subtotalMinimo,
    BigDecimal subtotalMaximo,
    Instant coletadoEm
) {
}
