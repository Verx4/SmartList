package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AssinaturaResponse(
    UUID id,
    String ciclo,
    String status,
    BigDecimal valor,
    Instant inicioEm,
    Instant venceEm
) {
    public static AssinaturaResponse de(Assinatura assinatura) {
        return new AssinaturaResponse(
            assinatura.getId(),
            assinatura.getCiclo().name(),
            assinatura.getStatus().name(),
            assinatura.getValor(),
            assinatura.getInicioEm(),
            assinatura.getVenceEm()
        );
    }
}
