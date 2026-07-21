package br.com.minhalista.scraper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class FonteAtacarejoRecife implements FontePrecoMercado {

    private static final String BASE = "https://www.recifeatacarejo.com.br";

    @Override
    public String mercado() {
        return "Recife Atacarejo";
    }

    @Override
    public List<String> aliases() {
        return List.of("Recife Atacarejo", "Atacarejo Recife");
    }

    @Override
    public List<FontePrecoResultado> buscar(String produto, String cidade) throws IOException {
        if (cidade != null && !cidade.isBlank()
            && !NormalizadorMercado.normalizar(cidade).contains("recife")) {
            return List.of();
        }

        String url = BASE + "/busca?s=" + URLEncoder.encode(produto, StandardCharsets.UTF_8);
        return extrair(FonteHtml.carregar(url), url);
    }

    List<FontePrecoResultado> extrair(Document documento, String urlPesquisa) {
        List<FontePrecoResultado> resultados = new ArrayList<>();
        for (Element card : documento.select(".product-card__info[data-nome][data-preco]")) {
            String nome = card.attr("data-nome").trim();
            String preco = card.attr("data-preco").trim().replace(',', '.');
            if (nome.isBlank() || !preco.matches("\\d+(?:\\.\\d{1,2})?")) {
                continue;
            }
            Element link = card.selectFirst("a[href]");
            String fonte = link == null ? urlPesquisa : link.absUrl("href");
            resultados.add(new FontePrecoResultado(nome, mercado(), new BigDecimal(preco), fonte));
            if (resultados.size() == 12) {
                break;
            }
        }
        return resultados;
    }
}

