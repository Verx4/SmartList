package br.com.minhalista.despensa;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ItemDespensaResponse(
    UUID id,
    String nome,
    String chaveProduto,
    BigDecimal quantidade,
    boolean quantidadeConhecida,
    String unidade,
    String categoria,
    Instant atualizadoEm
) {
    public static ItemDespensaResponse de(ItemDespensa item) {
        return new ItemDespensaResponse(
            item.getId(),
            item.getNome(),
            item.getChaveProduto(),
            item.isQuantidadeConhecida() ? item.getQuantidade() : null,
            item.isQuantidadeConhecida(),
            item.getUnidade(),
            item.getCategoria(),
            item.getAtualizadoEm()
        );
    }
}
