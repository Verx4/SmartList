package br.com.minhalista.despensa;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ItemCompraDespensaRequest(
    @NotBlank(message = "Informe o produto comprado.")
    @Size(max = 160)
    String nome,

    @DecimalMin(value = "0.000", inclusive = false)
    BigDecimal quantidade,

    @NotBlank
    @Size(max = 30)
    String unidade
) { }
