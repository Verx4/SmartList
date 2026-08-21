package br.com.minhalista.assinatura;

import java.math.BigDecimal;

public record PlanoResponse(
    String plano,
    String ciclo,
    String nome,
    BigDecimal valor,
    int meses
) {
    public static PlanoResponse de(CicloAssinatura ciclo) {
        return new PlanoResponse(
            "PREMIUM",
            ciclo.name(),
            ciclo.getNome(),
            ciclo.getValor(),
            ciclo.getMeses()
        );
    }
}
