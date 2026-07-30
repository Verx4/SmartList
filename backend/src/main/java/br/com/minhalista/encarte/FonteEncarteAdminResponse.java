package br.com.minhalista.encarte;

import java.time.Instant;
import java.util.UUID;

public record FonteEncarteAdminResponse(
    UUID id,
    UUID unidadeId,
    String rede,
    String unidade,
    String nome,
    String url,
    TipoEncarte tipo,
    StatusFonteEncarte status,
    boolean ativa,
    Instant verificadaEm,
    Instant processadaEm,
    Instant proximaTentativaEm,
    int ofertasExtraidas,
    String mensagemStatus
) {
}
