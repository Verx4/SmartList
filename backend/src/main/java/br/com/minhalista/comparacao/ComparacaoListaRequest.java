package br.com.minhalista.comparacao;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record ComparacaoListaRequest(
    @NotEmpty(message = "Sua lista está vazia.")
    @Size(max = 80, message = "Compare no máximo 80 itens por vez.")
    List<@Valid ItemListaComparacaoRequest> itens,

    @NotEmpty(message = "Selecione pelo menos um mercado.")
    @Size(max = 12)
    List<@Size(max = 80) String> mercados,

    @Size(max = 100)
    String cidade
) {
}
