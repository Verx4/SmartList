package br.com.minhalista.oferta;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DistanciasTest {

    @Test
    void calculaDistanciaSemExporRotaOuRastreamento() {
        double distancia = Distancias.emQuilometros(
            -8.0476,
            -34.8770,
            -8.0578,
            -34.8829
        );

        assertThat(distancia).isBetween(1.0, 2.0);
    }
}
