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
import br.com.minhalista.receita.ReceitaResponse.IngredientePassoResponse;
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
        Map<String, Disponibilidade> inventario = inventario(usuario);
        Set<String> manuais = ingredientesManuais(ingredientes);
        Set<String> favoritas = favoritoRepository.findByUsuarioId(usuario.getId()).stream()
            .map(item -> item.getReceita().getId())
            .collect(java.util.stream.Collectors.toSet());
        String buscaNormalizada = NormalizadorIngrediente.chave(busca);

        return receitaRepository.findAll().stream()
            .filter(receita -> buscaCompativel(receita, buscaNormalizada))
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
        Map<String, Disponibilidade> inventario = inventario(usuario);
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
        Map<String, Disponibilidade> inventario,
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
            .filter(item -> !item.presente() || (item.quantidadeConhecida() && !item.suficiente()))
            .toList();
        List<IngredienteResponse> quantidadesDesconhecidas = obrigatorios.stream()
            .filter(IngredienteResponse::presente)
            .filter(item -> !item.quantidadeConhecida())
            .toList();
        int disponiveis = (int) obrigatorios.stream().filter(IngredienteResponse::presente).count();
        BigDecimal compatibilidade = obrigatorios.isEmpty()
            ? BigDecimal.ONE
            : BigDecimal.valueOf(disponiveis)
                .divide(BigDecimal.valueOf(obrigatorios.size()), 4, RoundingMode.HALF_UP);
        List<PassoResponse> passos = receita.getPassos().stream()
            .map(passo -> new PassoResponse(
                passo.getOrdem() + 1,
                passo.getTitulo(),
                passo.getDescricao(),
                passo.getIngredientes().stream()
                    .map(item -> new IngredientePassoResponse(
                        item.getNome(),
                        item.getQuantidade(),
                        item.getUnidade()
                    ))
                    .toList(),
                passo.getUtensilios(),
                passo.getContinueUsando(),
                passo.getAcoes(),
                passo.getTempoAproximado(),
                passo.getIntensidadeFogo(),
                passo.getPontoEsperado(),
                passo.getObservacoes()
            ))
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
            receita.getOrigem(),
            receita.getFonte(),
            receita.getReferenciaExterna(),
            receita.getUtensilios(),
            ingredientes,
            passos,
            disponiveis,
            obrigatorios.size(),
            faltantes,
            quantidadesDesconhecidas,
            compatibilidade,
            faltantes.isEmpty() && quantidadesDesconhecidas.isEmpty(),
            favorita
        );
    }

    private IngredienteResponse avaliarIngrediente(
        IngredienteReceita ingrediente,
        Map<String, Disponibilidade> inventario,
        Set<String> manuais
    ) {
        UnidadeCanonica necessario = NormalizadorIngrediente.converter(
            ingrediente.getQuantidade(),
            ingrediente.getUnidade()
        );
        String chave = ingrediente.getChaveProduto() + "::" + necessario.unidade();
        Disponibilidade disponibilidade = manuais.contains(ingrediente.getChaveProduto())
            ? new Disponibilidade(BigDecimal.ZERO, false)
            : inventario.get(chave);
        if (disponibilidade == null) {
            disponibilidade = inventario.entrySet().stream()
                .filter(item -> item.getKey().startsWith(ingrediente.getChaveProduto() + "::"))
                .map(Map.Entry::getValue)
                .filter(item -> !item.conhecida())
                .findFirst()
                .orElse(null);
        }
        boolean presente = disponibilidade != null;
        boolean quantidadeConhecida = presente && disponibilidade.conhecida();
        BigDecimal disponivel = quantidadeConhecida ? disponibilidade.quantidade() : null;
        boolean suficiente = !ingrediente.isObrigatorio()
            || ingrediente.isBasico()
            || (quantidadeConhecida && disponivel.compareTo(necessario.quantidade()) >= 0);
        BigDecimal falta = suficiente || (presente && !quantidadeConhecida)
            ? BigDecimal.ZERO
            : necessario.quantidade().subtract(disponivel == null ? BigDecimal.ZERO : disponivel).max(BigDecimal.ZERO);
        return new IngredienteResponse(
            ingrediente.getNome(),
            ingrediente.getChaveProduto(),
            ingrediente.getQuantidade(),
            ingrediente.getUnidade(),
            ingrediente.isObrigatorio(),
            ingrediente.isBasico(),
            disponivel,
            presente || ingrediente.isBasico(),
            quantidadeConhecida || ingrediente.isBasico(),
            falta,
            necessario.unidade(),
            suficiente
        );
    }

    private Map<String, Disponibilidade> inventario(Usuario usuario) {
        Map<String, Disponibilidade> resultado = new HashMap<>();
        for (ItemDespensa item : despensaService.listarDoUsuario(usuario)) {
            String chave = item.getChaveProduto() + "::" + item.getUnidade();
            resultado.merge(
                chave,
                new Disponibilidade(item.getQuantidade(), item.isQuantidadeConhecida()),
                (atual, novo) -> atual.conhecida() && novo.conhecida()
                    ? new Disponibilidade(atual.quantidade().add(novo.quantidade()), true)
                    : new Disponibilidade(BigDecimal.ZERO, false)
            );
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

    private boolean buscaCompativel(Receita receita, String busca) {
        if (busca.isBlank()) return true;
        List<String> campos = new java.util.ArrayList<>();
        campos.add(NormalizadorIngrediente.chave(receita.getNome()));
        receita.getIngredientes().stream().map(IngredienteReceita::getNome)
            .map(NormalizadorIngrediente::chave).forEach(campos::add);
        if (campos.stream().anyMatch(campo -> campo.contains(busca))) return true;
        if (busca.length() < 5) return false;
        return campos.stream().flatMap(campo -> Arrays.stream(campo.split("\\s+")))
            .anyMatch(palavra -> Math.abs(palavra.length() - busca.length()) <= 1
                && distanciaEdicao(palavra, busca) <= 1);
    }

    private int distanciaEdicao(String origem, String destino) {
        int[] anterior = java.util.stream.IntStream.rangeClosed(0, destino.length()).toArray();
        for (int i = 1; i <= origem.length(); i++) {
            int[] atual = new int[destino.length() + 1];
            atual[0] = i;
            for (int j = 1; j <= destino.length(); j++) {
                int custo = origem.charAt(i - 1) == destino.charAt(j - 1) ? 0 : 1;
                atual[j] = Math.min(Math.min(atual[j - 1] + 1, anterior[j] + 1), anterior[j - 1] + custo);
            }
            anterior = atual;
        }
        return anterior[destino.length()];
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

    private record Disponibilidade(BigDecimal quantidade, boolean conhecida) { }
}
