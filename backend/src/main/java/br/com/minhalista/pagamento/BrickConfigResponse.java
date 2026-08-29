package br.com.minhalista.pagamento;

public record BrickConfigResponse(
    String publicKey,
    String environment
) {
}
