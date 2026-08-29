package br.com.minhalista.pagamento;

public record PagamentoBrickResultado(
    PagamentoConsultado pagamento,
    String statusDetail,
    String paymentMethodId
) {
}
