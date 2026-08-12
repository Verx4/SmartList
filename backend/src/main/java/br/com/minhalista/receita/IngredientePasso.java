package br.com.minhalista.receita;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class IngredientePasso {

    @Column(name = "nome", nullable = false, length = 160)
    private String nome;

    @Column(name = "chave_produto", nullable = false, length = 180)
    private String chaveProduto;

    @Column(name = "quantidade", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantidade;

    @Column(name = "unidade", nullable = false, length = 30)
    private String unidade;

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getChaveProduto() { return chaveProduto; }
    public void setChaveProduto(String chaveProduto) { this.chaveProduto = chaveProduto; }
    public BigDecimal getQuantidade() { return quantidade; }
    public void setQuantidade(BigDecimal quantidade) { this.quantidade = quantidade; }
    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
}
