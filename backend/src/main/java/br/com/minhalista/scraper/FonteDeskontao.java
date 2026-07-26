package br.com.minhalista.scraper;

import java.io.IOException;
import java.math.BigDecimal;
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
public class FonteDeskontao implements FontePrecoMercado {

    private static final String BASE = "https://www.deskontao.com.br/";
    private static final Pattern LINK_PRODUTO = Pattern.compile(".+-\\d+-1007/?(?:\\?.*)?$");
    private static final Pattern PRECO = Pattern.compile("R\\$\\s*([0-9.]+,[0-9]{2})");

    @Override
    public String mercado() {
        return "Deskontão";
    }

    @Override
    public List<FontePrecoResultado> buscar(String produto, String cidade) throws IOException {
        String cidadeNormalizada = NormalizadorMercado.normalizar(cidade);
        if (!cidadeNormalizada.isBlank()
            && List.of("recife", "olinda", "jaboatao", "camaragibe", "paulista")
                .stream().noneMatch(cidadeNormalizada::contains)) {
            return List.of();
        }
        return extrair(FonteHtml.carregarPost(BASE, "s", produto));
    }

    List<FontePrecoResultado> extrair(Document documento) {
        List<FontePrecoResultado> resultados = new ArrayList<>();
        Set<String> linksUsados = new HashSet<>();
        for (Element link : documento.select("a[href]")) {
            String fonte = link.absUrl("href");
            if (!LINK_PRODUTO.matcher(fonte).matches() || !linksUsados.add(fonte)) {
                continue;
            }
            Element card = encontrarCard(link);
            String contexto = card == null ? link.parent().text() : card.text();
            Matcher matcher = PRECO.matcher(contexto);
            String ultimoPreco = null;
            while (matcher.find()) ultimoPreco = matcher.group(1);
            String nome = nomeProduto(link, card);
            if (nome.isBlank() || ultimoPreco == null) {
                continue;
            }
            resultados.add(new FontePrecoResultado(
                nome,
                mercado(),
                new BigDecimal(ultimoPreco.replace(".", "").replace(',', '.')),
                fonte
            ));
            if (resultados.size() == 12) break;
        }
        return resultados;
    }

    private Element encontrarCard(Element link) {
        Element atual = link;
        for (int nivel = 0; atual != null && nivel < 6; nivel++, atual = atual.parent()) {
            if (PRECO.matcher(atual.text()).find()) return atual;
        }
        return link.parent();
    }

    private String nomeProduto(Element link, Element card) {
        Element imagem = link.selectFirst("img[alt]");
        if (imagem != null && !imagem.attr("alt").isBlank()) return imagem.attr("alt").trim();
        Element titulo = card == null ? null : card.selectFirst("h2, h3, h4, [class*=name], [class*=title]");
        if (titulo != null && !titulo.text().isBlank()) return titulo.text().trim();
        return link.text().replaceFirst("(?s)R\\$.*$", "").trim();
    }
}

