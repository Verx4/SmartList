package br.com.minhalista.nota;

import java.math.BigDecimal;
import java.util.List;

public record NotaFiscalResponse(
    String chaveAcesso,
    String mercado,
    BigDecimal valorTotal,
    List<ItemNotaResponse> itens
) {
}

