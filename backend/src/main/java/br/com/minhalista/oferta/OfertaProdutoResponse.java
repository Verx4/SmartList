package br.com.minhalista.oferta;

import java.util.List;

public record OfertaProdutoResponse(
    String produtoProcurado,
    List<OfertaResponse> ofertas
) {
}
