package br.com.minhalista.assinatura;

public record ConfirmarPagamentoResponse(
    boolean premiumAtivo,
    String statusPagamento,
    String mensagem
) {
}
