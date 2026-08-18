package br.com.minhalista.pagamento;

import java.time.Instant;

public record MercadoPagoPixCriado(
    String providerPaymentId,
    String status,
    String qrCode,
    String qrCodeBase64,
    String ticketUrl,
    Instant expiresAt
) {
}
