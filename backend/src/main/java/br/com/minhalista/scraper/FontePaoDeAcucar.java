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
public class FontePaoDeAcucar implements FontePrecoMercado {

    private static final String BASE = "https://www.paodeacucar.com";
    private static final Pattern PRECO = Pattern.compile(
        "Pre[cç]o\\s*R\\$\\s*([0-9.]+,[0-9]{2})",
        Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    @Override
    public String mercado() {
        return "Pão de Açúcar";
    }

    @Override
    public List<FontePrecoResultado> buscar(String produto, String cidade) throws IOException {
        String url = BASE + "/busca?terms=" + URLEncoder.encode(produto, StandardCharsets.UTF_8);
        return extrair(FonteHtml.carregar(url));
    }

    List<FontePrecoResultado> extrair(Document documento) {
        List<FontePrecoResultado> resultados = new ArrayList<>();
        for (Element link : documento.select("a[aria-label*=Preço][href*=/produto/]")) {
            Matcher matcher = PRECO.matcher(link.attr("aria-label"));
            String nome = link.hasAttr("title") ? link.attr("title").trim() : link.text().trim();
            if (!matcher.find() || nome.isBlank()) {
                continue;
            }
            BigDecimal preco = new BigDecimal(matcher.group(1).replace(".", "").replace(',', '.'));
            resultados.add(new FontePrecoResultado(nome, mercado(), preco, link.absUrl("href")));
            if (resultados.size() == 12) {
                break;
            }
        }
        return resultados;
    }
}
