package br.com.minhalista.mercado;

import jakarta.validation.constraints.NotNull;

public record FavoritoRequest(
    @NotNull(message = "Informe se o mercado é favorito.")
    Boolean favorito
) {
}
