package br.com.minhalista.lista;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import br.com.minhalista.mercado.Mercado;
import br.com.minhalista.usuario.Usuario;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "listas_compras")
public class ListaCompra {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mercado_id")
    private Mercado mercado;

    @Column(nullable = false, length = 120)
    private String nome = "Minha lista";

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal orcamento = BigDecimal.ZERO;

    @Column(name = "total_final", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalFinal = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal economia = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusLista status = StatusLista.ABERTA;

    @Column(name = "oculta_para_usuario", nullable = false)
    private boolean ocultaParaUsuario = false;

    @OneToMany(mappedBy = "lista", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("criadoEm ASC")
    private List<ItemLista> itens = new ArrayList<>();

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    @Column(name = "finalizado_em")
    private Instant finalizadoEm;

    @PrePersist
    void antesDeCriar() {
        criadoEm = Instant.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void antesDeAtualizar() {
        atualizadoEm = Instant.now();
    }

    public void adicionarItem(ItemLista item) {
        item.setLista(this);
        itens.add(item);
    }

    public void removerItem(ItemLista item) {
        itens.remove(item);
        item.setLista(null);
    }

    public UUID getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Mercado getMercado() {
        return mercado;
    }

    public void setMercado(Mercado mercado) {
        this.mercado = mercado;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public BigDecimal getOrcamento() {
        return orcamento;
    }

    public void setOrcamento(BigDecimal orcamento) {
        this.orcamento = orcamento;
    }

    public BigDecimal getTotalFinal() {
        return totalFinal;
    }

    public void setTotalFinal(BigDecimal totalFinal) {
        this.totalFinal = totalFinal;
    }

    public BigDecimal getEconomia() {
        return economia;
    }

    public void setEconomia(BigDecimal economia) {
        this.economia = economia;
    }

    public StatusLista getStatus() {
        return status;
    }

    public void setStatus(StatusLista status) {
        this.status = status;
    }

    public boolean isOcultaParaUsuario() {
        return ocultaParaUsuario;
    }

    public void setOcultaParaUsuario(boolean ocultaParaUsuario) {
        this.ocultaParaUsuario = ocultaParaUsuario;
    }

    public List<ItemLista> getItens() {
        return itens;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    public Instant getFinalizadoEm() {
        return finalizadoEm;
    }

    public void setFinalizadoEm(Instant finalizadoEm) {
        this.finalizadoEm = finalizadoEm;
    }
}123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108109110111112113114115116117118119120121122123124125126127128129130131132133134135136137138139140141142143144145146147148149150151152153154155156157158159160161162163164165166167168169170171172173package br.com.minhalista.lista;


import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;


import br.com.minhalista.mercado.Mercado;
import br.com.minhalista.usuario.Usuario;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;


@Entity
@Table(name = "listas_compras")
public class ListaCompra {


    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mercado_id")
    private Mercado mercado;


    @Column(nullable = false, length = 120)
    private String nome = "Minha lista";


    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal orcamento = BigDecimal.ZERO;


    @Column(name = "total_final", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalFinal = BigDecimal.ZERO;


    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal economia = BigDecimal.ZERO;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusLista status = StatusLista.ABERTA;


    @OneToMany(mappedBy = "lista", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("criadoEm ASC")
    private List<ItemLista> itens = new ArrayList<>();


    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;


    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;


    @Column(name = "finalizado_em")
    private Instant finalizadoEm;


    @PrePersist
    void antesDeCriar() {
        criadoEm = Instant.now();
        atualizadoEm = criadoEm;
    }


    @PreUpdate
    void antesDeAtualizar() {
        atualizadoEm = Instant.now();
    }


    public void adicionarItem(ItemLista item) {
        item.setLista(this);
        itens.add(item);
    }


    public void removerItem(ItemLista item) {
        itens.remove(item);
        item.setLista(null);
    }


    public UUID getId() {
        return id;
    }


    public Usuario getUsuario() {
        return usuario;
    }


    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }


    public Mercado getMercado() {
        return mercado;
    }


    public void setMercado(Mercado mercado) {
        this.mercado = mercado;
    }


    public String getNome() {
        return nome;
    }


    public void setNome(String nome) {
        this.nome = nome;
    }


    public BigDecimal getOrcamento() {
        return orcamento;
    }


    public void setOrcamento(BigDecimal orcamento) {
        this.orcamento = orcamento;
    }


    public BigDecimal getTotalFinal() {
        return totalFinal;
    }


    public void setTotalFinal(BigDecimal totalFinal) {
        this.totalFinal = totalFinal;
    }


    public BigDecimal getEconomia() {
        return economia;
    }


    public void setEconomia(BigDecimal economia) {
        this.economia = economia;
    }


    public StatusLista getStatus() {
        return status;
    }


    public void setStatus(StatusLista status) {
        this.status = status;
    }


    public List<ItemLista> getItens() {
        return itens;
    }


    public Instant getCriadoEm() {
        return criadoEm;
    }


    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }


    public Instant getFinalizadoEm() {
        return finalizadoEm;
    }


    public void setFinalizadoEm(Instant finalizadoEm) {
        this.finalizadoEm = finalizadoEm;
    }
}
