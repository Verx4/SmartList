package br.com.minhalista.sugestao;

import jakarta.validation.constraints.NotNull;

public record SugestaoStatusRequest(
    @NotNull SugestaoStatus status
) {
}
