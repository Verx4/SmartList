package br.com.minhalista.admin;

public record LimparAuditoriaResponse(
    long registrosRemovidos,
    String mensagem
) {
}
