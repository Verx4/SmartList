package br.com.minhalista.scraper;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "execucoes_scraper")
public class ExecucaoScraper {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusExecucaoScraper status;

    @Column(nullable = false)
    private boolean automatica;

    @Column(name = "precos_coletados", nullable = false)
    private int precosColetados;

    @Column(length = 500)
    private String mensagem;

    @Column(name = "iniciada_em", nullable = false)
    private Instant iniciadaEm;

    @Column(name = "finalizada_em")
    private Instant finalizadaEm;

    public UUID getId() {
        return id;
    }

    public StatusExecucaoScraper getStatus() {
        return status;
    }

    public void setStatus(StatusExecucaoScraper status) {
        this.status = status;
    }

    public boolean isAutomatica() {
        return automatica;
    }

    public void setAutomatica(boolean automatica) {
        this.automatica = automatica;
    }

    public int getPrecosColetados() {
        return precosColetados;
    }

    public void setPrecosColetados(int precosColetados) {
        this.precosColetados = precosColetados;
    }

    public String getMensagem() {
        return mensagem;
    }

    public void setMensagem(String mensagem) {
        this.mensagem = mensagem;
    }

    public Instant getIniciadaEm() {
        return iniciadaEm;
    }

    public void setIniciadaEm(Instant iniciadaEm) {
        this.iniciadaEm = iniciadaEm;
    }

    public Instant getFinalizadaEm() {
        return finalizadaEm;
    }

    public void setFinalizadaEm(Instant finalizadaEm) {
        this.finalizadaEm = finalizadaEm;
    }
}
