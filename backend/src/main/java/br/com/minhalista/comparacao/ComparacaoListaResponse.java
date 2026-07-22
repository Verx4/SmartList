package br.com.minhalista.comparacao;

import java.time.Instant;
import java.util.List;

public record ComparacaoListaResponse(
    String melhorMercado,
    String aviso,
    Instant atualizadoEm,
    List<MercadoComparacaoResponse> mercados
) {
}
