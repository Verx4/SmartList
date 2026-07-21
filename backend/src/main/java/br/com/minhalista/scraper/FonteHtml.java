package br.com.minhalista.scraper;

import java.io.IOException;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

final class FonteHtml {

    private FonteHtml() {
    }

    static Document carregar(String url) throws IOException {
        return Jsoup.connect(url)
            .userAgent("SmartList-PriceMonitor/1.0 (+https://minha-lista-app.vercel.app)")
            .referrer("https://www.google.com/")
            .timeout(15_000)
            .maxBodySize(2_500_000)
            .followRedirects(true)
            .get();
    }
}

