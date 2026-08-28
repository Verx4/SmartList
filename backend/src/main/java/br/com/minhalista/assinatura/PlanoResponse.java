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
        return de(ciclo, ciclo.getValor());
    }

    public static PlanoResponse de(CicloAssinatura ciclo, BigDecimal valor) {
        return new PlanoResponse(
            "PREMIUM",
            ciclo.name(),
            ciclo.getNome(),
            valor,
            ciclo.getMeses()
        );
    }
}
