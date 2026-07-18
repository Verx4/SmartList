package br.com.minhalista.scraper;

import java.time.Instant;
import java.util.UUID;

public record ExecucaoScraperResponse(
    UUID id,
    String status,
    boolean automatica,
    int precosColetados,
    String mensagem,
    Instant iniciadaEm,
    Instant finalizadaEm
) {
    public static ExecucaoScraperResponse de(ExecucaoScraper execucao) {
        return new ExecucaoScraperResponse(
            execucao.getId(),
            execucao.getStatus().name(),
            execucao.isAutomatica(),
            execucao.getPrecosColetados(),
            execucao.getMensagem(),
            execucao.getIniciadaEm(),
            execucao.getFinalizadaEm()
        );
    }
}
