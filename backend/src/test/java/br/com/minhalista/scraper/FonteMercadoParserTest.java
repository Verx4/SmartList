package br.com.minhalista.scraper;

import static org.assertj.core.api.Assertions.assertThat;

import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

class FonteMercadoParserTest {

    @Test
    void extraiPrecoDoPaoDeAcucarSemImagem() {
        var documento = Jsoup.parse("""
            <main><a href="https://www.paodeacucar.com/produto/1/arroz"
              title="Arroz Tipo 1 1kg"
              aria-label="Arroz Tipo 1 1kg. Preço R$ 6,99">Arroz Tipo 1 1kg</a></main>
            """, "https://www.paodeacucar.com/busca?terms=arroz");

        var resultados = new FontePaoDeAcucar().extrair(documento);

        assertThat(resultados).hasSize(1);
        assertThat(resultados.getFirst().produto()).isEqualTo("Arroz Tipo 1 1kg");
        assertThat(resultados.getFirst().preco()).isEqualByComparingTo("6.99");
    }

    @Test
    void extraiPrecoDoRecifeAtacarejo() {
        var documento = Jsoup.parse("""
            <div class="product-card__info" data-nome="ARROZ PARBOILIZADO 1KG" data-preco="4.99">
              <a href="/produto/arroz">Arroz</a>
            </div>
            """, "https://www.recifeatacarejo.com.br/busca?s=arroz");

        var resultados = new FonteAtacarejoRecife().extrair(documento, documento.baseUri());

        assertThat(resultados).hasSize(1);
        assertThat(resultados.getFirst().preco()).isEqualByComparingTo("4.99");
    }

    @Test
    void usaPrecoUnitarioDoAtacadaoEmVezDoAtacado() {
        var documento = Jsoup.parse("""
            <article><a data-testid="product-link" title="Arroz Branco 5kg" href="/arroz/p">Arroz Branco 5kg</a>
              <p>A partir de 6 unid. R$ 18,35</p><p>ou R$ 18,85 / cada</p>
            </article>
            """, "https://www.atacadao.com.br/catalogo?q=arroz");

        var resultados = new FonteAtacadao().extrair(documento, documento.baseUri());

        assertThat(resultados).hasSize(1);
        assertThat(resultados.getFirst().preco()).isEqualByComparingTo("18.85");
    }
}
