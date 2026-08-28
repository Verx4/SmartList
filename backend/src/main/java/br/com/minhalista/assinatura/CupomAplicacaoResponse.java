package br.com.minhalista.assinatura;

import java.math.BigDecimal;

public record CupomAplicacaoResponse(
    String codigo,
    BigDecimal percentualDesconto,
    BigDecimal valorOriginal,
    BigDecimal desconto,
    BigDecimal total,
    CicloAssinatura cicloPermitido,
    boolean primeiraCobrancaSomente
) {
}
