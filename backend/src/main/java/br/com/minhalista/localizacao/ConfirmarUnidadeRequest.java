package br.com.minhalista.localizacao;

import java.util.UUID;

import jakarta.validation.constraints.NotNull;

public record ConfirmarUnidadeRequest(@NotNull UUID unidadeId) {
}
