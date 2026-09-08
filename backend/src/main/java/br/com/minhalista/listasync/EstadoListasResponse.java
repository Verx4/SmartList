package br.com.minhalista.listasync;

import java.time.Instant;

public record EstadoListasResponse(
    String conteudo,
    long versao,
    Instant atualizadoEm
) {
    public static EstadoListasResponse vazio() {
        return new EstadoListasResponse(null, 0, null);
    }

    public static EstadoListasResponse de(EstadoListasUsuario estado) {
        return new EstadoListasResponse(
            estado.getConteudoJson(),
            estado.getVersao(),
            estado.getAtualizadoEm()
        );
    }
}
