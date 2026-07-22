package br.com.minhalista.comparacao;

public record RedeMercadoResponse(
    String nome,
    boolean coletaPublica,
    String situacao
) {
}
