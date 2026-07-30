package br.com.minhalista.oferta;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
    name = "ofertas",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_oferta_impressao",
        columnNames = "impressao_digital"
    ),
    indexes = {
        @Index(name = "idx_oferta_produto", columnList = "produto_chave"),
        @Index(name = "idx_oferta_validade", columnList = "ativa,valida_ate"),
        @Index(name = "idx_oferta_unidade", columnList = "unidade_id")
    }
)
public class Oferta {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unidade_id", nullable = false)
    private UnidadeMercado unidade;

    @Column(name = "produto_nome", nullable = false, length = 200)
    private String produtoNome;

    @Column(name = "produto_chave", nullable = false, length = 220)
    private String produtoChave;

    @Column(length = 100)
    private String categoria;

    @Column(length = 100)
    private String marca;

    @Column(name = "peso_volume", length = 80)
    private String pesoVolume;

    @Column(name = "quantidade_embalagem", precision = 12, scale = 3)
    private BigDecimal quantidadeEmbalagem;

    @Column(name = "unidade_medida", length = 20)
    private String unidadeMedida;

    @Column(name = "preco_promocional", nullable = false, precision = 12, scale = 2)
    private BigDecimal precoPromocional;

    @Column(name = "preco_anterior", precision = 12, scale = 2)
    private BigDecimal precoAnterior;

    @Column(name = "condicao_especial", length = 240)
    private String condicaoEspecial;

    @Column(name = "valida_de")
    private LocalDate validaDe;

    @Column(name = "valida_ate")
    private LocalDate validaAte;

    @Column(name = "capturada_em", nullable = false)
    private Instant capturadaEm;

    @Column(name = "fonte_nome", nullable = false, length = 140)
    private String fonteNome;

    @Column(name = "fonte_url", nullable = false, length = 1200)
    private String fonteUrl;

    @Column(name = "confianca_ia", nullable = false, precision = 5, scale = 4)
    private BigDecimal confiancaIa;

    @Column(name = "impressao_digital", nullable = false, length = 64)
    private String impressaoDigital;

    @Column(nullable = false)
    private boolean ativa = true;

    @PrePersist
    void antesDeSalvar() {
        if (capturadaEm == null) {
            capturadaEm = Instant.now();
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

    public String getProdutoNome() {
        return produtoNome;
    }

    public void setProdutoNome(String produtoNome) {
        this.produtoNome = produtoNome;
    }

    public String getProdutoChave() {
        return produtoChave;
    }

    public void setProdutoChave(String produtoChave) {
        this.produtoChave = produtoChave;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getPesoVolume() {
        return pesoVolume;
    }

    public void setPesoVolume(String pesoVolume) {
        this.pesoVolume = pesoVolume;
    }

    public BigDecimal getQuantidadeEmbalagem() {
        return quantidadeEmbalagem;
    }

    public void setQuantidadeEmbalagem(BigDecimal quantidadeEmbalagem) {
        this.quantidadeEmbalagem = quantidadeEmbalagem;
    }

    public String getUnidadeMedida() {
        return unidadeMedida;
    }

    public void setUnidadeMedida(String unidadeMedida) {
        this.unidadeMedida = unidadeMedida;
    }

    public BigDecimal getPrecoPromocional() {
        return precoPromocional;
    }

    public void setPrecoPromocional(BigDecimal precoPromocional) {
        this.precoPromocional = precoPromocional;
    }

    public BigDecimal getPrecoAnterior() {
        return precoAnterior;
    }

    public void setPrecoAnterior(BigDecimal precoAnterior) {
        this.precoAnterior = precoAnterior;
    }

    public String getCondicaoEspecial() {
        return condicaoEspecial;
    }

    public void setCondicaoEspecial(String condicaoEspecial) {
        this.condicaoEspecial = condicaoEspecial;
    }

    public LocalDate getValidaDe() {
        return validaDe;
    }

    public void setValidaDe(LocalDate validaDe) {
        this.validaDe = validaDe;
    }

    public LocalDate getValidaAte() {
        return validaAte;
    }

    public void setValidaAte(LocalDate validaAte) {
        this.validaAte = validaAte;
    }

    public Instant getCapturadaEm() {
        return capturadaEm;
    }

    public void setCapturadaEm(Instant capturadaEm) {
        this.capturadaEm = capturadaEm;
    }

    public String getFonteNome() {
        return fonteNome;
    }

    public void setFonteNome(String fonteNome) {
        this.fonteNome = fonteNome;
    }

    public String getFonteUrl() {
        return fonteUrl;
    }

    public void setFonteUrl(String fonteUrl) {
        this.fonteUrl = fonteUrl;
    }

    public BigDecimal getConfiancaIa() {
        return confiancaIa;
    }

    public void setConfiancaIa(BigDecimal confiancaIa) {
        this.confiancaIa = confiancaIa;
    }

    public String getImpressaoDigital() {
        return impressaoDigital;
    }

    public void setImpressaoDigital(String impressaoDigital) {
        this.impressaoDigital = impressaoDigital;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public void setAtiva(boolean ativa) {
        this.ativa = ativa;
    }
}
