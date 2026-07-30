package br.com.minhalista.localizacao;

public record LocalizacaoAtiva(
    Double latitude,
    Double longitude,
    String bairro,
    String cidade,
    String estado
) {
}
