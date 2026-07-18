package br.com.minhalista.scraper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PrecoColetadoResponse(
    UUID id,
    String produto,
    String mercado,
    BigDecimal precoOriginal,
    BigDecimal margemPercentual,
    BigDecimal precoMinimo,
    BigDecimal precoMaximo,
    String nivelConfianca,
    String urlFonte,
    Instant coletadoEm
) {
    public static PrecoColetadoResponse de(PrecoColetado preco) {
        return new PrecoColetadoResponse(
            preco.getId(),
            preco.getProduto(),
            preco.getMercado(),
            preco.getPrecoOriginal(),
            preco.getMargemPercentual(),
            preco.getPrecoMinimo(),
            preco.getPrecoMaximo(),
            preco.getNivelConfianca().name(),
            preco.getUrlFonte(),
            preco.getColetadoEm()
        );
    }
}
