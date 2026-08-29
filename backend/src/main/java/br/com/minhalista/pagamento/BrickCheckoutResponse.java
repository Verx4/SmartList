package br.com.minhalista.pagamento;

public record BrickCheckoutResponse(
    String paymentId,
    String status,
    String statusDetail,
    String paymentMethodId,
    boolean premiumAtivo,
    String mensagem
) {
}
