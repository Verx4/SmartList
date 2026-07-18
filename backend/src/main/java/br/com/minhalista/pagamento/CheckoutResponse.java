package br.com.minhalista.pagamento;

public record CheckoutResponse(
    String preferenceId,
    String urlPagamento,
    String initPoint,
    String checkoutUrl
) {
}
