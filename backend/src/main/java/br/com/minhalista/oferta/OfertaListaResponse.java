package br.com.minhalista.oferta;

import java.time.Instant;
import java.util.List;

public record OfertaListaResponse(
    Instant consultadaEm,
    String aviso,
    List<OfertaProdutoResponse> produtos
) {
}
