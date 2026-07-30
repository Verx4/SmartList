package br.com.minhalista.oferta;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OfertaRegistro(
    UnidadeMercado unidade,
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
    String fonteNome,
    String fonteUrl,
    BigDecimal confianca
) {
}
