package br.com.minhalista.sugestao;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "sugestoes")
public class Sugestao {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_nome", nullable = false, length = 120)
    private String usuarioNome;

    @Column(name = "usuario_email", nullable = false, length = 180)
    private String usuarioEmail;

    @Column(nullable = false, length = 60)
    private String categoria;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, length = 1500)
    private String descricao;

    @Column(nullable = false)
    private int votos;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SugestaoStatus status = SugestaoStatus.NOVA;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "resposta_admin", length = 2000)
    private String respostaAdmin;

    @Column(name = "respondido_em")
    private Instant respondidoEm;

    @Column(name = "respondido_por", length = 180)
    private String respondidoPor;

    @PrePersist
    void antesDeSalvar() {
        if (criadoEm == null) {
            criadoEm = Instant.now();
        }
        if (status == null) {
            status = SugestaoStatus.NOVA;
        }
    }

    public UUID getId() {
        return id;
    }

    public String getUsuarioNome() {
        return usuarioNome;
    }

    public void setUsuarioNome(String usuarioNome) {
        this.usuarioNome = usuarioNome;
    }

    public String getUsuarioEmail() {
        return usuarioEmail;
    }

    public void setUsuarioEmail(String usuarioEmail) {
        this.usuarioEmail = usuarioEmail;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getTitulo() {
        return titulo;
    }

    public void setTitulo(String titulo) {
        this.titulo = titulo;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public int getVotos() {
        return votos;
    }

    public void setVotos(int votos) {
        this.votos = Math.max(0, votos);
    }

    public SugestaoStatus getStatus() {
        return status;
    }

    public void setStatus(SugestaoStatus status) {
        this.status = status;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public String getRespostaAdmin() {
        return respostaAdmin;
    }

    public void setRespostaAdmin(String respostaAdmin) {
        this.respostaAdmin = respostaAdmin;
    }

    public Instant getRespondidoEm() {
        return respondidoEm;
    }

    public void setRespondidoEm(Instant respondidoEm) {
        this.respondidoEm = respondidoEm;
    }

    public String getRespondidoPor() {
        return respondidoPor;
    }

    public void setRespondidoPor(String respondidoPor) {
        this.respondidoPor = respondidoPor;
    }
}
