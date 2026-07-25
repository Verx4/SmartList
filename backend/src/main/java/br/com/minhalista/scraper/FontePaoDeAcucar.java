package br.com.minhalista.scraper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class FontePaoDeAcucar implements FontePrecoMercado {

    private static final String BASE = "https://www.paodeacucar.com";
    private static final Pattern PRECO = Pattern.compile(
        "(?:Pre[cç]o\\s*)?R\\$\\s*([0-9.]+,[0-9]{2})",
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
        Set<String> linksUsados = new HashSet<>();
        for (Element link : documento.select("a[href*=/produto/]")) {
            Element card = link.closest("article, li, [data-testid*=product], [class*=product]");
            String contexto = link.attr("aria-label") + " " + (card == null ? link.text() : card.text());
            Matcher matcher = PRECO.matcher(contexto);
            String nome = link.attr("title").trim();
            if (nome.isBlank() && card != null) {
                Element titulo = card.selectFirst("[data-testid*=name], h2, h3, [class*=name], [class*=title]");
                nome = titulo == null ? "" : titulo.text().trim();
            }
            if (nome.isBlank()) {
                nome = link.attr("aria-label")
                    .replaceFirst("(?i)\\.?\\s*Pre[cç]o\\s*R\\$.*$", "")
                    .trim();
            }
            if (nome.isBlank()) nome = link.text().trim();
            if (!matcher.find() || nome.isBlank()) {
                continue;
            }
            String fonte = link.absUrl("href");
            if (!linksUsados.add(fonte.isBlank() ? nome : fonte)) continue;
            BigDecimal preco = new BigDecimal(matcher.group(1).replace(".", "").replace(',', '.'));
            resultados.add(new FontePrecoResultado(nome, mercado(), preco,
                fonte.isBlank() ? documento.baseUri() : fonte));
            if (resultados.size() == 12) {
                break;
            }
        }
        return resultados;
    }
}
