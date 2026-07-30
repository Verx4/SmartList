package br.com.minhalista.encarte;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class ExtratorHeuristicoOfertaTest {

    private final ExtratorHeuristicoOferta extrator = new ExtratorHeuristicoOferta();

    @Test
    void extraiSomenteLinhaComProdutoEPrecoAssociado() {
        var ofertas = extrator.extrair("""
            Arroz Tio João 1kg R$ 5,99
            Válido até 05/08/2026
            CNPJ 00.000.000/0001-00
            """);

        assertThat(ofertas).hasSize(1);
        assertThat(ofertas.getFirst().produto()).contains("Arroz Tio João");
        assertThat(ofertas.getFirst().precoPromocional()).isEqualByComparingTo("5.99");
        assertThat(ofertas.getFirst().validaAte()).isEqualTo(LocalDate.of(2026, 8, 5));
    }
}
