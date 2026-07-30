package br.com.minhalista.oferta;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record OfertaResponse(
    UUID id,
    String produto,
    String marca,
    String categoria,
    String pesoVolume,
    BigDecimal precoPromocional,
    BigDecimal precoAnterior,
    BigDecimal precoPorUnidadeBase,
    String unidadeBase,
    String condicaoEspecial,
    String mercado,
    String unidade,
    String endereco,
    String bairro,
    String cidade,
    String estado,
    Double distanciaKm,
    LocalDate validaAte,
    Instant capturadaEm,
    BigDecimal confianca
) {
}
