package br.com.minhalista.auth.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    UsuarioResponse usuario
) {
}
