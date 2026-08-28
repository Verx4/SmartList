package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "assinaturas")
public class Assinatura {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CicloAssinatura ciclo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusAssinatura status = StatusAssinatura.PENDENTE;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "cupom_codigo", length = 30)
    private String cupomCodigo;

    @Column(name = "cupom_percentual_desconto", precision = 5, scale = 2)
    private BigDecimal cupomPercentualDesconto;

    @Column(name = "cupom_valor_desconto", precision = 10, scale = 2)
    private BigDecimal cupomValorDesconto;

    @Column(name = "cupom_valor_original", precision = 10, scale = 2)
    private BigDecimal cupomValorOriginal;

    @Column(name = "cupom_aplicado_em")
    private Instant cupomAplicadoEm;

    @Column(name = "cupom_primeira_cobranca_somente", nullable = false)
    private boolean cupomPrimeiraCobrancaSomente;

    @Column(name = "cupom_primeiro_pagamento_aplicado", nullable = false)
    private boolean cupomPrimeiroPagamentoAplicado;

    @Column(name = "mercado_pago_preferencia_id", unique = true, length = 120)
    private String mercadoPagoPreferenciaId;

    @Column(name = "mercado_pago_pagamento_id", unique = true, length = 120)
    private String mercadoPagoPagamentoId;

    @Column(name = "inicio_em")
    private Instant inicioEm;

    @Column(name = "vence_em")
    private Instant venceEm;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @PrePersist
    void antesDeSalvar() {
        if (criadoEm == null) {
            criadoEm = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public CicloAssinatura getCiclo() {
        return ciclo;
    }

    public void setCiclo(CicloAssinatura ciclo) {
        this.ciclo = ciclo;
    }

    public StatusAssinatura getStatus() {
        return status;
    }

    public void setStatus(StatusAssinatura status) {
        this.status = status;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public String getCupomCodigo() {
        return cupomCodigo;
    }

    public void setCupomCodigo(String cupomCodigo) {
        this.cupomCodigo = cupomCodigo;
    }

    public BigDecimal getCupomPercentualDesconto() {
        return cupomPercentualDesconto;
    }

    public void setCupomPercentualDesconto(BigDecimal cupomPercentualDesconto) {
        this.cupomPercentualDesconto = cupomPercentualDesconto;
    }

    public BigDecimal getCupomValorDesconto() {
        return cupomValorDesconto;
    }

    public void setCupomValorDesconto(BigDecimal cupomValorDesconto) {
        this.cupomValorDesconto = cupomValorDesconto;
    }

    public BigDecimal getCupomValorOriginal() {
        return cupomValorOriginal;
    }

    public void setCupomValorOriginal(BigDecimal cupomValorOriginal) {
        this.cupomValorOriginal = cupomValorOriginal;
    }

    public Instant getCupomAplicadoEm() {
        return cupomAplicadoEm;
    }

    public void setCupomAplicadoEm(Instant cupomAplicadoEm) {
        this.cupomAplicadoEm = cupomAplicadoEm;
    }

    public boolean isCupomPrimeiraCobrancaSomente() {
        return cupomPrimeiraCobrancaSomente;
    }

    public void setCupomPrimeiraCobrancaSomente(boolean cupomPrimeiraCobrancaSomente) {
        this.cupomPrimeiraCobrancaSomente = cupomPrimeiraCobrancaSomente;
    }

    public boolean isCupomPrimeiroPagamentoAplicado() {
        return cupomPrimeiroPagamentoAplicado;
    }

    public void setCupomPrimeiroPagamentoAplicado(boolean cupomPrimeiroPagamentoAplicado) {
        this.cupomPrimeiroPagamentoAplicado = cupomPrimeiroPagamentoAplicado;
    }

    public String getMercadoPagoPreferenciaId() {
        return mercadoPagoPreferenciaId;
    }

    public void setMercadoPagoPreferenciaId(String mercadoPagoPreferenciaId) {
        this.mercadoPagoPreferenciaId = mercadoPagoPreferenciaId;
    }

    public String getMercadoPagoPagamentoId() {
        return mercadoPagoPagamentoId;
    }

    public void setMercadoPagoPagamentoId(String mercadoPagoPagamentoId) {
        this.mercadoPagoPagamentoId = mercadoPagoPagamentoId;
    }

    public Instant getInicioEm() {
        return inicioEm;
    }

    public void setInicioEm(Instant inicioEm) {
        this.inicioEm = inicioEm;
    }

    public Instant getVenceEm() {
        return venceEm;
    }

    public void setVenceEm(Instant venceEm) {
        this.venceEm = venceEm;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
