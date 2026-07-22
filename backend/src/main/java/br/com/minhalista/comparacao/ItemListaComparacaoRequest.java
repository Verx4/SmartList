package br.com.minhalista.comparacao;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ItemListaComparacaoRequest(
    @NotBlank(message = "Informe o nome do item.")
    @Size(max = 180)
    String nome,

    @NotNull(message = "Informe a quantidade.")
    @DecimalMin(value = "0.01")
    @DecimalMax(value = "999")
    BigDecimal quantidade
) {
}
