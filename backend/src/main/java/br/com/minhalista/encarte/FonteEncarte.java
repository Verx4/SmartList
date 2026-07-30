package br.com.minhalista.encarte;

import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.oferta.UnidadeMercado;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "fontes_encarte",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_fonte_encarte_chave",
        columnNames = "chave_fonte"
    ),
    indexes = {
        @Index(name = "idx_fonte_encarte_ativa", columnList = "ativa,status"),
        @Index(name = "idx_fonte_encarte_unidade", columnList = "unidade_id")
    }
)
public class FonteEncarte {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unidade_id", nullable = false)
    private UnidadeMercado unidade;

    @Column(name = "chave_fonte", nullable = false, length = 64)
    private String chaveFonte;

    @Column(nullable = false, length = 140)
    private String nome;

    @Column(nullable = false, length = 1200)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoEncarte tipo = TipoEncarte.AUTOMATICO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private StatusFonteEncarte status = StatusFonteEncarte.AGUARDANDO;

    @Column(nullable = false)
    private boolean ativa = true;

    @Column(name = "ultimo_hash", length = 64)
    private String ultimoHash;

    @Column(name = "verificada_em")
    private Instant verificadaEm;

    @Column(name = "processada_em")
    private Instant processadaEm;

    @Column(name = "proxima_tentativa_em")
    private Instant proximaTentativaEm;

    @Column(name = "ofertas_extraidas", nullable = false)
    private int ofertasExtraidas;

    @Column(name = "mensagem_status", length = 500)
    private String mensagemStatus;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private Instant criadaEm;

    @PrePersist
    void antesDeSalvar() {
        if (criadaEm == null) {
            criadaEm = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UnidadeMercado getUnidade() {
        return unidade;
    }

    public void setUnidade(UnidadeMercado unidade) {
        this.unidade = unidade;
    }

    public String getChaveFonte() {
        return chaveFonte;
    }

    public void setChaveFonte(String chaveFonte) {
        this.chaveFonte = chaveFonte;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public TipoEncarte getTipo() {
        return tipo;
    }

    public void setTipo(TipoEncarte tipo) {
        this.tipo = tipo;
    }

    public StatusFonteEncarte getStatus() {
        return status;
    }

    public void setStatus(StatusFonteEncarte status) {
        this.status = status;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public void setAtiva(boolean ativa) {
        this.ativa = ativa;
    }

    public String getUltimoHash() {
        return ultimoHash;
    }

    public void setUltimoHash(String ultimoHash) {
        this.ultimoHash = ultimoHash;
    }

    public Instant getVerificadaEm() {
        return verificadaEm;
    }

    public void setVerificadaEm(Instant verificadaEm) {
        this.verificadaEm = verificadaEm;
    }

    public Instant getProcessadaEm() {
        return processadaEm;
    }

    public void setProcessadaEm(Instant processadaEm) {
        this.processadaEm = processadaEm;
    }

    public Instant getProximaTentativaEm() {
        return proximaTentativaEm;
    }

    public void setProximaTentativaEm(Instant proximaTentativaEm) {
        this.proximaTentativaEm = proximaTentativaEm;
    }

    public int getOfertasExtraidas() {
        return ofertasExtraidas;
    }

    public void setOfertasExtraidas(int ofertasExtraidas) {
        this.ofertasExtraidas = ofertasExtraidas;
    }

    public String getMensagemStatus() {
        return mensagemStatus;
    }

    public void setMensagemStatus(String mensagemStatus) {
        this.mensagemStatus = mensagemStatus;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }
}
