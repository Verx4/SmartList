package br.com.minhalista.oferta;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NormalizadorProdutoTest {

    @Test
    void reconheceVariacoesDoMesmoProduto() {
        String oferta = NormalizadorProduto.normalizar("Coca-Cola 2 Litros");

        assertThat(NormalizadorProduto.corresponde("Coca 2L", oferta)).isTrue();
        assertThat(NormalizadorProduto.corresponde("Guaraná 2L", oferta)).isFalse();
    }

    @Test
    void normalizaAcentosEUnidades() {
        assertThat(NormalizadorProduto.normalizar("Açúcar 1 Quilo"))
            .isEqualTo("1kg acucar");
    }
}
