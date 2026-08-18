package br.com.minhalista.pagamento;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PixPagamentoResponse(
    UUID paymentId,
    String status,
    String planId,
    String planName,
    BigDecimal amount,
    String currency,
    String qrCode,
    String qrCodeBase64,
    String ticketUrl,
    Instant expiresAt,
    Instant premiumUntil,
    boolean premiumActivated
) {
    public static PixPagamentoResponse de(Pagamento pagamento) {
        return new PixPagamentoResponse(
            pagamento.getPublicId(),
            pagamento.getStatus().name().toLowerCase(),
            pagamento.getPlanId(),
            pagamento.getAssinatura().getCiclo().getNome(),
            pagamento.getAmount(),
            pagamento.getCurrency(),
            pagamento.getPixQrCode(),
            pagamento.getPixQrCodeBase64(),
            pagamento.getPixTicketUrl(),
            pagamento.getExpiresAt(),
            pagamento.getAssinatura().getVenceEm(),
            pagamento.isBenefitGranted()
        );
    }
}
