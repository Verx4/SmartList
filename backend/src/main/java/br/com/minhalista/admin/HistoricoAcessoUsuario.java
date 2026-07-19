package br.com.minhalista.admin;

import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.usuario.TipoAcesso;
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
@Table(name = "historico_acesso_usuarios")
public class HistoricoAcessoUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(name = "usuario_email", nullable = false, length = 180)
    private String usuarioEmail;

    @Column(name = "administrador_email", nullable = false, length = 180)
    private String administradorEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "acesso_anterior", nullable = false, length = 20)
    private TipoAcesso acessoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "acesso_novo", nullable = false, length = 20)
    private TipoAcesso acessoNovo;

    @Column(nullable = false, length = 300)
    private String motivo;

    @Column(name = "assinatura_ativa", nullable = false)
    private boolean assinaturaAtiva;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    protected HistoricoAcessoUsuario() {
    }

    public HistoricoAcessoUsuario(
        UUID usuarioId,
        String usuarioEmail,
        String administradorEmail,
        TipoAcesso acessoAnterior,
        TipoAcesso acessoNovo,
        String motivo,
        boolean assinaturaAtiva
    ) {
        this.usuarioId = usuarioId;
        this.usuarioEmail = usuarioEmail;
        this.administradorEmail = administradorEmail;
        this.acessoAnterior = acessoAnterior;
        this.acessoNovo = acessoNovo;
        this.motivo = motivo;
        this.assinaturaAtiva = assinaturaAtiva;
    }

    @PrePersist
    void antesDeSalvar() {
        if (criadoEm == null) {
            criadoEm = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public String getUsuarioEmail() {
        return usuarioEmail;
    }

    public String getAdministradorEmail() {
        return administradorEmail;
    }

    public TipoAcesso getAcessoAnterior() {
        return acessoAnterior;
    }

    public TipoAcesso getAcessoNovo() {
        return acessoNovo;
    }

    public String getMotivo() {
        return motivo;
    }

    public boolean isAssinaturaAtiva() {
        return assinaturaAtiva;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
