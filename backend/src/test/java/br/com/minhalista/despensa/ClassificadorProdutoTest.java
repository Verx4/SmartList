package br.com.minhalista.despensa;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ClassificadorProdutoTest {

    private final ClassificadorProduto classificador = new ClassificadorProduto();

    @Test
    void priorizaCategoriaExistenteESeparaItensNaoAlimentares() {
        assertThat(classificador.classificar("Arroz", "🌾 Grãos")).isEqualTo(TipoProduto.FOOD);
        assertThat(classificador.classificar("Suco pronto", "🥤 Bebidas")).isEqualTo(TipoProduto.BEVERAGE);
        assertThat(classificador.classificar("Detergente", "🧼 Limpeza")).isEqualTo(TipoProduto.CLEANING);
        assertThat(classificador.classificar("Shampoo", "🪥 Higiene")).isEqualTo(TipoProduto.HYGIENE);
        assertThat(classificador.classificar("Papel alumínio", "🔌 Utilidades")).isEqualTo(TipoProduto.HOUSEHOLD);
    }

    @Test
    void usaONomeComoFallbackQuandoACategoriaNaoAjuda() {
        assertThat(classificador.classificar("Quinoa", "Outros")).isEqualTo(TipoProduto.FOOD);
        assertThat(classificador.permitidoNaDespensa("Saco de lixo", "Outros")).isFalse();
        assertThat(classificador.permitidoNaDespensa("Cerveja", "Outros")).isFalse();
    }
}
