package br.com.minhalista.lista;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "itens_listas")
public class ItemLista {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lista_id", nullable = false)
    private ListaCompra lista;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(nullable = false, length = 80)
    private String categoria = "Outros";

    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) default 'unidade'")
    private String medida = "unidade";

    @Column(name = "chave_produto", nullable = false, length = 180, columnDefinition = "varchar(180) default ''")
    private String chaveProduto = "";

    @Column(nullable = false)
    private int quantidade = 1;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal preco = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal peso = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean favorito;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @PrePersist
    void antesDeSalvar() {
        if (criadoEm == null) {
            criadoEm = Instant.now();
        }
    }

    public BigDecimal calcularSubtotal() {
        boolean hortifruti = categoria != null
            && categoria.toLowerCase(Locale.ROOT).contains("hortifruti");

        if (hortifruti && peso != null && peso.signum() > 0) {
            return preco.multiply(peso).setScale(2, RoundingMode.HALF_UP);
        }

        return preco.multiply(BigDecimal.valueOf(quantidade)).setScale(2, RoundingMode.HALF_UP);
    }

    public UUID getId() {
        return id;
    }

    public ListaCompra getLista() {
        return lista;
    }

    public void setLista(ListaCompra lista) {
        this.lista = lista;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getMedida() {
        return medida;
    }

    public void setMedida(String medida) {
        this.medida = medida;
    }

    public String getChaveProduto() {
        return chaveProduto;
    }

    public void setChaveProduto(String chaveProduto) {
        this.chaveProduto = chaveProduto;
    }

    public int getQuantidade() {
        return quantidade;
    }

    public void setQuantidade(int quantidade) {
        this.quantidade = quantidade;
    }

    public BigDecimal getPreco() {
        return preco;
    }

    public void setPreco(BigDecimal preco) {
        this.preco = preco;
    }

    public BigDecimal getPeso() {
        return peso;
    }

    public void setPeso(BigDecimal peso) {
        this.peso = peso;
    }

    public boolean isFavorito() {
        return favorito;
    }

    public void setFavorito(boolean favorito) {
        this.favorito = favorito;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
