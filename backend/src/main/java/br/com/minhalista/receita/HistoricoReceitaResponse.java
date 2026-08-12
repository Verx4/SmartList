package br.com.minhalista.receita;

import java.time.Instant;
import java.util.UUID;

public record HistoricoReceitaResponse(
    UUID id,
    String receitaId,
    String receita,
    boolean despensaAtualizada,
    Instant preparadaEm
) {
    public static HistoricoReceitaResponse de(HistoricoReceita item) {
        return new HistoricoReceitaResponse(
            item.getId(),
            item.getReceita().getId(),
            item.getReceita().getNome(),
            item.isDespensaAtualizada(),
            item.getPreparadaEm()
        );
    }
}
