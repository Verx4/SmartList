package br.com.minhalista.encarte;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UnidadeMercadoAdminRequest(
    @Size(max = 180) String chaveExterna,
    @NotBlank @Size(max = 120) String rede,
    @NotBlank @Size(max = 140) String nome,
    @NotBlank @Size(max = 240) String endereco,
    @Size(max = 100) String bairro,
    @NotBlank @Size(max = 100) String cidade,
    @NotBlank @Size(min = 2, max = 2) String estado,
    @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
    @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
    boolean ativa
) {
}
