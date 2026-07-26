package br.com.minhalista.scraper;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class FonteCarrefour implements FontePrecoMercado {

    private static final String BASE = "https://mercado.carrefour.com.br";
    private static final Pattern PRECO = Pattern.compile("R\\$\\s*([0-9.]+,[0-9]{2})");

    @Override
    public String mercado() {
        return "Carrefour";
    }

    @Override
    public List<FontePrecoResultado> buscar(String produto, String cidade) throws IOException {
        String slug = Normalizer.normalize(produto, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        String url = BASE + "/" + slug + "?_q="
            + URLEncoder.encode(produto, StandardCharsets.UTF_8) + "&map=ft";
        return extrair(FonteHtml.carregar(url), url);
    }

    List<FontePrecoResultado> extrair(Document documento, String urlPesquisa) {
        List<FontePrecoResultado> resultados = new ArrayList<>();
        Set<String> linksUsados = new HashSet<>();
        for (Element link : documento.select("a[href*='/produto/']")) {
            String fonte = link.absUrl("href");
            if (!linksUsados.add(fonte)) continue;
            Element card = link.closest("article, li, [data-testid*=product], [class*=product]");
            if (card == null) card = link.parent();
            String contexto = card == null ? link.text() : card.text();
            Matcher matcher = PRECO.matcher(contexto);
            String ultimoPreco = null;
            while (matcher.find()) ultimoPreco = matcher.group(1);
            String nome = nomeProduto(link, card);
            if (nome.isBlank() || ultimoPreco == null) continue;
            resultados.add(new FontePrecoResultado(
                nome,
                mercado(),
                new BigDecimal(ultimoPreco.replace(".", "").replace(',', '.')),
                fonte.isBlank() ? urlPesquisa : fonte
            ));
            if (resultados.size() == 12) break;
        }
        return resultados;
    }

    private String nomeProduto(Element link, Element card) {
        Element imagem = link.selectFirst("img[alt]");
        if (imagem != null && !imagem.attr("alt").isBlank()) return imagem.attr("alt").trim();
        Element titulo = card == null ? null : card.selectFirst("h2, h3, [data-testid*=name], [class*=name], [class*=title]");
        if (titulo != null && !titulo.text().isBlank()) return titulo.text().trim();
        return link.text().replaceFirst("(?s)R\\$.*$", "").trim();
    }
}

