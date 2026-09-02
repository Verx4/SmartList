package br.com.minhalista.preco;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.lista.ItemLista;
import br.com.minhalista.lista.ListaCompra;
import br.com.minhalista.lista.ListaCompraRepository;
import br.com.minhalista.lista.StatusLista;
import br.com.minhalista.oferta.NormalizadorProduto;
import br.com.minhalista.usuario.Usuario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Service
public class ColetaPrecoService {
    public static final String CATEGORIA_OUTROS = "📦 Outros";
    public static final List<String> CATEGORIAS = List.of(
        "🥛 Laticínios", "🥩 Carnes", "🍗 Frango", "🐟 Peixes e Frutos do Mar", "🍎 Hortifruti", "🍞 Padaria",
        "🥤 Bebidas", "⚡ Energéticos", "🍺 Bebidas Alcoólicas", "🌾 Grãos", "🍚 Mercearia", "🍪 Doces e Snacks",
        "🧼 Limpeza", "🪥 Higiene", "🐶 Pet", "💊 Farmácia", "🥫 Enlatados e Conservas", "❄️ Congelados",
        "🌶️ Temperos", "🍽️ Descartáveis", "🔌 Utilidades", CATEGORIA_OUTROS
    );
    private static final Set<String> CATEGORIAS_VALIDAS = Set.copyOf(CATEGORIAS);
    private static final List<RegraCategoria> TERMOS_CATEGORIAS = List.of(
        new RegraCategoria("🥛 Laticínios", List.of("leite", "queijo", "iogurte", "requeijao", "manteiga")),
        new RegraCategoria("🥩 Carnes", List.of("carne", "bife", "picanha", "linguica", "bacon")),
        new RegraCategoria("🍗 Frango", List.of("frango", "coxa", "sobrecoxa", "galinha")),
        new RegraCategoria("🐟 Peixes e Frutos do Mar", List.of("peixe", "tilapia", "salmao", "camarao", "atum")),
        new RegraCategoria("🍎 Hortifruti", List.of("banana", "maca", "tomate", "batata", "cebola", "fruta", "verdura", "legume")),
        new RegraCategoria("🍞 Padaria", List.of("pao", "bolo", "torrada", "croissant")),
        new RegraCategoria("⚡ Energéticos", List.of("energetico", "red bull", "monster")),
        new RegraCategoria("🍺 Bebidas Alcoólicas", List.of("cerveja", "vinho", "whisky", "vodka", "cachaca")),
        new RegraCategoria("🥤 Bebidas", List.of("agua", "refrigerante", "suco", "refresco")),
        new RegraCategoria("🌾 Grãos", List.of("arroz", "feijao", "lentilha", "grao de bico")),
        new RegraCategoria("🍚 Mercearia", List.of("macarrao", "farinha", "acucar", "cafe", "oleo")),
        new RegraCategoria("🍪 Doces e Snacks", List.of("biscoito", "chocolate", "salgadinho", "doce")),
        new RegraCategoria("🧼 Limpeza", List.of("detergente", "sabao", "desinfetante", "amaciante", "agua sanitaria")),
        new RegraCategoria("🪥 Higiene", List.of("sabonete", "shampoo", "dentifricio", "papel higienico")),
        new RegraCategoria("🐶 Pet", List.of("racao", "petisco", "areia sanitaria")),
        new RegraCategoria("💊 Farmácia", List.of("remedio", "medicamento", "vitamina", "curativo")),
        new RegraCategoria("🥫 Enlatados e Conservas", List.of("enlatado", "conserva", "azeitona", "milho verde")),
        new RegraCategoria("❄️ Congelados", List.of("congelado", "nugget", "lasanha congelada")),
        new RegraCategoria("🌶️ Temperos", List.of("sal", "pimenta", "tempero", "oregano")),
        new RegraCategoria("🍽️ Descartáveis", List.of("descartavel", "guardanapo", "copo plastico")),
        new RegraCategoria("🔌 Utilidades", List.of("pilha", "lampada", "fosforo", "vela"))
    );
    private final ProdutoPrecoRepository produtoRepository;
    private final ObservacaoPrecoRepository observacaoRepository;
    private final ListaCompraRepository listaCompraRepository;

    public ColetaPrecoService(
        ProdutoPrecoRepository produtoRepository,
        ObservacaoPrecoRepository observacaoRepository,
        ListaCompraRepository listaCompraRepository
    ) {
        this.produtoRepository = produtoRepository;
        this.observacaoRepository = observacaoRepository;
        this.listaCompraRepository = listaCompraRepository;
    }

    @Transactional
    public ResultadoColeta coletar(Usuario usuario, CompraRequest request) {
        int criadas = 0;
        int ignoradas = 0;
        String compraChave = limitar(request.compraId(), 120);
        String mercado = opcional(request.mercado(), 120);
        String cidade = opcional(request.cidade(), 100);
        String estado = estado(request.estado());
        if (cidade == null) cidade = opcional(usuario.getCidade(), 100);
        if (estado == null) estado = estado(usuario.getEstado());

        for (ItemRequest item : request.itens()) {
            String itemChave = limitar(item.itemId(), 120);
            if (observacaoRepository.existsByOrigemAndCompraChaveAndItemChave(OrigemPreco.COMPRA_USUARIO, compraChave, itemChave)) {
                ignoradas += 1;
                continue;
            }
            String nome = limitar(item.nome(), 180);
            String normalizado = NormalizadorProduto.normalizar(nome);
            ProdutoPreco produto = produtoRepository.findByNomeNormalizado(normalizado)
                .orElseGet(() -> criarProduto(nome, normalizado, item.categoria()));
            ObservacaoPreco observacao = new ObservacaoPreco();
            observacao.setProduto(produto);
            observacao.setUsuario(usuario);
            observacao.setNomeOriginal(nome);
            observacao.setQuantidade(item.quantidade().setScale(3, RoundingMode.HALF_UP));
            observacao.setUnidade(normalizarUnidade(item.unidade()));
            observacao.setPrecoUnitario(item.precoUnitario().setScale(4, RoundingMode.HALF_UP));
            observacao.setSubtotal(item.subtotal().setScale(2, RoundingMode.HALF_UP));
            observacao.setEconomiaCompra(economia(request.economia()));
            observacao.setMercado(mercado);
            observacao.setCidade(cidade);
            observacao.setEstado(estado);
            observacao.setRealizadaEm(request.realizadaEm());
            observacao.setOrigem(OrigemPreco.COMPRA_USUARIO);
            observacao.setCompraChave(compraChave);
            observacao.setItemChave(itemChave);
            observacaoRepository.save(observacao);
            criadas += 1;
        }
        return new ResultadoColeta(criadas, ignoradas, criadas + ignoradas);
    }

    @Transactional(readOnly = true)
    public List<HistoricoCompraResponse> historico(Usuario usuario) {
        List<ObservacaoPreco> observacoes = observacaoRepository
            .findByUsuario_IdAndOrigemOrderByRealizadaEmDescCriadoEmAsc(
                usuario.getId(),
                OrigemPreco.COMPRA_USUARIO
            );
        Set<String> comprasOcultas = Set.copyOf(
            listaCompraRepository
                .findByUsuarioIdAndStatusAndOcultaParaUsuarioTrue(
                    usuario.getId(),
                    StatusLista.FINALIZADA
                )
                .stream()
                .map(lista -> lista.getId().toString())
                .toList()
        );
        Map<String, List<ObservacaoPreco>> porCompra = new LinkedHashMap<>();

        for (ObservacaoPreco observacao : observacoes) {
            String compraId = observacao.getCompraChave();
            if (compraId == null || compraId.isBlank() || comprasOcultas.contains(compraId)) continue;
            porCompra.computeIfAbsent(compraId, chave -> new ArrayList<>()).add(observacao);
        }

        return porCompra.entrySet().stream()
            .map(entrada -> historicoCompra(entrada.getKey(), entrada.getValue(), usuario))
            .toList();
    }

    @Transactional
    public ResultadoColeta coletar(Usuario usuario, ListaCompra lista) {
        String mercado = lista.getMercado() == null ? null : lista.getMercado().getNome();
        List<ItemRequest> itens = lista.getItens().stream().map(this::itemDaLista).toList();
        return coletar(usuario, new CompraRequest(lista.getId().toString(), lista.getFinalizadoEm() == null ? Instant.now() : lista.getFinalizadoEm(), mercado, null, null, itens));
    }

    @Transactional
    public void removerProdutoSemObservacoesPorNome(String nome) {
        String normalizado = NormalizadorProduto.normalizar(nome);
        produtoRepository.findByNomeNormalizado(normalizado)
            .ifPresent(produto -> removerProdutoSemObservacoes(produto.getId()));
    }

    @Transactional
    public void removerProdutoSemObservacoes(UUID produtoId) {
        if (!observacaoRepository.existsByProdutoId(produtoId)) {
            produtoRepository.deleteById(produtoId);
        }
    }

    private ItemRequest itemDaLista(ItemLista item) {
        boolean porPeso = item.getPeso() != null && item.getPeso().signum() > 0;
        BigDecimal quantidade = porPeso ? item.getPeso() : BigDecimal.valueOf(Math.max(1, item.getQuantidade()));
        return new ItemRequest(item.getId().toString(), item.getNome(), item.getCategoria(), quantidade, porPeso ? "kg" : "unidade", item.getPreco(), item.calcularSubtotal());
    }

    private ProdutoPreco criarProduto(String nome, String normalizado, String categoriaRecebida) {
        ProdutoPreco produto = new ProdutoPreco();
        produto.setNomeExibicao(nome);
        produto.setNomeNormalizado(normalizado);
        produto.setCategoria(resolverCategoria(nome, categoriaRecebida));
        return produtoRepository.save(produto);
    }

    public String resolverCategoria(String nome, String categoriaRecebida) {
        String recebida = categoriaRecebida == null ? "" : categoriaRecebida.trim();
        if (CATEGORIAS_VALIDAS.contains(recebida)) return recebida;
        if (recebida.equalsIgnoreCase("Outros")) return CATEGORIA_OUTROS;
        String busca = removerAcentos(nome);
        return TERMOS_CATEGORIAS.stream().filter(regra -> regra.termos().stream().anyMatch(busca::contains)).map(RegraCategoria::categoria).findFirst().orElse(CATEGORIA_OUTROS);
    }

    private String removerAcentos(String valor) {
        return Normalizer.normalize(valor == null ? "" : valor, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
    private String normalizarUnidade(String unidade) {
        String valor = removerAcentos(unidade).trim();
        return switch (valor) { case "kg", "quilo", "quilos" -> "kg"; case "l", "litro", "litros" -> "litro"; default -> "unidade"; };
    }
    private BigDecimal economia(BigDecimal valor) {
        if (valor == null || valor.signum() < 0) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private HistoricoCompraResponse historicoCompra(
        String compraId,
        List<ObservacaoPreco> observacoes,
        Usuario usuario
    ) {
        ObservacaoPreco primeira = observacoes.get(0);
        BigDecimal total = observacoes.stream()
            .map(ObservacaoPreco::getSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal economia = observacoes.stream()
            .map(ObservacaoPreco::getEconomiaCompra)
            .filter(valor -> valor != null)
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO)
            .setScale(2, RoundingMode.HALF_UP);
        Instant realizadaEm = observacoes.stream()
            .map(ObservacaoPreco::getRealizadaEm)
            .max(Instant::compareTo)
            .orElse(primeira.getRealizadaEm());
        List<HistoricoItemResponse> itens = observacoes.stream()
            .map(this::historicoItem)
            .toList();

        return new HistoricoCompraResponse(
            compraId,
            realizadaEm,
            primeira.getMercado(),
            itens,
            itens.size(),
            total,
            economia,
            usuario.getId(),
            usuario.getNome()
        );
    }

    private HistoricoItemResponse historicoItem(ObservacaoPreco observacao) {
        boolean porPeso = "kg".equalsIgnoreCase(observacao.getUnidade());
        BigDecimal zero = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);

        return new HistoricoItemResponse(
            observacao.getItemChave(),
            observacao.getNomeOriginal(),
            observacao.getProduto().getCategoria(),
            porPeso ? "kg" : "unidade",
            porPeso ? zero : observacao.getQuantidade(),
            porPeso ? observacao.getQuantidade() : zero,
            observacao.getPrecoUnitario(),
            observacao.getPrecoUnitario(),
            observacao.getSubtotal()
        );
    }
    private String estado(String valor) { String limpo = opcional(valor, 2); return limpo == null ? null : limpo.toUpperCase(Locale.ROOT); }
    private String opcional(String valor, int tamanho) { if (valor == null || valor.isBlank()) return null; return limitar(valor, tamanho); }
    private String limitar(String valor, int tamanho) { String limpo = valor == null ? "" : valor.trim().replaceAll("\\s+", " "); return limpo.length() <= tamanho ? limpo : limpo.substring(0, tamanho); }

    public record CompraRequest(
        @NotBlank @Size(max = 120) String compraId,
        @NotNull Instant realizadaEm,
        @Size(max = 120) String mercado,
        @Size(max = 100) String cidade,
        @Size(max = 2) String estado,
        @DecimalMin("0.00") BigDecimal economia,
        @NotEmpty @Size(max = 500) List<@Valid ItemRequest> itens
    ) {
        public CompraRequest(
            String compraId,
            Instant realizadaEm,
            String mercado,
            String cidade,
            String estado,
            List<ItemRequest> itens
        ) {
            this(compraId, realizadaEm, mercado, cidade, estado, BigDecimal.ZERO, itens);
        }
    }
    public record ItemRequest(@NotBlank @Size(max = 120) String itemId, @NotBlank @Size(max = 180) String nome, @Size(max = 80) String categoria, @NotNull @DecimalMin("0.001") BigDecimal quantidade, @NotBlank @Size(max = 24) String unidade, @NotNull @DecimalMin("0.0001") BigDecimal precoUnitario, @NotNull @DecimalMin("0.01") BigDecimal subtotal) {}
    public record HistoricoCompraResponse(String id, Instant data, String supermercado, List<HistoricoItemResponse> itens, int totalItens, BigDecimal total, BigDecimal economia, UUID usuarioId, String usuarioNome) {}
    public record HistoricoItemResponse(String id, String nome, String categoria, String medida, BigDecimal quantidade, BigDecimal peso, BigDecimal preco, BigDecimal precoUnitario, BigDecimal subtotal) {}
    public record ResultadoColeta(int criadas, int ignoradas, int total) {}
    private record RegraCategoria(String categoria, List<String> termos) {}
}
