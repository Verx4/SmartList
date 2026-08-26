package br.com.minhalista.usuario;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

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
@Table(name = "usuarios")
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(length = 30)
    private String telefone;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String estado;

    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Perfil perfil = Perfil.USUARIO;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_acesso", nullable = false, length = 20)
    private TipoAcesso tipoAcesso = TipoAcesso.FREE;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "aceite_termos_em", nullable = false)
    private Instant aceiteTermosEm;

    @Column(name = "aceite_marketing", nullable = false)
    private boolean aceiteMarketing;

    @Column(name = "notificar_promocoes", nullable = false, columnDefinition = "boolean default false")
    private boolean notificarPromocoes;

    @Column(name = "notificar_precos", nullable = false, columnDefinition = "boolean default false")
    private boolean notificarPrecos;

    @Column(name = "cortesia_ate")
    private Instant cortesiaAte;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "ultimo_acesso_em", nullable = false)
    private Instant ultimoAcessoEm;

    @PrePersist
    void antesDeSalvar() {
        if (criadoEm == null) {
            criadoEm = Instant.now();
        }

        if (aceiteTermosEm == null) {
            aceiteTermosEm = Instant.now();
        }

        if (ultimoAcessoEm == null) {
            ultimoAcessoEm = Instant.now();
        }
    }

    public boolean temAcessoPremium() {
        if (tipoAcesso == TipoAcesso.PREMIUM) {
            return true;
        }

        return tipoAcesso == TipoAcesso.CORTESIA
            && cortesiaAte != null
            && cortesiaAte.isAfter(Instant.now());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + perfil.name()));
    }

    @Override
    public String getPassword() {
        return senhaHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return ativo;
    }

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public void setSenhaHash(String senhaHash) {
        this.senhaHash = senhaHash;
    }

    public Perfil getPerfil() {
        return perfil;
    }

    public void setPerfil(Perfil perfil) {
        this.perfil = perfil;
    }

    public TipoAcesso getTipoAcesso() {
        return tipoAcesso;
    }

    public void setTipoAcesso(TipoAcesso tipoAcesso) {
        this.tipoAcesso = tipoAcesso;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }

    public Instant getAceiteTermosEm() {
        return aceiteTermosEm;
    }

    public void setAceiteTermosEm(Instant aceiteTermosEm) {
        this.aceiteTermosEm = aceiteTermosEm;
    }

    public boolean isAceiteMarketing() {
        return aceiteMarketing;
    }

    public void setAceiteMarketing(boolean aceiteMarketing) {
        this.aceiteMarketing = aceiteMarketing;
    }

    public boolean isNotificarPromocoes() {
        return notificarPromocoes;
    }

    public void setNotificarPromocoes(boolean notificarPromocoes) {
        this.notificarPromocoes = notificarPromocoes;
    }

    public boolean isNotificarPrecos() {
        return notificarPrecos;
    }

    public void setNotificarPrecos(boolean notificarPrecos) {
        this.notificarPrecos = notificarPrecos;
    }

    public Instant getCortesiaAte() {
        return cortesiaAte;
    }

    public void setCortesiaAte(Instant cortesiaAte) {
        this.cortesiaAte = cortesiaAte;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getUltimoAcessoEm() {
        return ultimoAcessoEm;
    }

    public void setUltimoAcessoEm(Instant ultimoAcessoEm) {
        this.ultimoAcessoEm = ultimoAcessoEm;
    }
}
