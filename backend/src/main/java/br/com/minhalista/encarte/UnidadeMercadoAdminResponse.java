package br.com.minhalista.encarte;

import java.util.UUID;

public record UnidadeMercadoAdminResponse(
    UUID id,
    String chaveExterna,
    String rede,
    String nome,
    String endereco,
    String bairro,
    String cidade,
    String estado,
    Double latitude,
    Double longitude,
    boolean ativa
) {
}
