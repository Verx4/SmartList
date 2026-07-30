package br.com.minhalista.localizacao;

public record LocalidadeAgregadaResponse(
    String estado,
    String cidade,
    String bairro,
    long usuarios
) {
}
