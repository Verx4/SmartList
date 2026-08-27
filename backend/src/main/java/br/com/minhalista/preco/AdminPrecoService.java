package br.com.minhalista.preco;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

@Service
public class AdminPrecoService {

    private final ProdutoPrecoRepository produtoRepository;
    private final ObservacaoPrecoRepository observacaoRepository;

    public AdminPrecoService(
        ProdutoPrecoRepository produtoRepository,
        ObservacaoPrecoRepository observacaoRepository
    ) {
        this.produtoRepository = produtoRepository;
        this.observacaoRepository = observacaoRepository;
    }

    @Transactional(readOnly = true)
    public ResumoResponse resumo() {
        ObservacaoPrecoRepository.ResumoGeral resumo = observacaoRepository.resumir();
        return new ResumoResponse(
            resumo == null ? 0 : resumo.getTotalObservacoes(),
            resumo == null ? 0 : resumo.getTotalProdutos(),
            resumo == null ? 0 : resumo.getTotalMercados(),
            resumo == null ? 0 : resumo.getTotalEstados(),
            resumo == null ? null : resumo.getPrimeiraCompraEm(),
            resumo == null ? null : resumo.getUltimaCompraEm()
        );
    }

    @Transactional(readOnly = true)
    public FiltrosResponse filtros() {
        return new FiltrosResponse(
            ColetaPrecoService.CATEGORIAS,
            observacaoRepository.listarEstados(),
            observacaoRepository.listarCidades(),
            observacaoRepository.listarMercados(),
            List.of(OrigemPreco.values()).stream().map(Enum::name).toList()
        );
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ProdutoResumoResponse> produtos(Filtro filtro, int pagina, int tamanho) {
        Pageable pageable = PageRequest.of(
            Math.max(0, pagina),
            limitarTamanho(tamanho),
            Sort.by(Sort.Direction.ASC, "nomeExibicao")
        );
        Page<ProdutoPreco> produtos = produtoRepository.findAll(especificacaoProdutos(filtro), pageable);
        List<UUID> ids = produtos.getContent().stream().map(ProdutoPreco::getId).toList();
        Map<UUID, ObservacaoPrecoRepository.AgregadoProduto> agregados = ids.isEmpty()
            ? Map.of()
            : observacaoRepository.agregarPorProdutos(ids).stream().collect(Collectors.toMap(
                ObservacaoPrecoRepository.AgregadoProduto::getProdutoId,
                Function.identity()
            ));

        List<ProdutoResumoResponse> conteudo = produtos.getContent().stream()
            .map(produto -> produtoResumo(produto, agregados.get(produto.getId())))
            .toList();
        return pagina(conteudo, produtos);
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ObservacaoResponse> observacoes(
        Filtro filtro,
        UUID produtoId,
        int pagina,
        int tamanho
    ) {
        Pageable pageable = PageRequest.of(
            Math.max(0, pagina),
            limitarTamanho(tamanho),
            Sort.by(Sort.Direction.DESC, "realizadaEm")
        );
        Specification<ObservacaoPreco> spec = especificacaoObservacoes(filtro, produtoId);
        Page<ObservacaoPreco> dados = observacaoRepository.findAll(spec, pageable);
        return pagina(dados.getContent().stream().map(this::observacao).toList(), dados);
    }

    @Transactional(readOnly = true)
    public ProdutoDetalheResponse produto(UUID id) {
        ProdutoPreco produto = produtoRepository.findById(id)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
        ObservacaoPrecoRepository.AgregadoProduto agregado = observacaoRepository
            .agregarPorProdutos(List.of(id))
            .stream()
            .findFirst()
            .orElse(null);
        List<ObservacaoResponse> recentes = observacaoRepository
            .findByProdutoIdOrderByRealizadaEmDesc(id, PageRequest.of(0, 100))
            .getContent()
            .stream()
            .map(this::observacao)
            .toList();
        return new ProdutoDetalheResponse(produtoResumo(produto, agregado), recentes);
    }

    @Transactional
    public ProdutoResumoResponse corrigirCategoria(UUID id, String categoria) {
        if (!ColetaPrecoService.CATEGORIAS.contains(categoria)) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Selecione uma categoria válida do Smart List.");
        }
        ProdutoPreco produto = produtoRepository.findById(id)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
        produto.setCategoria(categoria);
        produtoRepository.save(produto);
        ObservacaoPrecoRepository.AgregadoProduto agregado = observacaoRepository
            .agregarPorProdutos(List.of(id)).stream().findFirst().orElse(null);
        return produtoResumo(produto, agregado);
    }

    @Transactional(readOnly = true)
    public List<AnaliseResponse> analiseEstados() {
        return observacaoRepository.analisarPorEstado().stream().map(this::analise).toList();
    }

    @Transactional(readOnly = true)
    public List<AnaliseResponse> analiseMercados() {
        return observacaoRepository.analisarPorMercado().stream().map(this::analise).toList();
    }

    private Specification<ProdutoPreco> especificacaoProdutos(Filtro filtro) {
        return (root, query, cb) -> {
            List<Predicate> predicados = new ArrayList<>();
            var observacoes = root.join("observacoes", JoinType.LEFT);
            query.distinct(true);

            if (preenchido(filtro.busca())) {
                String termo = "%" + filtro.busca().trim().toLowerCase(Locale.ROOT) + "%";
                predicados.add(cb.or(
                    cb.like(cb.lower(root.get("nomeExibicao")), termo),
                    cb.like(cb.lower(root.get("nomeNormalizado")), termo)
                ));
            }
            if (preenchido(filtro.categoria())) predicados.add(cb.equal(root.get("categoria"), filtro.categoria()));
            adicionarFiltrosObservacao(filtro, observacoes, cb, predicados);
            return cb.and(predicados.toArray(Predicate[]::new));
        };
    }

    private Specification<ObservacaoPreco> especificacaoObservacoes(Filtro filtro, UUID produtoId) {
        return (root, query, cb) -> {
            List<Predicate> predicados = new ArrayList<>();
            if (produtoId != null) predicados.add(cb.equal(root.get("produto").get("id"), produtoId));
            if (preenchido(filtro.busca())) {
                String termo = "%" + filtro.busca().trim().toLowerCase(Locale.ROOT) + "%";
                predicados.add(cb.like(cb.lower(root.get("nomeOriginal")), termo));
            }
            if (preenchido(filtro.categoria())) {
                predicados.add(cb.equal(root.get("produto").get("categoria"), filtro.categoria()));
            }
            adicionarFiltrosObservacao(filtro, root, cb, predicados);
            return cb.and(predicados.toArray(Predicate[]::new));
        };
    }

    private void adicionarFiltrosObservacao(
        Filtro filtro,
        jakarta.persistence.criteria.From<?, ?> raiz,
        jakarta.persistence.criteria.CriteriaBuilder cb,
        List<Predicate> predicados
    ) {
        if (preenchido(filtro.estado())) predicados.add(cb.equal(raiz.get("estado"), filtro.estado().toUpperCase(Locale.ROOT)));
        if (preenchido(filtro.cidade())) predicados.add(cb.equal(raiz.get("cidade"), filtro.cidade()));
        if (preenchido(filtro.mercado())) predicados.add(cb.equal(raiz.get("mercado"), filtro.mercado()));
        if (filtro.origem() != null) predicados.add(cb.equal(raiz.get("origem"), filtro.origem()));
        if (filtro.inicio() != null) predicados.add(cb.greaterThanOrEqualTo(raiz.<Instant>get("realizadaEm"), filtro.inicio()));
        if (filtro.fim() != null) predicados.add(cb.lessThanOrEqualTo(raiz.<Instant>get("realizadaEm"), filtro.fim()));
    }

    private ProdutoResumoResponse produtoResumo(
        ProdutoPreco produto,
        ObservacaoPrecoRepository.AgregadoProduto agregado
    ) {
        return new ProdutoResumoResponse(
            produto.getId(),
            produto.getNomeExibicao(),
            produto.getNomeNormalizado(),
            produto.getCategoria(),
            agregado == null ? 0 : agregado.getTotalObservacoes(),
            agregado == null ? null : agregado.getPrecoMinimo(),
            agregado == null || agregado.getPrecoMedio() == null
                ? null
                : BigDecimal.valueOf(agregado.getPrecoMedio()).setScale(4, RoundingMode.HALF_UP),
            agregado == null ? null : agregado.getPrecoMaximo(),
            agregado == null ? null : agregado.getUltimaCompraEm(),
            produto.getCriadoEm(),
            produto.getAtualizadoEm()
        );
    }

    private ObservacaoResponse observacao(ObservacaoPreco observacao) {
        return new ObservacaoResponse(
            observacao.getId(),
            observacao.getProduto().getId(),
            observacao.getProduto().getNomeExibicao(),
            observacao.getProduto().getCategoria(),
            observacao.getNomeOriginal(),
            observacao.getQuantidade(),
            observacao.getUnidade(),
            observacao.getPrecoUnitario(),
            observacao.getSubtotal(),
            observacao.getMercado(),
            observacao.getCidade(),
            observacao.getEstado(),
            observacao.getRealizadaEm(),
            observacao.getOrigem().name(),
            observacao.getCompraChave(),
            observacao.getItemChave(),
            observacao.getCriadoEm()
        );
    }

    private AnaliseResponse analise(ObservacaoPrecoRepository.AnaliseAgrupada dado) {
        return new AnaliseResponse(
            dado.getNome(),
            dado.getTotalObservacoes(),
            dado.getPrecoMedio() == null
                ? null
                : BigDecimal.valueOf(dado.getPrecoMedio()).setScale(4, RoundingMode.HALF_UP)
        );
    }

    private <T> PaginaResponse<T> pagina(List<T> conteudo, Page<?> pagina) {
        return new PaginaResponse<>(
            conteudo,
            pagina.getNumber(),
            pagina.getSize(),
            pagina.getTotalElements(),
            pagina.getTotalPages(),
            pagina.hasNext(),
            pagina.hasPrevious()
        );
    }

    private int limitarTamanho(int tamanho) { return Math.min(100, Math.max(1, tamanho)); }
    private boolean preenchido(String valor) { return valor != null && !valor.isBlank(); }

    public record Filtro(
        String busca,
        String categoria,
        String estado,
        String cidade,
        String mercado,
        OrigemPreco origem,
        Instant inicio,
        Instant fim
    ) {
    }

    public record ResumoResponse(
        long totalObservacoes,
        long totalProdutos,
        long totalMercados,
        long totalEstados,
        Instant primeiraCompraEm,
        Instant ultimaCompraEm
    ) {
    }

    public record FiltrosResponse(
        List<String> categorias,
        List<String> estados,
        List<String> cidades,
        List<String> mercados,
        List<String> origens
    ) {
    }

    public record ProdutoResumoResponse(
        UUID id,
        String nome,
        String nomeNormalizado,
        String categoria,
        long totalObservacoes,
        BigDecimal precoMinimo,
        BigDecimal precoMedio,
        BigDecimal precoMaximo,
        Instant ultimaCompraEm,
        Instant criadoEm,
        Instant atualizadoEm
    ) {
    }

    public record ObservacaoResponse(
        UUID id,
        UUID produtoId,
        String produto,
        String categoria,
        String nomeOriginal,
        BigDecimal quantidade,
        String unidade,
        BigDecimal precoUnitario,
        BigDecimal subtotal,
        String mercado,
        String cidade,
        String estado,
        Instant realizadaEm,
        String origem,
        String compraId,
        String itemId,
        Instant criadoEm
    ) {
    }

    public record ProdutoDetalheResponse(
        ProdutoResumoResponse produto,
        List<ObservacaoResponse> observacoesRecentes
    ) {
    }

    public record AnaliseResponse(String nome, long totalObservacoes, BigDecimal precoMedio) {
    }

    public record PaginaResponse<T>(
        List<T> conteudo,
        int pagina,
        int tamanho,
        long totalElementos,
        int totalPaginas,
        boolean temProxima,
        boolean temAnterior
    ) {
    }
}
