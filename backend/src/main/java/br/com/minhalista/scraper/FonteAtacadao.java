package br.com.minhalista.scraper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class FonteAtacadao implements FontePrecoMercado {

    private static final String BASE = "https://www.atacadao.com.br";
    private static final Pattern PRECO = Pattern.compile("R\\$\\s*([0-9.]+,[0-9]{2})");

    @Override
    public String mercado() {
        return "Atacadão";
    }

    @Override
    public List<FontePrecoResultado> buscar(String produto, String cidade) throws IOException {
        boolean recife = NormalizadorMercado.normalizar(cidade).contains("recife");
        String caminho = recife ? "/loja/avenida-recife?q=" : "/catalogo?q=";
        String url = BASE + caminho + URLEncoder.encode(produto, StandardCharsets.UTF_8);
        return extrair(FonteHtml.carregar(url), url);
    }

    List<FontePrecoResultado> extrair(Document documento, String urlPesquisa) {
        List<FontePrecoResultado> resultados = new ArrayList<>();
        for (Element card : documento.select("article:has([data-testid=product-link])")) {
            Element link = card.selectFirst("[data-testid=product-link]");
            if (link == null) {
                continue;
            }
            String nome = link.hasAttr("title") ? link.attr("title").trim() : link.text().trim();
            Matcher matcher = PRECO.matcher(card.text());
            String ultimoPreco = null;
            while (matcher.find()) {
                ultimoPreco = matcher.group(1);
            }
            if (nome.isBlank() || ultimoPreco == null) {
                continue;
            }
            BigDecimal preco = new BigDecimal(ultimoPreco.replace(".", "").replace(',', '.'));
            String fonte = link.absUrl("href");
            resultados.add(new FontePrecoResultado(nome, mercado(), preco, fonte.isBlank() ? urlPesquisa : fonte));
            if (resultados.size() == 12) {
                break;
            }
        }
        return resultados;
    }
}
