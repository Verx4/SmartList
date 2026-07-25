package br.com.minhalista.scraper;

import java.io.IOException;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

final class FonteHtml {

    private static final String NAVEGADOR = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
        + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

    private FonteHtml() {
    }

    static Document carregar(String url) throws IOException {
        return Jsoup.connect(url)
            .userAgent(NAVEGADOR)
            .header("Accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "pt-BR,pt;q=0.9")
            .header("Cache-Control", "no-cache")
            .referrer("https://www.google.com/")
            .timeout(15_000)
            .maxBodySize(2_500_000)
            .followRedirects(true)
            .get();
    }
}
