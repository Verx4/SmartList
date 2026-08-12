package br.com.minhalista.despensa;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "despensa_itens", uniqueConstraints = @UniqueConstraint(
    name = "uk_despensa_usuario_produto_unidade",
    columnNames = { "usuario_id", "chave_produto", "unidade" }
))
public class ItemDespensa {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(name = "chave_produto", nullable = false, length = 180)
    private String chaveProduto;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantidade = BigDecimal.ZERO;

    @Column(name = "quantidade_conhecida", nullable = false, columnDefinition = "boolean default true")
    private boolean quantidadeConhecida = true;

    @Column(nullable = false, length = 30)
    private String unidade;

    @Column(nullable = false, length = 80, columnDefinition = "varchar(80) default 'Alimento'")
    private String categoria = "Alimento";

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @PrePersist
    @PreUpdate
    void antesDeSalvar() {
        atualizadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getChaveProduto() { return chaveProduto; }
    public void setChaveProduto(String chaveProduto) { this.chaveProduto = chaveProduto; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public boolean isQuantidadeConhecida() { return quantidadeConhecida; }
    public void setQuantidadeConhecida(boolean quantidadeConhecida) { this.quantidadeConhecida = quantidadeConhecida; }
    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
}
