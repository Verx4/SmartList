package br.com.minhalista.localizacao;

import java.time.Instant;
import java.util.UUID;

import br.com.minhalista.oferta.UnidadeMercado;
import br.com.minhalista.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "localizacoes_usuario",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_localizacao_usuario",
        columnNames = "usuario_id"
    ),
    indexes = {
        @Index(name = "idx_localizacao_localidade", columnList = "estado,cidade,bairro"),
        @Index(name = "idx_localizacao_expiracao", columnList = "coordenadas_expiram_em,localidade_expira_em")
    }
)
public class LocalizacaoUsuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(precision = 8)
    private Double latitude;

    @Column(precision = 9)
    private Double longitude;

    @Column(name = "precisao_metros")
    private Double precisaoMetros;

    @Column(length = 100)
    private String bairro;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrigemLocalizacao origem;

    @Column(name = "consentimento_em", nullable = false)
    private Instant consentimentoEm;

    @Column(name = "atualizada_em", nullable = false)
    private Instant atualizadaEm;

    @Column(name = "coordenadas_expiram_em")
    private Instant coordenadasExpiramEm;

    @Column(name = "localidade_expira_em", nullable = false)
    private Instant localidadeExpiraEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_confirmada_id")
    private UnidadeMercado unidadeConfirmada;

    @Column(name = "unidade_confirmada_em")
    private Instant unidadeConfirmadaEm;

    public UUID getId() {
        return id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getPrecisaoMetros() {
        return precisaoMetros;
    }

    public void setPrecisaoMetros(Double precisaoMetros) {
        this.precisaoMetros = precisaoMetros;
    }

    public String getBairro() {
        return bairro;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
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

    public OrigemLocalizacao getOrigem() {
        return origem;
    }

    public void setOrigem(OrigemLocalizacao origem) {
        this.origem = origem;
    }

    public Instant getConsentimentoEm() {
        return consentimentoEm;
    }

    public void setConsentimentoEm(Instant consentimentoEm) {
        this.consentimentoEm = consentimentoEm;
    }

    public Instant getAtualizadaEm() {
        return atualizadaEm;
    }

    public void setAtualizadaEm(Instant atualizadaEm) {
        this.atualizadaEm = atualizadaEm;
    }

    public Instant getCoordenadasExpiramEm() {
        return coordenadasExpiramEm;
    }

    public void setCoordenadasExpiramEm(Instant coordenadasExpiramEm) {
        this.coordenadasExpiramEm = coordenadasExpiramEm;
    }

    public Instant getLocalidadeExpiraEm() {
        return localidadeExpiraEm;
    }

    public void setLocalidadeExpiraEm(Instant localidadeExpiraEm) {
        this.localidadeExpiraEm = localidadeExpiraEm;
    }

    public UnidadeMercado getUnidadeConfirmada() {
        return unidadeConfirmada;
    }

    public void setUnidadeConfirmada(UnidadeMercado unidadeConfirmada) {
        this.unidadeConfirmada = unidadeConfirmada;
    }

    public Instant getUnidadeConfirmadaEm() {
        return unidadeConfirmadaEm;
    }

    public void setUnidadeConfirmadaEm(Instant unidadeConfirmadaEm) {
        this.unidadeConfirmadaEm = unidadeConfirmadaEm;
    }
}
