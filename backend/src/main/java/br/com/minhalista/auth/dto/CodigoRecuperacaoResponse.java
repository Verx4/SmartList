package br.com.minhalista.auth.dto;

public record CodigoRecuperacaoResponse(
    String token,
    long expiraEmSegundos
) {
}
