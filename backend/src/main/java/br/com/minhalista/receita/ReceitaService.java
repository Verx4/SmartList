package br.com.minhalista.receita;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.despensa.DespensaService;
import br.com.minhalista.despensa.ItemDespensa;
import br.com.minhalista.lista.ItemListaRequest;
import br.com.minhalista.lista.ListaCompraResponse;
import br.com.minhalista.lista.ListaCompraService;
import br.com.minhalista.receita.NormalizadorIngrediente.UnidadeCanonica;
import br.com.minhalista.receita.ReceitaResponse.IngredienteResponse;
import br.com.minhalista.receita.ReceitaResponse.PassoResponse;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class ReceitaService {

    private final ReceitaRepository receitaRepository;
    private final FavoritoReceitaRepository favoritoRepository;
    private final HistoricoReceitaRepository historicoRepository;
    private final DespensaService despensaService;
    private final ListaCompraService listaService;
    private final UsuarioService usuarioService;

    public ReceitaService(
        ReceitaRepository receitaRepository,
        FavoritoReceitaRepository favoritoRepository,
        HistoricoReceitaRepository historicoRepository,
        DespensaService despensaService,
        ListaCompraService listaService,
        UsuarioService usuarioService
    ) {
        this.receitaRepository = receitaRepository;
        this.favoritoRepository = favoritoRepository;
        this.historicoRepository = historicoRepository;
        this.despensaService = despensaService;
        this.listaService = listaService;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<ReceitaResponse> buscar(
        String busca,
        String ingredientes,
        String categoria,
        String tipo,
        String tempo,
        boolean somenteDisponiveis
    ) {
        Usuario usuario = usuarioService.obterAutenticado();
        Map<String, BigDecimal> inventario = inventario(usuario);
        Set<String> manuais = ingredientesManuais(ingredientes);
        Set<String> favoritas = favoritoRepository.findByUsuarioId(usuario.getId()).stream()
            .map(item -> item.getReceita().getId())
            .collect(java.util.stream.Collectors.toSet());
        String buscaNormalizada = NormalizadorIngrediente.chave(busca);

        return receitaRepository.findAll().stream()
            .filter(receita -> buscaNormalizada.isBlank()
                || NormalizadorIngrediente.chave(receita.getNome()).contains(buscaNormalizada))
            .filter(receita -> categoria == null || categoria.isBlank() || "todas".equals(categoria)
                || receita.getCategoria().equals(categoria))
            .filter(receita -> tipo == null || tipo.isBlank() || "todas".equals(tipo)
                || receita.getTipo().equals(tipo))
            .filter(receita -> tempoCompativel(receita.getTempoMinutos(), tempo))
            .map(receita -> avaliar(receita, inventario, manuais, favoritas.contains(receita.getId())))
            .filter(resultado -> !somenteDisponiveis || resultado.podeFazer())
            .sorted(Comparator
                .comparingInt((ReceitaResponse item) -> item.faltantes().size())
                .thenComparing(ReceitaResponse::compatibilidade, Comparator.reverseOrder())
                .thenComparingInt(ReceitaResponse::tempoMinutos))
            .toList();
    }

    @Transactional(readOnly = true)
    public ReceitaResponse obter(String id) {
        Usuario usuario = usuarioService.obterAutenticado();
        Receita receita = obterEntidade(id);
        return avaliar(
            receita,
            inventario(usuario),
            Set.of(),
            favoritoRepository.existsByUsuarioIdAndReceitaId(usuario.getId(), id)
        );
    }

    @Transactional(readOnly = true)
    public List<ReceitaResponse> favoritas() {
        Usuario usuario = usuarioService.obterAutenticado();
        Map<String, BigDecimal> inventario = inventario(usuario);
        return favoritoRepository.findByUsuarioId(usuario.getId()).stream()
            .map(FavoritoReceita::getReceita)
            .map(receita -> avaliar(receita, inventario, Set.of(), true))
            .toList();
    }

    @Transactional
    public void favoritar(String id) {
        Usuario usuario = usuarioService.obterAutenticado();
        if (favoritoRepository.existsByUsuarioIdAndReceitaId(usuario.getId(), id)) return;
        FavoritoReceita favorito = new FavoritoReceita();
        favorito.setUsuario(usuario);
        favorito.setReceita(obterEntidade(id));
        favoritoRepository.save(favorito);
    }

    @Transactional
    public void desfavoritar(String id) {
        Usuario usuario = usuarioService.obterAutenticado();
        favoritoRepository.findByUsuarioIdAndReceitaId(usuario.getId(), id).ifPresent(favoritoRepository::delete);
    }

    @Transactional
    public ListaCompraResponse adicionarFaltantesALista(String id) {
        Usuario usuario = usuarioService.obterAutenticado();
        ReceitaResponse avaliacao = avaliar(obterEntidade(id), inventario(usuario), Set.of(), false);
        List<ItemListaRequest> itens = avaliacao.faltantes().stream().map(this::itemLista).toList();
        return listaService.adicionarItens(itens);
    }

    @Transactional
    public HistoricoReceitaResponse finalizar(String id, boolean atualizarDespensa) {
        Usuario usuario = usuarioService.obterAutenticado();
        Receita receita = obterEntidade(id);
        if (atualizarDespensa) {
            despensaService.descontar(usuario, receita.getIngredientes());
        }
        HistoricoReceita historico = new HistoricoReceita();
        historico.setUsuario(usuario);
        historico.setReceita(receita);
        historico.setDespensaAtualizada(atualizarDespensa);
        return HistoricoReceitaResponse.de(historicoRepository.save(historico));
    }

    @Transactional(readOnly = true)
    public List<HistoricoReceitaResponse> historico() {
        Usuario usuario = usuarioService.obterAutenticado();
        return historicoRepository.findByUsuarioIdOrderByPreparadaEmDesc(usuario.getId()).stream()
            .map(HistoricoReceitaResponse::de)
            .toList();
    }

    private ReceitaResponse avaliar(
        Receita receita,
        Map<String, BigDecimal> inventario,
        Set<String> manuais,
        boolean favorita
    ) {
        List<IngredienteResponse> ingredientes = receita.getIngredientes().stream()
            .map(item -> avaliarIngrediente(item, inventario, manuais))
            .toList();
        List<IngredienteResponse> obrigatorios = ingredientes.stream()
            .filter(IngredienteResponse::obrigatorio)
            .filter(item -> !item.basico())
            .toList();
        List<IngredienteResponse> faltantes = obrigatorios.stream()
            .filter(item -> !item.suficiente())
            .toList();
        int disponiveis = obrigatorios.size() - faltantes.size();
        BigDecimal compatibilidade = obrigatorios.isEmpty()
            ? BigDecimal.ONE
            : BigDecimal.valueOf(disponiveis)
                .divide(BigDecimal.valueOf(obrigatorios.size()), 4, RoundingMode.HALF_UP);
        List<PassoResponse> passos = receita.getPassos().stream()
            .map(passo -> new PassoResponse(passo.getOrdem() + 1, passo.getTitulo(), passo.getDescricao()))
            .toList();

        return new ReceitaResponse(
            receita.getId(),
            receita.getNome(),
            receita.getDescricao(),
            receita.getIcone(),
            receita.getCategoria(),
            receita.getTipo(),
            receita.getTempoMinutos(),
            receita.getDificuldade(),
            receita.getRendimento(),
            ingredientes,
            passos,
            disponiveis,
            obrigatorios.size(),
            faltantes,
            compatibilidade,
            faltantes.isEmpty(),
            favorita
        );
    }

    private IngredienteResponse avaliarIngrediente(
        IngredienteReceita ingrediente,
        Map<String, BigDecimal> inventario,
        Set<String> manuais
    ) {
        UnidadeCanonica necessario = NormalizadorIngrediente.converter(
            ingrediente.getQuantidade(),
            ingrediente.getUnidade()
        );
        String chave = ingrediente.getChaveProduto() + "::" + necessario.unidade();
        BigDecimal disponivel = manuais.contains(ingrediente.getChaveProduto())
            ? necessario.quantidade()
            : inventario.getOrDefault(chave, BigDecimal.ZERO);
        boolean suficiente = !ingrediente.isObrigatorio()
            || ingrediente.isBasico()
            || disponivel.compareTo(necessario.quantidade()) >= 0;
        BigDecimal falta = suficiente
            ? BigDecimal.ZERO
            : necessario.quantidade().subtract(disponivel).max(BigDecimal.ZERO);
        return new IngredienteResponse(
            ingrediente.getNome(),
            ingrediente.getChaveProduto(),
            ingrediente.getQuantidade(),
            ingrediente.getUnidade(),
            ingrediente.isObrigatorio(),
            ingrediente.isBasico(),
            disponivel,
            falta,
            necessario.unidade(),
            suficiente
        );
    }

    private Map<String, BigDecimal> inventario(Usuario usuario) {
        Map<String, BigDecimal> resultado = new HashMap<>();
        for (ItemDespensa item : despensaService.listarDoUsuario(usuario)) {
            String chave = item.getChaveProduto() + "::" + item.getUnidade();
            resultado.merge(chave, item.getQuantidade(), BigDecimal::add);
        }
        return resultado;
    }

    private Set<String> ingredientesManuais(String texto) {
        if (texto == null || texto.isBlank()) return Set.of();
        Set<String> resultado = new HashSet<>();
        Arrays.stream(texto.split(","))
            .map(NormalizadorIngrediente::chave)
            .filter(item -> !item.isBlank())
            .forEach(resultado::add);
        return resultado;
    }

    private boolean tempoCompativel(int minutos, String filtro) {
        if (filtro == null || filtro.isBlank() || "todos".equals(filtro)) return true;
        return switch (filtro) {
            case "ate-20" -> minutos <= 20;
            case "ate-30" -> minutos <= 30;
            case "20-30" -> minutos >= 20 && minutos <= 30;
            case "40-50" -> minutos >= 40 && minutos <= 50;
            case "60-mais" -> minutos >= 60;
            default -> true;
        };
    }

    private ItemListaRequest itemLista(IngredienteResponse falta) {
        BigDecimal peso = BigDecimal.ZERO;
        int quantidade = 1;
        String medida = falta.unidadeCanonica();
        if ("g".equals(falta.unidadeCanonica())) {
            peso = falta.falta().divide(BigDecimal.valueOf(1000), 3, RoundingMode.UP);
            medida = "kg";
        } else if ("unidade".equals(falta.unidadeCanonica())) {
            quantidade = Math.max(1, falta.falta().setScale(0, RoundingMode.UP).intValue());
        }
        return new ItemListaRequest(
            falta.nome(),
            "Outros",
            medida,
            quantidade,
            BigDecimal.ZERO,
            peso,
            false
        );
    }

    private Receita obterEntidade(String id) {
        return receitaRepository.findById(id)
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Receita não encontrada."));
    }
}
