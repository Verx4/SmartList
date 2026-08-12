package br.com.minhalista.receita;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "receitas_passos")
public class PassoReceita {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receita_id", nullable = false)
    private Receita receita;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(nullable = false, length = 1200)
    private String descricao;

    @ElementCollection
    @CollectionTable(name = "receitas_passos_ingredientes", joinColumns = @JoinColumn(name = "passo_id"))
    @OrderColumn(name = "ordem")
    private List<IngredientePasso> ingredientes = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "receitas_passos_utensilios", joinColumns = @JoinColumn(name = "passo_id"))
    @OrderColumn(name = "ordem")
    @Column(name = "utensilio", nullable = false, length = 160)
    private List<String> utensilios = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "receitas_passos_continuar_utensilios", joinColumns = @JoinColumn(name = "passo_id"))
    @OrderColumn(name = "ordem")
    @Column(name = "utensilio", nullable = false, length = 160)
    private List<String> continueUsando = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "receitas_passos_acoes", joinColumns = @JoinColumn(name = "passo_id"))
    @OrderColumn(name = "ordem")
    @Column(name = "acao", nullable = false, length = 1200)
    private List<String> acoes = new ArrayList<>();

    @Column(name = "tempo_aproximado", length = 120)
    private String tempoAproximado;

    @Column(name = "intensidade_fogo", length = 160)
    private String intensidadeFogo;

    @Column(name = "ponto_esperado", length = 1200)
    private String pontoEsperado;

    @ElementCollection
    @CollectionTable(name = "receitas_passos_observacoes", joinColumns = @JoinColumn(name = "passo_id"))
    @OrderColumn(name = "ordem")
    @Column(name = "observacao", nullable = false, length = 1200)
    private List<String> observacoes = new ArrayList<>();

    @Column(nullable = false)
    private int ordem;

    public UUID getId() { return id; }
    public Receita getReceita() { return receita; }
    public void setReceita(Receita receita) { this.receita = receita; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public List<IngredientePasso> getIngredientes() { return ingredientes; }
    public List<String> getUtensilios() { return utensilios; }
    public List<String> getContinueUsando() { return continueUsando; }
    public List<String> getAcoes() { return acoes; }
    public String getTempoAproximado() { return tempoAproximado; }
    public void setTempoAproximado(String tempoAproximado) { this.tempoAproximado = tempoAproximado; }
    public String getIntensidadeFogo() { return intensidadeFogo; }
    public void setIntensidadeFogo(String intensidadeFogo) { this.intensidadeFogo = intensidadeFogo; }
    public String getPontoEsperado() { return pontoEsperado; }
    public void setPontoEsperado(String pontoEsperado) { this.pontoEsperado = pontoEsperado; }
    public List<String> getObservacoes() { return observacoes; }
    public int getOrdem() { return ordem; }
    public void setOrdem(int ordem) { this.ordem = ordem; }
}
