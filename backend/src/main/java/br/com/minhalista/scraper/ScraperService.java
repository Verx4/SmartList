package br.com.minhalista.scraper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScraperService {

    public static final BigDecimal MARGEM_PERCENTUAL = new BigDecimal("5.00");
    private static final BigDecimal FATOR_MARGEM = new BigDecimal("0.05");

    private final ExecucaoScraperRepository execucaoRepository;
    private final PrecoColetadoRepository precoRepository;
    private final List<FontePrecoMercado> fontes;

    public ScraperService(
        ExecucaoScraperRepository execucaoRepository,
        PrecoColetadoRepository precoRepository
    ) {
        this(execucaoRepository, precoRepository, List.of());
    }

    @Autowired
    public ScraperService(
        ExecucaoScraperRepository execucaoRepository,
        PrecoColetadoRepository precoRepository,
        List<FontePrecoMercado> fontes
    ) {
        this.execucaoRepository = execucaoRepository;
        this.precoRepository = precoRepository;
        this.fontes = List.copyOf(fontes);
    }

    @Scheduled(cron = "0 0 3 * * *", zone = "America/Sao_Paulo")
    public void executarAutomaticamente() {
        executar(true);
    }

    public ExecucaoScraperResponse executar(boolean automatica) {
        ExecucaoScraper execucao = new ExecucaoScraper();
        execucao.setAutomatica(automatica);
        execucao.setStatus(StatusExecucaoScraper.CONCLUIDA);
        execucao.setIniciadaEm(Instant.now());

        int coletados = 0;
        int falhas = 0;
        List<String> produtos = precoRepository.encontrarProdutosMonitorados(PageRequest.of(0, 100));
        for (String produto : produtos) {
            try {
                coletados += coletarProduto(produto, "", List.of()).size();
            } catch (RuntimeException _erro) {
                falhas++;
            }
        }

        execucao.setPrecosColetados(coletados);
        execucao.setFinalizadaEm(Instant.now());
        execucao.setMensagem(produtos.isEmpty()
            ? "Coleta diária concluída. Ainda não existem produtos monitorados."
            : "Coleta diária das 03:00 (horário de Brasília) concluída: "
                + coletados + " preço(s) atualizado(s) e " + falhas + " falha(s) de fonte.");
        return ExecucaoScraperResponse.de(execucaoRepository.save(execucao));
    }

    public List<PrecoColetadoResponse> coletarProduto(
        String produto,
        String cidade,
        List<String> mercados
    ) {
        String consulta = produto == null ? "" : produto.trim();
        if (consulta.isBlank()) {
            return List.of();
        }

        Set<String> selecionados = mercados == null
            ? Set.of()
            : mercados.stream()
                .map(NormalizadorMercado::normalizar)
                .collect(Collectors.toSet());
        List<PrecoColetadoResponse> coletados = new ArrayList<>();

        for (FontePrecoMercado fonte : fontes) {
            boolean solicitada = selecionados.isEmpty()
                || fonte.aliases().stream()
                    .map(NormalizadorMercado::normalizar)
                    .anyMatch(selecionados::contains);
            if (!solicitada) {
                continue;
            }

            try {
                fonte.buscar(consulta, cidade).stream()
                    .max(Comparator.comparingInt(resultado -> relevancia(consulta, resultado.produto())))
                    .filter(resultado -> relevancia(consulta, resultado.produto()) > 0)
                    .map(resultado -> registrarPreco(new PrecoColetadoRequest(
                        resultado.produto(),
                        resultado.mercado(),
                        resultado.preco(),
                        NivelConfianca.ALTA,
                        resultado.urlFonte()
                    )))
                    .ifPresent(coletados::add);
            } catch (Exception _erro) {
                // Uma fonte indisponível não impede as demais redes de responder.
            }
        }

        return coletados;
    }

    private int relevancia(String consulta, String encontrado) {
        Set<String> termosConsulta = termos(consulta);
        Set<String> termosEncontrados = termos(encontrado);
        int comuns = (int) termosConsulta.stream().filter(termosEncontrados::contains).count();
        return comuns * 100 - Math.abs(termosEncontrados.size() - termosConsulta.size());
    }

    private Set<String> termos(String valor) {
        String limpo = Normalizer.normalize(valor == null ? "" : valor, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT);
        return List.of(limpo.split("[^a-z0-9]+"))
            .stream()
            .filter(termo -> !termo.isBlank())
            .collect(Collectors.toSet());
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
