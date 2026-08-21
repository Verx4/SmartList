package br.com.minhalista.pagamento;

import java.math.BigDecimal;

public record PagamentoConsultado(
    String id,
    String status,
    String referenciaExterna,
    String assinaturaIdMetadata,
    String cicloMetadata,
    BigDecimal valor,
    String moeda,
    boolean ambienteProducao
) {
}
