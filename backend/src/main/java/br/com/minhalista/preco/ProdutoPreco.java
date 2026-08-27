package br.com.minhalista.preco;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "produtos_precos",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_produtos_precos_nome_normalizado",
        columnNames = "nome_normalizado"
    ),
    indexes = {
        @Index(name = "idx_produtos_precos_categoria", columnList = "categoria"),
        @Index(name = "idx_produtos_precos_nome", columnList = "nome_exibicao")
    }
)
public class ProdutoPreco {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "nome_exibicao", nullable = false, length = 180)
    private String nomeExibicao;

    @Column(name = "nome_normalizado", nullable = false, length = 220)
    private String nomeNormalizado;

    @Column(nullable = false, length = 80)
    private String categoria;

    @OneToMany(mappedBy = "produto")
    private List<ObservacaoPreco> observacoes = new ArrayList<>();

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @PrePersist
    void antesDeCriar() {
        criadoEm = Instant.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void antesDeAtualizar() {
        atualizadoEm = Instant.now();
    }

    public UUID getId() { return id; }
    public String getNomeExibicao() { return nomeExibicao; }
    public void setNomeExibicao(String nomeExibicao) { this.nomeExibicao = nomeExibicao; }
    public String getNomeNormalizado() { return nomeNormalizado; }
    public void setNomeNormalizado(String nomeNormalizado) { this.nomeNormalizado = nomeNormalizado; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public List<ObservacaoPreco> getObservacoes() { return observacoes; }
    public Instant getCriadoEm() { return criadoEm; }
    public Instant getAtualizadoEm() { return atualizadoEm; }
}
