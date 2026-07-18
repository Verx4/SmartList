package br.com.minhalista.mercado;

import java.util.UUID;

public record MercadoResponse(
    UUID id,
    String nome,
    String cidade,
    String estado,
    Double latitude,
    Double longitude,
    boolean favorito,
    boolean ativo
) {
    public static MercadoResponse de(Mercado mercado) {
        return new MercadoResponse(
            mercado.getId(),
            mercado.getNome(),
            mercado.getCidade(),
            mercado.getEstado(),
            mercado.getLatitude(),
            mercado.getLongitude(),
            mercado.isFavorito(),
            mercado.isAtivo()
        );
    }
}
