package br.com.minhalista.usuario;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import jakarta.persistence.*;

@Entity @Table(name = "usuarios")
public class Usuario implements UserDetails {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable=false,length=120) private String nome;
    @Column(nullable=false,unique=true,length=180) private String email;
    @Column(length=11) private String cpf;
    @Column(length=30) private String telefone;
    @Column(length=100) private String cidade;
    @Column(length=2) private String estado;
    @Column(name="foto_perfil", columnDefinition="TEXT") private String fotoPerfil;
    @Column(name="senha_hash",nullable=false,length=100) private String senhaHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private Perfil perfil=Perfil.USUARIO;
    @Enumerated(EnumType.STRING) @Column(name="tipo_acesso",nullable=false,length=20) private TipoAcesso tipoAcesso=TipoAcesso.FREE;
    @Column(nullable=false) private boolean ativo=true;
    @Column(name="aceite_termos_em",nullable=false) private Instant aceiteTermosEm;
    @Column(name="aceite_termos_versao",length=20) private String aceiteTermosVersao;
    @Column(name="aceite_privacidade_versao",length=20) private String aceitePrivacidadeVersao;
    @Column(name="aceite_ip",length=64) private String aceiteIp;
    @Column(name="exclusao_solicitada_em") private Instant exclusaoSolicitadaEm;
    @Column(name="aceite_marketing",nullable=false) private boolean aceiteMarketing;
    @Column(name="notificar_promocoes",nullable=false,columnDefinition="boolean default false") private boolean notificarPromocoes;
    @Column(name="notificar_precos",nullable=false,columnDefinition="boolean default false") private boolean notificarPrecos;
    @Column(name="cortesia_ate") private Instant cortesiaAte;
    @Column(name="criado_em",nullable=false,updatable=false) private Instant criadoEm;
    @Column(name="ultimo_acesso_em") private Instant ultimoAcessoEm;
    @Column(name="dados_compras_limpos_em") private Instant dadosComprasLimposEm;
    @PrePersist void antesDeSalvar(){if(criadoEm==null)criadoEm=Instant.now();if(aceiteTermosEm==null)aceiteTermosEm=Instant.now();if(ultimoAcessoEm==null)ultimoAcessoEm=Instant.now();}
    public boolean temAcessoPremium(){if(tipoAcesso==TipoAcesso.PREMIUM)return true;return tipoAcesso==TipoAcesso.CORTESIA&&cortesiaAte!=null&&cortesiaAte.isAfter(Instant.now());}
    @Override public Collection<? extends GrantedAuthority> getAuthorities(){return List.of(new SimpleGrantedAuthority("ROLE_"+perfil.name()));}
    @Override public String getPassword(){return senhaHash;} @Override public String getUsername(){return email;} @Override public boolean isEnabled(){return ativo;}
    public UUID getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;}
    public String getCpf(){return cpf;} public void setCpf(String v){cpf=v;} public String getTelefone(){return telefone;} public void setTelefone(String v){telefone=v;} public String getCidade(){return cidade;} public void setCidade(String v){cidade=v;} public String getEstado(){return estado;} public void setEstado(String v){estado=v;}
    public String getFotoPerfil(){return fotoPerfil;} public void setFotoPerfil(String v){fotoPerfil=v;}
    public String getSenhaHash(){return senhaHash;} public void setSenhaHash(String v){senhaHash=v;} public Perfil getPerfil(){return perfil;} public void setPerfil(Perfil v){perfil=v;} public TipoAcesso getTipoAcesso(){return tipoAcesso;} public void setTipoAcesso(TipoAcesso v){tipoAcesso=v;}
    public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;} public Instant getAceiteTermosEm(){return aceiteTermosEm;} public void setAceiteTermosEm(Instant v){aceiteTermosEm=v;} public String getAceiteTermosVersao(){return aceiteTermosVersao;} public void setAceiteTermosVersao(String v){aceiteTermosVersao=v;} public String getAceitePrivacidadeVersao(){return aceitePrivacidadeVersao;} public void setAceitePrivacidadeVersao(String v){aceitePrivacidadeVersao=v;} public String getAceiteIp(){return aceiteIp;} public void setAceiteIp(String v){aceiteIp=v;} public Instant getExclusaoSolicitadaEm(){return exclusaoSolicitadaEm;} public void setExclusaoSolicitadaEm(Instant v){exclusaoSolicitadaEm=v;}
    public boolean isAceiteMarketing(){return aceiteMarketing;} public void setAceiteMarketing(boolean v){aceiteMarketing=v;} public boolean isNotificarPromocoes(){return notificarPromocoes;} public void setNotificarPromocoes(boolean v){notificarPromocoes=v;} public boolean isNotificarPrecos(){return notificarPrecos;} public void setNotificarPrecos(boolean v){notificarPrecos=v;}
    public Instant getCortesiaAte(){return cortesiaAte;} public void setCortesiaAte(Instant v){cortesiaAte=v;} public Instant getCriadoEm(){return criadoEm;} public Instant getUltimoAcessoEm(){return ultimoAcessoEm;} public void setUltimoAcessoEm(Instant v){ultimoAcessoEm=v;} public Instant getDadosComprasLimposEm(){return dadosComprasLimposEm;} public void setDadosComprasLimposEm(Instant v){dadosComprasLimposEm=v;}
}
