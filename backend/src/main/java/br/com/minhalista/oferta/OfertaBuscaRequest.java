package br.com.minhalista.oferta;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

public record OfertaBuscaRequest(
    @NotEmpty @Size(max = 80)
    List<@NotBlank @Size(max = 180) String> produtos,
    @Size(max = 120) String mercado,
    @Size(max = 100) String bairro,
    @Size(max = 100) String cidade,
    @Size(max = 100) String categoria,
    @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
    @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
    @DecimalMin("1.0") @DecimalMax("100.0") Double raioKm
) {
}
