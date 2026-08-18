package br.com.minhalista.pagamento;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.assinatura.Assinatura;
import br.com.minhalista.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "pagamentos",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_pagamentos_public_id", columnNames = "public_id"),
        @UniqueConstraint(name = "uk_pagamentos_assinatura", columnNames = "assinatura_id"),
        @UniqueConstraint(name = "uk_pagamentos_provider_id", columnNames = "provider_payment_id"),
        @UniqueConstraint(name = "uk_pagamentos_idempotencia", columnNames = "idempotency_key")
    }
)
public class Pagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "public_id", nullable = false, updatable = false)
    private UUID publicId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assinatura_id", nullable = false)
    private Assinatura assinatura;

    @Column(nullable = false, length = 40)
    private String provider = "mercado_pago";

    @Column(name = "provider_payment_id", length = 120)
    private String providerPaymentId;

    @Column(name = "external_reference", nullable = false, length = 64)
    private String externalReference;

    @Column(name = "plan_id", nullable = false, length = 40)
    private String planId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency = "BRL";

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private FormaPagamento paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusPagamento status = StatusPagamento.CREATED;

    @Column(name = "provider_status", length = 60)
    private String providerStatus;

    @Column(name = "benefit_granted", nullable = false)
    private boolean benefitGranted;

    @Column(name = "idempotency_key", nullable = false, updatable = false)
    private UUID idempotencyKey;

    @Column(name = "pix_qr_code", columnDefinition = "TEXT")
    private String pixQrCode;

    @Column(name = "pix_qr_code_base64", columnDefinition = "TEXT")
    private String pixQrCodeBase64;

    @Column(name = "pix_ticket_url", length = 1000)
    private String pixTicketUrl;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void antesDeCriar() {
        Instant agora = Instant.now();

        if (publicId == null) {
            publicId = UUID.randomUUID();
        }
        if (idempotencyKey == null) {
            idempotencyKey = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = agora;
        }
        updatedAt = agora;
    }

    @PreUpdate
    void antesDeAtualizar() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getPublicId() { return publicId; }
    public void setPublicId(UUID publicId) { this.publicId = publicId; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Assinatura getAssinatura() { return assinatura; }
    public void setAssinatura(Assinatura assinatura) { this.assinatura = assinatura; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getProviderPaymentId() { return providerPaymentId; }
    public void setProviderPaymentId(String providerPaymentId) { this.providerPaymentId = providerPaymentId; }
    public String getExternalReference() { return externalReference; }
    public void setExternalReference(String externalReference) { this.externalReference = externalReference; }
    public String getPlanId() { return planId; }
    public void setPlanId(String planId) { this.planId = planId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public FormaPagamento getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(FormaPagamento paymentMethod) { this.paymentMethod = paymentMethod; }
    public StatusPagamento getStatus() { return status; }
    public void setStatus(StatusPagamento status) { this.status = status; }
    public String getProviderStatus() { return providerStatus; }
    public void setProviderStatus(String providerStatus) { this.providerStatus = providerStatus; }
    public boolean isBenefitGranted() { return benefitGranted; }
    public void setBenefitGranted(boolean benefitGranted) { this.benefitGranted = benefitGranted; }
    public UUID getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(UUID idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getPixQrCode() { return pixQrCode; }
    public void setPixQrCode(String pixQrCode) { this.pixQrCode = pixQrCode; }
    public String getPixQrCodeBase64() { return pixQrCodeBase64; }
    public void setPixQrCodeBase64(String pixQrCodeBase64) { this.pixQrCodeBase64 = pixQrCodeBase64; }
    public String getPixTicketUrl() { return pixTicketUrl; }
    public void setPixTicketUrl(String pixTicketUrl) { this.pixTicketUrl = pixTicketUrl; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public Instant getProcessedAt() { return processedAt; }
    public void setProcessedAt(Instant processedAt) { this.processedAt = processedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
