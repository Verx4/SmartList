package br.com.minhalista.comparacao;

import java.math.BigDecimal;
import java.util.List;

public record MercadoComparacaoResponse(
    String mercado,
    BigDecimal total,
    BigDecimal totalMinimo,
    BigDecimal totalMaximo,
    int itensEncontrados,
    int totalItens,
    int coberturaPercentual,
    boolean coberturaCompleta,
    String situacao,
    List<ItemPrecoComparacaoResponse> itens
) {
}
