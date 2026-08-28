package br.com.minhalista.assinatura;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "planos")
public class Plano {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CicloAssinatura ciclo;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Plano() {
    }

    public Plano(CicloAssinatura ciclo, BigDecimal valor) {
        this.ciclo = ciclo;
        this.valor = valor;
    }

    @PrePersist
    @PreUpdate
    void registrarAtualizacao() {
        atualizadoEm = Instant.now();
    }

    public CicloAssinatura getCiclo() {
        return ciclo;
    }

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
