package br.com.minhalista.lista;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.mercado.Mercado;
import br.com.minhalista.mercado.MercadoService;
import br.com.minhalista.preco.ColetaPrecoService;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class ListaCompraService {

    private final ListaCompraRepository listaRepository;
    private final ItemListaRepository itemRepository;
    private final UsuarioService usuarioService;
    private final MercadoService mercadoService;
    private final ColetaPrecoService coletaPrecoService;

    public ListaCompraService(
        ListaCompraRepository listaRepository,
        ItemListaRepository itemRepository,
        UsuarioService usuarioService,
        MercadoService mercadoService,
        ColetaPrecoService coletaPrecoService
    ) {
        this.listaRepository = listaRepository;
        this.itemRepository = itemRepository;
        this.usuarioService = usuarioService;
        this.mercadoService = mercadoService;
        this.coletaPrecoService = coletaPrecoService;
    }

    @Transactional
    public ListaCompraResponse obterAtual() {
        Usuario usuario = usuarioService.obterAutenticado();
        return montarResposta(obterOuCriarAtual(usuario));
    }

    @Transactional
    public ListaCompraResponse atualizarAtual(AtualizarListaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        ListaCompra lista = obterOuCriarAtual(usuario);

        if (request.nome() != null && !request.nome().isBlank()) {
            lista.setNome(request.nome().trim());
        }

        if (request.orcamento() != null) {
            lista.setOrcamento(moeda(request.orcamento()));
        }

        if (request.mercadoId() != null) {
            lista.setMercado(mercadoService.obterDoUsuario(request.mercadoId(), usuario));
        }

        return montarResposta(listaRepository.save(lista));
    }

    @Transactional
    public ListaCompraResponse adicionarItem(ItemListaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        ListaCompra lista = obterOuCriarAtual(usuario);
        ItemLista item = new ItemLista();
        preencherItem(item, request);
        lista.adicionarItem(item);
        return montarResposta(listaRepository.save(lista));
    }

    @Transactional
    public ListaCompraResponse atualizarItem(UUID itemId, ItemListaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        ListaCompra lista = obterOuCriarAtual(usuario);
        ItemLista item = itemRepository.findByIdAndListaId(itemId, lista.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Item não encontrado."));

        preencherItem(item, request);
        itemRepository.save(item);
        return montarResposta(lista);
    }

    @Transactional
    public ListaCompraResponse removerItem(UUID itemId) {
        Usuario usuario = usuarioService.obterAutenticado();
        ListaCompra lista = obterOuCriarAtual(usuario);
        ItemLista item = itemRepository.findByIdAndListaId(itemId, lista.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Item não encontrado."));

        String nomeRemovido = item.getNome();
        lista.removerItem(item);
        ListaCompra salva = listaRepository.save(lista);
        coletaPrecoService.removerProdutoSemObservacoesPorNome(nomeRemovido);
        return montarResposta(salva);
    }

    @Transactional
    public ListaCompraResponse finalizar() {
        Usuario usuario = usuarioService.obterAutenticado();
        ListaCompra lista = obterOuCriarAtual(usuario);

        if (lista.getItens().isEmpty()) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Adicione pelo menos um item antes de finalizar a compra."
            );
        }

        if (lista.getMercado() == null) {
            throw new RegraNegocioException(
                HttpStatus.BAD_REQUEST,
                "Selecione um mercado antes de finalizar a compra."
            );
        }

        BigDecimal total = calcularTotal(lista);
        lista.setTotalFinal(total);
        lista.setEconomia(BigDecimal.ZERO);
        lista.setStatus(StatusLista.FINALIZADA);
        lista.setFinalizadoEm(Instant.now());

        ListaCompra finalizada = listaRepository.save(lista);
        coletaPrecoService.coletar(usuario, finalizada);
        return montarResposta(finalizada);
    }

    @Transactional(readOnly = true)
    public List<ListaCompraResponse> historico() {
        Usuario usuario = usuarioService.obterAutenticado();
        usuarioService.exigirPremium(usuario);

        return listaRepository
            .findByUsuarioIdAndStatusAndOcultaParaUsuarioFalseOrderByFinalizadoEmDesc(
                usuario.getId(),
                StatusLista.FINALIZADA
            )
            .stream()
            .map(this::montarResposta)
            .toList();
    }

    @Transactional
    public void excluir(UUID id) {
        Usuario usuario = usuarioService.obterAutenticado();
        ListaCompra lista = listaRepository.findByIdAndUsuarioId(id, usuario.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Lista não encontrada."));
        if (lista.getStatus() == StatusLista.FINALIZADA) {
            lista.setOcultaParaUsuario(true);
            listaRepository.save(lista);
            return;
        }

        listaRepository.delete(lista);
    }

    private ListaCompra obterOuCriarAtual(Usuario usuario) {
        return listaRepository
            .findFirstByUsuarioIdAndStatusOrderByCriadoEmDesc(usuario.getId(), StatusLista.ABERTA)
            .orElseGet(() -> {
                ListaCompra lista = new ListaCompra();
                lista.setUsuario(usuario);
                lista.setNome("Minha lista");
                return listaRepository.save(lista);
            });
    }

    private void preencherItem(ItemLista item, ItemListaRequest request) {
        item.setNome(request.nome().trim());
        item.setCategoria(
            request.categoria() == null || request.categoria().isBlank()
                ? "Outros"
                : request.categoria().trim()
        );
        item.setQuantidade(request.quantidade() == null ? 1 : request.quantidade());
        item.setPreco(moeda(request.preco()));
        item.setPeso(peso(request.peso()));
        item.setFavorito(Boolean.TRUE.equals(request.favorito()));
    }

    private ListaCompraResponse montarResposta(ListaCompra lista) {
        BigDecimal total = lista.getStatus() == StatusLista.FINALIZADA
            ? lista.getTotalFinal()
            : calcularTotal(lista);
        BigDecimal saldo = lista.getOrcamento().subtract(total).setScale(2, RoundingMode.HALF_UP);
        Mercado mercado = lista.getMercado();

        return new ListaCompraResponse(
            lista.getId(),
            lista.getNome(),
            lista.getOrcamento(),
            total,
            saldo,
            lista.getEconomia(),
            lista.getStatus().name(),
            mercado == null ? null : mercado.getId(),
            mercado == null ? null : mercado.getNome(),
            lista.getItens().stream().map(ItemListaResponse::de).toList(),
            lista.getUsuario().getNome(),
            lista.getCriadoEm(),
            lista.getFinalizadoEm()
        );
    }

    private BigDecimal calcularTotal(ListaCompra lista) {
        return lista.getItens().stream()
            .map(ItemLista::calcularSubtotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal moeda(BigDecimal valor) {
        if (valor == null || valor.signum() < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal peso(BigDecimal valor) {
        if (valor == null || valor.signum() < 0) {
            return BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        }

        return valor.setScale(3, RoundingMode.HALF_UP);
    }
}
