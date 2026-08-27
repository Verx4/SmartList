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
    public AdminPrecoService(ProdutoPrecoRepository produtoRepository, ObservacaoPrecoRepository observacaoRepository) {
        this.produtoRepository = produtoRepository; this.observacaoRepository = observacaoRepository;
    }

    @Transactional(readOnly = true)
    public ResumoResponse resumo() {
        ObservacaoPrecoRepository.ResumoGeral r = observacaoRepository.resumir();
        return new ResumoResponse(r == null ? 0 : r.getTotalObservacoes(), r == null ? 0 : r.getTotalProdutos(), r == null ? 0 : r.getTotalMercados(), r == null ? 0 : r.getTotalEstados(), r == null ? null : r.getPrimeiraCompraEm(), r == null ? null : r.getUltimaCompraEm());
    }

    @Transactional(readOnly = true)
    public ResumoComprasResponse resumoCompras() {
        ObservacaoPrecoRepository.ResumoCompras r = observacaoRepository.resumirCompras();
        return new ResumoComprasResponse(
            r == null ? 0 : r.getTotalCompras(),
            r == null ? 0 : r.getTotalUsuarios(),
            r == null ? 0 : r.getTotalMercados(),
            r == null || r.getValorTotal() == null ? BigDecimal.ZERO : r.getValorTotal(),
            r == null ? 0 : r.getTotalItens()
        );
    }

    @Transactional(readOnly = true)
    public FiltrosResponse filtros() { return new FiltrosResponse(ColetaPrecoService.CATEGORIAS, observacaoRepository.listarEstados(), observacaoRepository.listarCidades(), observacaoRepository.listarMercados(), List.of(OrigemPreco.values()).stream().map(Enum::name).toList()); }

    @Transactional(readOnly = true)
    public ComprasFiltrosResponse filtrosCompras() {
        return new ComprasFiltrosResponse(observacaoRepository.listarMercados(), observacaoRepository.listarUsuariosCompras());
    }

    @Transactional(readOnly = true)
    public PaginaResponse<CompraResumoResponse> compras(String busca, String mercado, String usuario, Instant inicio, Instant fim, int pagina, int tamanho) {
        int paginaSegura = Math.max(0, pagina);
        int tamanhoSeguro = limitarTamanho(tamanho);
        String buscaSegura = busca == null ? "" : busca.trim();
        String mercadoSeguro = mercado == null ? "" : mercado.trim();
        String usuarioSeguro = usuario == null ? "" : usuario.trim();
        Pageable pageable = PageRequest.of(paginaSegura, tamanhoSeguro);
        List<CompraResumoResponse> conteudo = observacaoRepository
            .listarCompras(buscaSegura, mercadoSeguro, usuarioSeguro, inicio, fim, pageable)
            .stream()
            .map(this::compraResumo)
            .toList();
        long total = observacaoRepository.contarCompras(buscaSegura, mercadoSeguro, usuarioSeguro, inicio, fim);
        int totalPaginas = total == 0 ? 0 : (int) Math.ceil((double) total / tamanhoSeguro);
        return new PaginaResponse<>(conteudo, paginaSegura, tamanhoSeguro, total, totalPaginas, paginaSegura + 1 < totalPaginas, paginaSegura > 0);
    }

    @Transactional(readOnly = true)
    public CompraDetalheResponse compra(String compraId) {
        List<ObservacaoPreco> itens = observacaoRepository.findByOrigemAndCompraChaveOrderByCriadoEmAsc(OrigemPreco.COMPRA_USUARIO, compraId);
        if (itens.isEmpty()) throw new RegraNegocioException(HttpStatus.NOT_FOUND, "Compra não encontrada.");
        ObservacaoPreco primeiro = itens.get(0);
        BigDecimal total = itens.stream().map(ObservacaoPreco::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        Instant realizadaEm = itens.stream().map(ObservacaoPreco::getRealizadaEm).max(Instant::compareTo).orElse(primeiro.getRealizadaEm());
        return new CompraDetalheResponse(
            compraId,
            primeiro.getUsuario() == null ? null : primeiro.getUsuario().getId(),
            primeiro.getUsuario() == null ? "Usuário não identificado" : primeiro.getUsuario().getNome(),
            primeiro.getMercado(), primeiro.getCidade(), primeiro.getEstado(), realizadaEm,
            itens.size(), total, itens.stream().map(this::observacao).toList()
        );
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ProdutoResumoResponse> produtos(Filtro filtro, int pagina, int tamanho) {
        Pageable pageable = PageRequest.of(Math.max(0, pagina), limitarTamanho(tamanho), Sort.by(Sort.Direction.ASC, "nomeExibicao"));
        Page<ProdutoPreco> produtos = produtoRepository.findAll(especificacaoProdutos(filtro), pageable);
        List<UUID> ids = produtos.getContent().stream().map(ProdutoPreco::getId).toList();
        Map<UUID, ObservacaoPrecoRepository.AgregadoProduto> agregados = ids.isEmpty() ? Map.of() : observacaoRepository.agregarPorProdutos(ids).stream().collect(Collectors.toMap(ObservacaoPrecoRepository.AgregadoProduto::getProdutoId, Function.identity()));
        return pagina(produtos.getContent().stream().map(p -> produtoResumo(p, agregados.get(p.getId()))).toList(), produtos);
    }

    @Transactional(readOnly = true)
    public PaginaResponse<ObservacaoResponse> observacoes(Filtro filtro, UUID produtoId, int pagina, int tamanho) {
        Pageable pageable = PageRequest.of(Math.max(0, pagina), limitarTamanho(tamanho), Sort.by(Sort.Direction.DESC, "realizadaEm"));
        Page<ObservacaoPreco> dados = observacaoRepository.findAll(especificacaoObservacoes(filtro, produtoId), pageable);
        return pagina(dados.getContent().stream().map(this::observacao).toList(), dados);
    }

    @Transactional(readOnly = true)
    public ProdutoDetalheResponse produto(UUID id) {
        ProdutoPreco produto = produtoRepository.findById(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
        ObservacaoPrecoRepository.AgregadoProduto agregado = observacaoRepository.agregarPorProdutos(List.of(id)).stream().findFirst().orElse(null);
        List<ObservacaoResponse> recentes = observacaoRepository.findByProdutoIdOrderByRealizadaEmDesc(id, PageRequest.of(0, 100)).getContent().stream().map(this::observacao).toList();
        return new ProdutoDetalheResponse(produtoResumo(produto, agregado), recentes);
    }

    @Transactional
    public ProdutoResumoResponse corrigirCategoria(UUID id, String categoria) {
        if (!ColetaPrecoService.CATEGORIAS.contains(categoria)) throw new RegraNegocioException(HttpStatus.BAD_REQUEST, "Selecione uma categoria válida do Smart List.");
        ProdutoPreco produto = produtoRepository.findById(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Produto não encontrado."));
        produto.setCategoria(categoria); produtoRepository.save(produto);
        return produtoResumo(produto, observacaoRepository.agregarPorProdutos(List.of(id)).stream().findFirst().orElse(null));
    }

    @Transactional
    public void excluirObservacao(UUID id) {
        ObservacaoPreco observacao = observacaoRepository.findById(id).orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Observação de preço não encontrada."));
        observacaoRepository.delete(observacao);
    }

    @Transactional(readOnly = true) public List<AnaliseResponse> analiseEstados() { return observacaoRepository.analisarPorEstado().stream().map(this::analise).toList(); }
    @Transactional(readOnly = true) public List<AnaliseResponse> analiseMercados() { return observacaoRepository.analisarPorMercado().stream().map(this::analise).toList(); }

    private CompraResumoResponse compraResumo(ObservacaoPrecoRepository.CompraAgregada c) {
        return new CompraResumoResponse(c.getCompraId(), c.getUsuarioId(), c.getUsuarioNome(), c.getMercado(), c.getCidade(), c.getEstado(), c.getRealizadaEm(), c.getTotalItens(), c.getValorTotal());
    }

    private Specification<ProdutoPreco> especificacaoProdutos(Filtro filtro) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            var obs = root.join("observacoes", JoinType.INNER);
            query.distinct(true);
            if (preenchido(filtro.busca())) {
                String termo = "%" + filtro.busca().trim().toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("nomeExibicao")), termo), cb.like(cb.lower(root.get("nomeNormalizado")), termo)));
            }
            if (preenchido(filtro.categoria())) p.add(cb.equal(root.get("categoria"), filtro.categoria()));
            adicionarFiltrosObservacao(filtro, obs, cb, p);
            return cb.and(p.toArray(Predicate[]::new));
        };
    }
    private Specification<ObservacaoPreco> especificacaoObservacoes(Filtro filtro, UUID produtoId) {
        return (root, query, cb) -> { List<Predicate> p = new ArrayList<>(); if (!Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) { root.fetch("produto", JoinType.INNER); root.fetch("usuario", JoinType.LEFT); query.distinct(true); }
            if (produtoId != null) p.add(cb.equal(root.get("produto").get("id"), produtoId)); if (preenchido(filtro.busca())) { String termo = "%" + filtro.busca().trim().toLowerCase(Locale.ROOT) + "%"; p.add(cb.like(cb.lower(root.get("nomeOriginal")), termo)); }
            if (preenchido(filtro.categoria())) p.add(cb.equal(root.get("produto").get("categoria"), filtro.categoria())); adicionarFiltrosObservacao(filtro, root, cb, p); return cb.and(p.toArray(Predicate[]::new)); };
    }
    private void adicionarFiltrosObservacao(Filtro f, jakarta.persistence.criteria.From<?, ?> r, jakarta.persistence.criteria.CriteriaBuilder cb, List<Predicate> p) {
        if (preenchido(f.estado())) p.add(cb.equal(r.get("estado"), f.estado().toUpperCase(Locale.ROOT))); if (preenchido(f.cidade())) p.add(cb.equal(r.get("cidade"), f.cidade())); if (preenchido(f.mercado())) p.add(cb.equal(r.get("mercado"), f.mercado())); if (f.origem() != null) p.add(cb.equal(r.get("origem"), f.origem())); if (f.inicio() != null) p.add(cb.greaterThanOrEqualTo(r.<Instant>get("realizadaEm"), f.inicio())); if (f.fim() != null) p.add(cb.lessThanOrEqualTo(r.<Instant>get("realizadaEm"), f.fim()));
    }
    private ProdutoResumoResponse produtoResumo(ProdutoPreco p, ObservacaoPrecoRepository.AgregadoProduto a) { return new ProdutoResumoResponse(p.getId(), p.getNomeExibicao(), p.getNomeNormalizado(), p.getCategoria(), a == null ? 0 : a.getTotalObservacoes(), a == null ? null : a.getPrecoMinimo(), a == null || a.getPrecoMedio() == null ? null : BigDecimal.valueOf(a.getPrecoMedio()).setScale(4, RoundingMode.HALF_UP), a == null ? null : a.getPrecoMaximo(), a == null ? null : a.getUltimaCompraEm(), p.getCriadoEm(), p.getAtualizadoEm()); }
    private ObservacaoResponse observacao(ObservacaoPreco o) { return new ObservacaoResponse(o.getId(), o.getProduto().getId(), o.getProduto().getNomeExibicao(), o.getProduto().getCategoria(), o.getNomeOriginal(), o.getQuantidade(), o.getUnidade(), o.getPrecoUnitario(), o.getSubtotal(), o.getMercado(), o.getCidade(), o.getEstado(), o.getRealizadaEm(), o.getOrigem().name(), o.getUsuario() == null ? null : o.getUsuario().getId(), o.getUsuario() == null ? "Usuário não identificado" : o.getUsuario().getNome(), o.getCompraChave(), o.getItemChave(), o.getCriadoEm()); }
    private AnaliseResponse analise(ObservacaoPrecoRepository.AnaliseAgrupada d) { return new AnaliseResponse(d.getNome(), d.getTotalObservacoes(), d.getPrecoMedio() == null ? null : BigDecimal.valueOf(d.getPrecoMedio()).setScale(4, RoundingMode.HALF_UP)); }
    private <T> PaginaResponse<T> pagina(List<T> c, Page<?> p) { return new PaginaResponse<>(c, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages(), p.hasNext(), p.hasPrevious()); }
    private int limitarTamanho(int t) { return Math.min(100, Math.max(1, t)); } private boolean preenchido(String v) { return v != null && !v.isBlank(); }

    public record Filtro(String busca, String categoria, String estado, String cidade, String mercado, OrigemPreco origem, Instant inicio, Instant fim) {}
    public record ResumoResponse(long totalObservacoes, long totalProdutos, long totalMercados, long totalEstados, Instant primeiraCompraEm, Instant ultimaCompraEm) {}
    public record ResumoComprasResponse(long totalCompras, long totalUsuarios, long totalMercados, BigDecimal valorTotal, long totalItens) {}
    public record FiltrosResponse(List<String> categorias, List<String> estados, List<String> cidades, List<String> mercados, List<String> origens) {}
    public record ComprasFiltrosResponse(List<String> mercados, List<String> usuarios) {}
    public record CompraResumoResponse(String compraId, UUID usuarioId, String usuarioNome, String mercado, String cidade, String estado, Instant realizadaEm, long totalItens, BigDecimal valorTotal) {}
    public record CompraDetalheResponse(String compraId, UUID usuarioId, String usuarioNome, String mercado, String cidade, String estado, Instant realizadaEm, int totalItens, BigDecimal valorTotal, List<ObservacaoResponse> itens) {}
    public record ProdutoResumoResponse(UUID id, String nome, String nomeNormalizado, String categoria, long totalObservacoes, BigDecimal precoMinimo, BigDecimal precoMedio, BigDecimal precoMaximo, Instant ultimaCompraEm, Instant criadoEm, Instant atualizadoEm) {}
    public record ObservacaoResponse(UUID id, UUID produtoId, String produto, String categoria, String nomeOriginal, BigDecimal quantidade, String unidade, BigDecimal precoUnitario, BigDecimal subtotal, String mercado, String cidade, String estado, Instant realizadaEm, String origem, UUID usuarioId, String usuarioNome, String compraId, String itemId, Instant criadoEm) {}
    public record ProdutoDetalheResponse(ProdutoResumoResponse produto, List<ObservacaoResponse> observacoesRecentes) {}
    public record AnaliseResponse(String nome, long totalObservacoes, BigDecimal precoMedio) {}
    public record PaginaResponse<T>(List<T> conteudo, int pagina, int tamanho, long totalElementos, int totalPaginas, boolean temProxima, boolean temAnterior) {}
}
