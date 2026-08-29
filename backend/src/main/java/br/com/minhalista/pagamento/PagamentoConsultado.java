package br.com.minhalista.pagamento;

import java.math.BigDecimal;

public record PagamentoConsultado(
    String id,
    String status,
    String statusDetalhe,
    String metodoPagamento,
    String tipoPagamento,
    String referenciaExterna,
    String assinaturaIdMetadata,
    String cicloMetadata,
    BigDecimal valor,
    String moeda,
    boolean ambienteProducao
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
            null,
            null,
            null,
            referenciaExterna,
            assinaturaIdMetadata,
            cicloMetadata,
            valor,
            moeda,
            ambienteProducao
        );
    }
}
