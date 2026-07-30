package br.com.minhalista.encarte;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OfertaExtraida(
    String produto,
    String categoria,
    String marca,
    String pesoVolume,
    BigDecimal quantidadeEmbalagem,
    String unidadeMedida,
    BigDecimal precoPromocional,
    BigDecimal precoAnterior,
    String condicaoEspecial,
    LocalDate validaDe,
    LocalDate validaAte,
    BigDecimal confianca
) {
}
