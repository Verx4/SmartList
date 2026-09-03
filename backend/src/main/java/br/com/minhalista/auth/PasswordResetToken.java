package br.com.minhalista.auth;

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
import jakarta.persistence.Table;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "email_hash", nullable = false, length = 64)
    private String emailHash;

    @Column(name = "ip_hash", nullable = false, length = 64)
    private String ipHash;

    @Column(name = "codigo_hash", nullable = false, length = 100)
    private String codigoHash;

    @Column(name = "token_redefinicao_hash", length = 64)
    private String tokenRedefinicaoHash;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    @Column(nullable = false)
    private int tentativas;

    @Column(name = "verificado_em")
    private Instant verificadoEm;

    @Column(name = "utilizado_em")
    private Instant utilizadoEm;

    @Column(name = "invalidado_em")
    private Instant invalidadoEm;

    public UUID getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getEmailHash() { return emailHash; }
    public void setEmailHash(String emailHash) { this.emailHash = emailHash; }
    public String getIpHash() { return ipHash; }
    public void setIpHash(String ipHash) { this.ipHash = ipHash; }
    public String getCodigoHash() { return codigoHash; }
    public void setCodigoHash(String codigoHash) { this.codigoHash = codigoHash; }
    public String getTokenRedefinicaoHash() { return tokenRedefinicaoHash; }
    public void setTokenRedefinicaoHash(String valor) { tokenRedefinicaoHash = valor; }
    public Instant getCriadoEm() { return criadoEm; }
    public void setCriadoEm(Instant criadoEm) { this.criadoEm = criadoEm; }
    public Instant getExpiraEm() { return expiraEm; }
    public void setExpiraEm(Instant expiraEm) { this.expiraEm = expiraEm; }
    public int getTentativas() { return tentativas; }
    public void setTentativas(int tentativas) { this.tentativas = tentativas; }
    public Instant getVerificadoEm() { return verificadoEm; }
    public void setVerificadoEm(Instant verificadoEm) { this.verificadoEm = verificadoEm; }
    public Instant getUtilizadoEm() { return utilizadoEm; }
    public void setUtilizadoEm(Instant utilizadoEm) { this.utilizadoEm = utilizadoEm; }
    public Instant getInvalidadoEm() { return invalidadoEm; }
    public void setInvalidadoEm(Instant invalidadoEm) { this.invalidadoEm = invalidadoEm; }
}
