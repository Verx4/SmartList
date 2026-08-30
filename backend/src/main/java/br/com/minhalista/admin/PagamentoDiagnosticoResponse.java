package br.com.minhalista.admin;

import java.math.BigDecimal;

import br.com.minhalista.pagamento.PagamentoConsultado;

public record PagamentoDiagnosticoResponse(
    String pagamentoId,
    String status,
    String statusDetalhe,
    String metodoPagamento,
    String tipoPagamento,
    String referenciaExterna,
    BigDecimal valor,
    String moeda,
    boolean ambienteProducao
) {

    public static PagamentoDiagnosticoResponse de(PagamentoConsultado pagamento) {
        return new PagamentoDiagnosticoResponse(
            pagamento.id(),
            pagamento.status(),
            pagamento.statusDetalhe(),
            pagamento.metodoPagamento(),
            pagamento.tipoPagamento(),
            pagamento.referenciaExterna(),
            pagamento.valor(),
            pagamento.moeda(),
            pagamento.ambienteProducao()
        );
    }
}
