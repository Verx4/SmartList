package br.com.minhalista.receita;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "receitas")
public class Receita {

    @Id
    @Column(length = 100)
    private String id;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(nullable = false, length = 600)
    private String descricao;

    @Column(nullable = false, length = 12)
    private String icone;

    @Column(nullable = false, length = 40)
    private String categoria;

    @Column(nullable = false, length = 20)
    private String tipo;

    @Column(name = "tempo_minutos", nullable = false)
    private int tempoMinutos;

    @Column(nullable = false, length = 30)
    private String dificuldade;

    @Column(nullable = false, length = 80)
    private String rendimento;

    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) default 'SMART_LIST'")
    private String origem = "SMART_LIST";

    @Column(nullable = false, length = 100, columnDefinition = "varchar(100) default 'Smart List'")
    private String fonte = "Smart List";

    @Column(name = "referencia_externa", length = 600)
    private String referenciaExterna;

    @ElementCollection
    @CollectionTable(name = "receitas_utensilios", joinColumns = @JoinColumn(name = "receita_id"))
    @OrderColumn(name = "ordem")
    @Column(name = "utensilio", nullable = false, length = 160)
    private List<String> utensilios = new ArrayList<>();

    @OneToMany(mappedBy = "receita", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("ordem ASC")
    private List<IngredienteReceita> ingredientes = new ArrayList<>();

    @OneToMany(mappedBy = "receita", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("ordem ASC")
    private List<PassoReceita> passos = new ArrayList<>();

    public void adicionarIngrediente(IngredienteReceita ingrediente) {
        ingrediente.setReceita(this);
        ingredientes.add(ingrediente);
    }

    public void adicionarPasso(PassoReceita passo) {
        passo.setReceita(this);
        passos.add(passo);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getIcone() { return icone; }
    public void setIcone(String icone) { this.icone = icone; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public int getTempoMinutos() { return tempoMinutos; }
    public void setTempoMinutos(int tempoMinutos) { this.tempoMinutos = tempoMinutos; }
    public String getDificuldade() { return dificuldade; }
    public void setDificuldade(String dificuldade) { this.dificuldade = dificuldade; }
    public String getRendimento() { return rendimento; }
    public void setRendimento(String rendimento) { this.rendimento = rendimento; }
    public String getOrigem() { return origem; }
    public void setOrigem(String origem) { this.origem = origem; }
    public String getFonte() { return fonte; }
    public void setFonte(String fonte) { this.fonte = fonte; }
    public String getReferenciaExterna() { return referenciaExterna; }
    public void setReferenciaExterna(String referenciaExterna) { this.referenciaExterna = referenciaExterna; }
    public List<String> getUtensilios() { return utensilios; }
    public List<IngredienteReceita> getIngredientes() { return ingredientes; }
    public List<PassoReceita> getPassos() { return passos; }
}
