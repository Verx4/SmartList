package br.com.minhalista.scraper;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "precos_coletados")
public class PrecoColetado {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 180)
    private String produto;

    @Column(nullable = false, length = 140)
    private String mercado;

    @Column(name = "preco_original", nullable = false, precision = 12, scale = 2)
    private BigDecimal precoOriginal;

    @Column(name = "margem_percentual", nullable = false, precision = 5, scale = 2)
    private BigDecimal margemPercentual;

    @Column(name = "preco_minimo", nullable = false, precision = 12, scale = 2)
    private BigDecimal precoMinimo;

    @Column(name = "preco_maximo", nullable = false, precision = 12, scale = 2)
    private BigDecimal precoMaximo;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_confianca", nullable = false, length = 10)
    private NivelConfianca nivelConfianca;

    @Column(name = "url_fonte", length = 1000)
    private String urlFonte;

    @Column(name = "coletado_em", nullable = false, updatable = false)
    private Instant coletadoEm;

    @PrePersist
    void antesDeSalvar() {
        if (coletadoEm == null) {
            coletadoEm = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public String getProduto() {
        return produto;
    }

    public void setProduto(String produto) {
        this.produto = produto;
    }

    public String getMercado() {
        return mercado;
    }

    public void setMercado(String mercado) {
        this.mercado = mercado;
    }

    public BigDecimal getPrecoOriginal() {
        return precoOriginal;
    }

    public void setPrecoOriginal(BigDecimal precoOriginal) {
        this.precoOriginal = precoOriginal;
    }

    public BigDecimal getMargemPercentual() {
        return margemPercentual;
    }

    public void setMargemPercentual(BigDecimal margemPercentual) {
        this.margemPercentual = margemPercentual;
    }

    public BigDecimal getPrecoMinimo() {
        return precoMinimo;
    }

    public void setPrecoMinimo(BigDecimal precoMinimo) {
        this.precoMinimo = precoMinimo;
    }

    public BigDecimal getPrecoMaximo() {
        return precoMaximo;
    }

    public void setPrecoMaximo(BigDecimal precoMaximo) {
        this.precoMaximo = precoMaximo;
    }

    public NivelConfianca getNivelConfianca() {
        return nivelConfianca;
    }

    public void setNivelConfianca(NivelConfianca nivelConfianca) {
        this.nivelConfianca = nivelConfianca;
    }

    public String getUrlFonte() {
        return urlFonte;
    }

    public void setUrlFonte(String urlFonte) {
        this.urlFonte = urlFonte;
    }

    public Instant getColetadoEm() {
        return coletadoEm;
    }
}
