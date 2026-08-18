package br.com.minhalista.pagamento;

import java.math.BigDecimal;
import java.time.Instant;

public record PagamentoConsultado(
    String id,
    String status,
    String referenciaExterna,
    String assinaturaIdMetadata,
    String cicloMetadata,
    String usuarioIdMetadata,
    String planIdMetadata,
    String paymentPublicIdMetadata,
    BigDecimal valor,
    String moeda,
    String formaPagamento,
    boolean ambienteProducao,
    Instant aprovadoEm,
    Instant expiraEm
) {
    public PagamentoConsultado(
        String id,
        String status,
        String referenciaExterna,
        String assinaturaIdMetadata,
        String cicloMetadata,
        BigDecimal valor,
        String moeda,
        boolean ambienteProducao
    ) {
        this(
            id,
            status,
            referenciaExterna,
            assinaturaIdMetadata,
            cicloMetadata,
            null,
            null,
            null,
            valor,
            moeda,
            null,
            ambienteProducao,
            null,
            null
        );
    }
}
