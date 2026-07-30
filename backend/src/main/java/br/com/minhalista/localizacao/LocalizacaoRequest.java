package br.com.minhalista.localizacao;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LocalizacaoRequest(
    @NotNull OrigemLocalizacao origem,
    @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
    @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
    @DecimalMin("0.0") @DecimalMax("10000.0") Double precisaoMetros,
    @Size(max = 100) String bairro,
    @Size(max = 100) String cidade,
    @Size(max = 2) String estado,
    @AssertTrue(message = "É necessário autorizar o uso da localização.")
    boolean consentimento
) {
}
