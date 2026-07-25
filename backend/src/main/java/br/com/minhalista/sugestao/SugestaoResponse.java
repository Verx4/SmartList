package br.com.minhalista.sugestao;

import java.time.Instant;
import java.util.UUID;

public record SugestaoResponse(
    UUID id,
    String usuarioNome,
    String usuarioEmail,
    String categoria,
    String titulo,
    String descricao,
    int votos,
    SugestaoStatus status,
    Instant criadoEm
) {
    static SugestaoResponse de(Sugestao sugestao) {
        return new SugestaoResponse(
            sugestao.getId(),
            sugestao.getUsuarioNome(),
            sugestao.getUsuarioEmail(),
            sugestao.getCategoria(),
            sugestao.getTitulo(),
            sugestao.getDescricao(),
            sugestao.getVotos(),
            sugestao.getStatus(),
            sugestao.getCriadoEm()
        );
    }
}
