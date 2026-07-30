package br.com.minhalista.oferta;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "unidades_mercado",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_unidade_mercado_chave",
        columnNames = "chave_externa"
    ),
    indexes = {
        @Index(name = "idx_unidade_localidade", columnList = "estado,cidade,bairro"),
        @Index(name = "idx_unidade_coordenadas", columnList = "latitude,longitude")
    }
)
public class UnidadeMercado {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "chave_externa", nullable = false, length = 180)
    private String chaveExterna;

    @Column(nullable = false, length = 120)
    private String rede;

    @Column(nullable = false, length = 140)
    private String nome;

    @Column(length = 240)
    private String endereco;

    @Column(length = 100)
    private String bairro;

    @Column(nullable = false, length = 100)
    private String cidade;

    @Column(nullable = false, length = 2)
    private String estado;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private boolean ativa = true;

    @Column(name = "criada_em", nullable = false, updatable = false)
    private Instant criadaEm;

    @PrePersist
    void antesDeSalvar() {
        if (criadaEm == null) {
            criadaEm = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public String getChaveExterna() {
        return chaveExterna;
    }

    public void setChaveExterna(String chaveExterna) {
        this.chaveExterna = chaveExterna;
    }

    public String getRede() {
        return rede;
    }

    public void setRede(String rede) {
        this.rede = rede;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
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

    public boolean isAtiva() {
        return ativa;
    }

    public void setAtiva(boolean ativa) {
        this.ativa = ativa;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }
}
