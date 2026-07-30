package br.com.minhalista.encarte;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record FonteEncarteAdminRequest(
    @NotNull UUID unidadeId,
    @NotBlank @Size(max = 140) String nome,
    @NotBlank @Size(max = 1200) String url,
    @NotNull TipoEncarte tipo,
    boolean ativa
) {
}
