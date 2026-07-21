
package br.com.minhalista.comparacao;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import br.com.minhalista.scraper.PrecoColetadoResponse;
import br.com.minhalista.scraper.ScraperService;

@Service
public class ComparacaoService {

    private static final BigDecimal FATOR_MINIMO = new BigDecimal("0.95");
    private static final BigDecimal FATOR_MAXIMO = new BigDecimal("1.05");
    private static final Duration VALIDADE_CACHE = Duration.ofHours(20);
    private static final List<RedeMercadoResponse> REDES = List.of(
        new RedeMercadoResponse("Pão de Açúcar", true, "Preço público da loja online"),
        new RedeMercadoResponse("Atacadão", true, "Preço público conforme a loja disponível"),
        new RedeMercadoResponse("Recife Atacarejo", true, "Preço público para Recife"),
        new RedeMercadoResponse("Assaí", false, "Aguardando preço público ou nota fiscal"),
        new RedeMercadoResponse("Novo Atacarejo", false, "Aguardando preço público ou nota fiscal"),
        new RedeMercadoResponse("Mix Mateus", false, "Aguardando preço público ou nota fiscal"),
        new RedeMercadoResponse("Verde Frut", false, "Aguardando preço público ou nota fiscal"),
        new RedeMercadoResponse("Deskontão", false, "Aguardando preço público ou nota fiscal"),
        new RedeMercadoResponse("Carrefour", false, "Aguardando preço público ou nota fiscal"),
        new RedeMercadoResponse("GBarbosa", false, "Aguardando preço público ou nota fiscal")
    );

    private final ScraperService scraperService;

    public ComparacaoService(ScraperService scraperService) {
        this.scraperService = scraperService;
    }

    public List<RedeMercadoResponse> redes() {
        return REDES;
    }

    public ComparacaoListaResponse comparar(ComparacaoListaRequest request) {
        List<String> mercados = request.mercados().stream()
            .map(String::trim)
            .filter(nome -> !nome.isBlank())
            .distinct()
            .toList();

        List<ItemColetado> itens = coletarEmParalelo(request.itens(), request.cidade(), mercados);
        List<MercadoComparacaoResponse> resultados = mercados.stream()
            .map(mercado -> montarMercado(mercado, itens))
            .sorted(Comparator
                .comparing(MercadoComparacaoResponse::coberturaCompleta).reversed()
                .thenComparing(MercadoComparacaoResponse::coberturaPercentual, Comparator.reverseOrder())
                .thenComparing(MercadoComparacaoResponse::total))
            .toList();

        String melhor = resultados.stream()
            .filter(MercadoComparacaoResponse::coberturaCompleta)
            .min(Comparator.comparing(MercadoComparacaoResponse::total))
            .map(MercadoComparacaoResponse::mercado)
            .orElse(null);

        return new ComparacaoListaResponse(
            melhor,
            "Preços podem variar por loja, estoque e horário. Considere margem de ±5%.",
            Instant.now(),
            resultados
        );
    }

    private List<ItemColetado> coletarEmParalelo(
        List<ItemListaComparacaoRequest> itens,
        String cidade,
        List<String> mercados
    ) {
        try (ExecutorService executor = Executors.newFixedThreadPool(Math.min(16, itens.size()))) {
            List<Callable<ItemColetado>> tarefas = itens.stream()
                .map(item -> (Callable<ItemColetado>) () -> coletarItem(item, cidade, mercados))
                .toList();
            List<Future<ItemColetado>> futuros = executor.invokeAll(tarefas, 50, TimeUnit.SECONDS);
            List<ItemColetado> resultados = new ArrayList<>();
            for (Future<ItemColetado> futuro : futuros) {
                try {
                    if (futuro.isCancelled()) {
                        continue;
                    }
                    resultados.add(futuro.get());
                } catch (Exception _erro) {
                    // Um item sem resposta não invalida a comparação dos demais.
                }
            }
            return resultados;
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            return List.of();
        }
    }

    private ItemColetado coletarItem(
        ItemListaComparacaoRequest item,
        String cidade,
        List<String> mercados
    ) {
        Map<String, PrecoColetadoResponse> porMercado = recentes(item.nome(), mercados);
        Set<String> faltantes = mercados.stream()
            .filter(mercado -> !porMercado.containsKey(chave(mercado)))
            .collect(Collectors.toSet());
        if (!faltantes.isEmpty()) {
            scraperService.coletarProduto(item.nome(), cidade, List.copyOf(faltantes))
                .forEach(preco -> porMercado.put(chave(preco.mercado()), preco));
        }
        return new ItemColetado(item, porMercado);
    }

    private Map<String, PrecoColetadoResponse> recentes(String produto, List<String> mercados) {
        Instant limite = Instant.now().minus(VALIDADE_CACHE);
        Set<String> selecionados = mercados.stream().map(this::chave).collect(Collectors.toSet());
        Map<String, PrecoColetadoResponse> recentes = new LinkedHashMap<>();
        scraperService.pesquisar(produto).stream()
            .filter(preco -> preco.coletadoEm() != null && preco.coletadoEm().isAfter(limite))
            .filter(preco -> selecionados.contains(chave(preco.mercado())))
            .sorted(Comparator.comparing(PrecoColetadoResponse::coletadoEm).reversed())
            .forEach(preco -> recentes.putIfAbsent(chave(preco.mercado()), preco));
        return recentes;
    }

    private MercadoComparacaoResponse montarMercado(String mercado, List<ItemColetado> itens) {
        List<ItemPrecoComparacaoResponse> encontrados = itens.stream()
            .map(item -> item.preco(mercado))
            .flatMap(java.util.Optional::stream)
            .toList();
        BigDecimal total = somar(encontrados, ItemPrecoComparacaoResponse::subtotal);
        BigDecimal minimo = somar(encontrados, ItemPrecoComparacaoResponse::subtotalMinimo);
        BigDecimal maximo = somar(encontrados, ItemPrecoComparacaoResponse::subtotalMaximo);
        int totalItens = itens.size();
        int cobertura = totalItens == 0 ? 0 : (int) Math.round(encontrados.size() * 100.0 / totalItens);
        boolean completa = totalItens > 0 && encontrados.size() == totalItens;
        String situacao = encontrados.isEmpty()
            ? "Preço indisponível para os itens desta lista"
            : completa ? "Todos os itens encontrados" : "Total parcial: faltam preços de alguns itens";

        return new MercadoComparacaoResponse(
            mercado, total, minimo, maximo, encontrados.size(), totalItens,
            cobertura, completa, situacao, encontrados
        );
    }

    private BigDecimal somar(
        List<ItemPrecoComparacaoResponse> itens,
        java.util.function.Function<ItemPrecoComparacaoResponse, BigDecimal> campo
    ) {
        return itens.stream().map(campo).reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    private String chave(String valor) {
        return Normalizer.normalize(valor == null ? "" : valor, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]", "");
    }

    private record ItemColetado(
        ItemListaComparacaoRequest item,
        Map<String, PrecoColetadoResponse> precos
    ) {
        java.util.Optional<ItemPrecoComparacaoResponse> preco(String mercado) {
            String chaveMercado = Normalizer.normalize(mercado, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
            PrecoColetadoResponse preco = precos.get(chaveMercado);
            if (preco == null) {
                return java.util.Optional.empty();
            }
            BigDecimal subtotal = preco.precoOriginal().multiply(item.quantidade())
                .setScale(2, RoundingMode.HALF_UP);
            return java.util.Optional.of(new ItemPrecoComparacaoResponse(
                item.nome(), preco.produto(), item.quantidade(), preco.precoOriginal(), subtotal,
                subtotal.multiply(FATOR_MINIMO).setScale(2, RoundingMode.HALF_UP),
                subtotal.multiply(FATOR_MAXIMO).setScale(2, RoundingMode.HALF_UP),
                preco.coletadoEm()
            ));
        }
    }
}

