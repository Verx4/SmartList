package br.com.minhalista.receita;

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
import jakarta.persistence.Table;

@Entity
@Table(name = "receitas_preparadas")
public class HistoricoReceita {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receita_id", nullable = false)
    private Receita receita;

    @Column(name = "despensa_atualizada", nullable = false)
    private boolean despensaAtualizada;

    @Column(name = "preparada_em", nullable = false, updatable = false)
    private Instant preparadaEm;

    @PrePersist
    void antesDeSalvar() {
        preparadaEm = Instant.now();
    }

    public UUID getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Receita getReceita() { return receita; }
    public void setReceita(Receita receita) { this.receita = receita; }
    public boolean isDespensaAtualizada() { return despensaAtualizada; }
    public void setDespensaAtualizada(boolean despensaAtualizada) { this.despensaAtualizada = despensaAtualizada; }
    public Instant getPreparadaEm() { return preparadaEm; }
}
