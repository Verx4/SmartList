package br.com.minhalista.preco;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

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
    name = "observacoes_precos",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_observacoes_precos_origem_compra_item",
        columnNames = { "origem", "compra_chave", "item_chave" }
    ),
    indexes = {
        @Index(name = "idx_observacoes_precos_produto_data", columnList = "produto_id, realizada_em"),
        @Index(name = "idx_observacoes_precos_mercado_data", columnList = "mercado, realizada_em"),
        @Index(name = "idx_observacoes_precos_estado_cidade", columnList = "estado, cidade"),
        @Index(name = "idx_observacoes_precos_origem", columnList = "origem")
    }
)
public class ObservacaoPreco {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_id", nullable = false)
    private ProdutoPreco produto;

    @Column(name = "nome_original", nullable = false, length = 180)
    private String nomeOriginal;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidade;

    @Column(nullable = false, length = 24)
    private String unidade;

    @Column(name = "preco_unitario", nullable = false, precision = 12, scale = 4)
    private BigDecimal precoUnitario;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(length = 120)
    private String mercado;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String estado;

    @Column(name = "realizada_em", nullable = false)
    private Instant realizadaEm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrigemPreco origem;

    @Column(name = "compra_chave", nullable = false, length = 120)
    private String compraChave;

    @Column(name = "item_chave", nullable = false, length = 120)
    private String itemChave;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @PrePersist
    void antesDeCriar() {
        if (criadoEm == null) criadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public ProdutoPreco getProduto() { return produto; }
    public void setProduto(ProdutoPreco produto) { this.produto = produto; }
    public String getNomeOriginal() { return nomeOriginal; }
    public void setNomeOriginal(String nomeOriginal) { this.nomeOriginal = nomeOriginal; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
    public BigDecimal getPrecoUnitario() { return precoUnitario; }
    public void setPrecoUnitario(BigDecimal precoUnitario) { this.precoUnitario = precoUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public String getMercado() { return mercado; }
    public void setMercado(String mercado) { this.mercado = mercado; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public Instant getRealizadaEm() { return realizadaEm; }
    public void setRealizadaEm(Instant realizadaEm) { this.realizadaEm = realizadaEm; }
    public OrigemPreco getOrigem() { return origem; }
    public void setOrigem(OrigemPreco origem) { this.origem = origem; }
    public String getCompraChave() { return compraChave; }
    public void setCompraChave(String compraChave) { this.compraChave = compraChave; }
    public String getItemChave() { return itemChave; }
    public void setItemChave(String itemChave) { this.itemChave = itemChave; }
    public Instant getCriadoEm() { return criadoEm; }
}
