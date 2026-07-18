package br.com.minhalista.scraper;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PrecoColetadoRequest(
    @NotBlank(message = "Informe o produto.")
    @Size(max = 180)
    String produto,

    @NotBlank(message = "Informe o mercado.")
    @Size(max = 140)
    String mercado,

    @NotNull(message = "Informe o preço original.")
    @DecimalMin(value = "0.01", message = "O preço deve ser maior que zero.")
    BigDecimal precoOriginal,

    @NotNull(message = "Informe o nível de confiança.")
    NivelConfianca nivelConfianca,

    @Size(max = 1000)
    String urlFonte
) {
}
