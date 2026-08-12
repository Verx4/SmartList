package br.com.minhalista.despensa;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ItemDespensaResponse(
    UUID id,
    String nome,
    String chaveProduto,
    BigDecimal quantidade,
    String unidade,
    Instant atualizadoEm
) {
    public static ItemDespensaResponse de(ItemDespensa item) {
        return new ItemDespensaResponse(
            item.getId(),
            item.getNome(),
            item.getChaveProduto(),
            item.getQuantidade(),
            item.getUnidade(),
            item.getAtualizadoEm()
        );
    }
}
