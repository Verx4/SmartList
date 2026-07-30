package br.com.minhalista.oferta;

import java.util.UUID;

public record UnidadeProximaResponse(
    UUID id,
    String rede,
    String unidade,
    String endereco,
    String bairro,
    String cidade,
    String estado,
    double distanciaKm
) {
}
