package br.com.minhalista.despensa;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ItemDespensaRequest(
    @NotBlank(message = "Informe o produto.")
    @Size(max = 160, message = "O produto deve possuir no máximo 160 caracteres.")
    String nome,

    @DecimalMin(value = "0.000", inclusive = false, message = "A quantidade deve ser maior que zero.")
    BigDecimal quantidade,

    @NotBlank(message = "Informe a unidade.")
    @Size(max = 30, message = "A unidade deve possuir no máximo 30 caracteres.")
    String unidade
) { }
