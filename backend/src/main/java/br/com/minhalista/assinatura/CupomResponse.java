package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CupomResponse(
    UUID id,
    String codigo,
    BigDecimal percentualDesconto,
    boolean ativo,
    Instant criadoEm
) {
    public static CupomResponse de(Cupom cupom) {
        return new CupomResponse(
            cupom.getId(),
            cupom.getCodigo(),
            cupom.getPercentualDesconto(),
            cupom.isAtivo(),
            cupom.getCriadoEm()
        );
    }
}
