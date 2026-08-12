package br.com.minhalista.lista;

import java.math.BigDecimal;
import java.util.UUID;

public record ItemListaResponse(
    UUID id,
    String nome,
    String categoria,
    String medida,
    String chaveProduto,
    int quantidade,
    BigDecimal preco,
    BigDecimal peso,
    BigDecimal subtotal,
    boolean favorito
) {
    public static ItemListaResponse de(ItemLista item) {
        return new ItemListaResponse(
            item.getId(),
            item.getNome(),
            item.getCategoria(),
            item.getMedida(),
            item.getChaveProduto(),
            item.getQuantidade(),
            item.getPreco(),
            item.getPeso(),
            item.calcularSubtotal(),
            item.isFavorito()
        );
    }
}
