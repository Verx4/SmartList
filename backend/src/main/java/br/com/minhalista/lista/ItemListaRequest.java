package br.com.minhalista.lista;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ItemListaRequest(
    @NotBlank(message = "Informe o nome do produto.")
    @Size(max = 160, message = "O nome do produto deve possuir no máximo 160 caracteres.")
    String nome,

    @Size(max = 80, message = "A categoria deve possuir no máximo 80 caracteres.")
    String categoria,

    @Min(value = 1, message = "A quantidade mínima é 1.")
    @Max(value = 9999, message = "A quantidade é muito alta.")
    Integer quantidade,

    @DecimalMin(value = "0.00", message = "O preço não pode ser negativo.")
    BigDecimal preco,

    @DecimalMin(value = "0.000", message = "O peso não pode ser negativo.")
    BigDecimal peso,

    Boolean favorito
) {
}
