package br.com.minhalista.scraper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScraperService {

    public static final BigDecimal MARGEM_PERCENTUAL = new BigDecimal("5.00");
    private static final BigDecimal FATOR_MARGEM = new BigDecimal("0.05");

    private final ExecucaoScraperRepository execucaoRepository;
    private final PrecoColetadoRepository precoRepository;

    public ScraperService(
        ExecucaoScraperRepository execucaoRepository,
        PrecoColetadoRepository precoRepository
    ) {
        this.execucaoRepository = execucaoRepository;
        this.precoRepository = precoRepository;
    }

    @Scheduled(cron = "0 0 0 */2 * *", zone = "America/Fortaleza")
    public void executarAutomaticamente() {
        executar(true);
    }

    @Transactional
    public ExecucaoScraperResponse executar(boolean automatica) {
        Instant agora = Instant.now();
        ExecucaoScraper execucao = new ExecucaoScraper();
        execucao.setAutomatica(automatica);
        execucao.setStatus(StatusExecucaoScraper.CONCLUIDA);
        execucao.setPrecosColetados(0);
        execucao.setIniciadaEm(agora);
        execucao.setFinalizadaEm(Instant.now());
        execucao.setMensagem(
            "Estrutura do scraper ativa. Nenhuma fonte de supermercado foi configurada; nenhum preço foi inventado."
        );
        return ExecucaoScraperResponse.de(execucaoRepository.save(execucao));
    }

    @Transactional
    public PrecoColetadoResponse registrarPreco(PrecoColetadoRequest request) {
        BigDecimal original = request.precoOriginal().setScale(2, RoundingMode.HALF_UP);
        BigDecimal variacao = original.multiply(FATOR_MARGEM);

        PrecoColetado preco = new PrecoColetado();
        preco.setProduto(request.produto().trim());
        preco.setMercado(request.mercado().trim());
        preco.setPrecoOriginal(original);
        preco.setMargemPercentual(MARGEM_PERCENTUAL);
        preco.setPrecoMinimo(original.subtract(variacao).setScale(2, RoundingMode.HALF_UP));
        preco.setPrecoMaximo(original.add(variacao).setScale(2, RoundingMode.HALF_UP));
        preco.setNivelConfianca(request.nivelConfianca());
        preco.setUrlFonte(request.urlFonte());

        return PrecoColetadoResponse.de(precoRepository.save(preco));
    }

    @Transactional(readOnly = true)
    public List<PrecoColetadoResponse> pesquisar(String produto) {
        return precoRepository
            .findTop100ByProdutoContainingIgnoreCaseOrderByPrecoOriginalAscColetadoEmDesc(produto.trim())
            .stream()
            .map(PrecoColetadoResponse::de)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ExecucaoScraperResponse> ultimasExecucoes() {
        return execucaoRepository.findTop20ByOrderByIniciadaEmDesc()
            .stream()
            .map(ExecucaoScraperResponse::de)
            .toList();
    }
}
