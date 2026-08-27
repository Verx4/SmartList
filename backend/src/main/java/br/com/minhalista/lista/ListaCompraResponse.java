package br.com.minhalista.lista;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ListaCompraResponse(
    UUID id,
    String nome,
    BigDecimal orcamento,
    BigDecimal total,
    BigDecimal saldoOrcamento,
    BigDecimal economia,
    String status,
    UUID mercadoId,
    String mercado,
    List<ItemListaResponse> itens,
    String criador,
    Instant criadoEm,
    Instant finalizadoEm
) {
}
