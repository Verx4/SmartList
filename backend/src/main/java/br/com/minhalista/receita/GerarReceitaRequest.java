package br.com.minhalista.receita;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GerarReceitaRequest(
    @NotBlank(message = "Informe o que deseja preparar.")
    @Size(max = 100, message = "A busca deve possuir no máximo 100 caracteres.")
    String busca,

    @Valid
    @Size(max = 100, message = "A despensa excedeu o limite de itens.")
    List<ItemDespensaIa> despensa
) {
    public record ItemDespensaIa(
        @NotBlank @Size(max = 160) String nome,
        BigDecimal quantidade,
        @Size(max = 30) String unidade
    ) { }
}
