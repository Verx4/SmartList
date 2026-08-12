package br.com.minhalista.receita;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "receitas_ingredientes")
public class IngredienteReceita {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receita_id", nullable = false)
    private Receita receita;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(name = "chave_produto", nullable = false, length = 180)
    private String chaveProduto;

    @Column(nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidade;

    @Column(nullable = false, length = 30)
    private String unidade;

    @Column(nullable = false)
    private boolean obrigatorio;

    @Column(nullable = false)
    private boolean basico;

    @Column(nullable = false)
    private int ordem;

    public UUID getId() { return id; }
    public Receita getReceita() { return receita; }
    public void setReceita(Receita receita) { this.receita = receita; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getChaveProduto() { return chaveProduto; }
    public void setChaveProduto(String chaveProduto) { this.chaveProduto = chaveProduto; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
    public boolean isObrigatorio() { return obrigatorio; }
    public void setObrigatorio(boolean obrigatorio) { this.obrigatorio = obrigatorio; }
    public boolean isBasico() { return basico; }
    public void setBasico(boolean basico) { this.basico = basico; }
    public int getOrdem() { return ordem; }
    public void setOrdem(int ordem) { this.ordem = ordem; }
}
