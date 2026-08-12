package br.com.minhalista.despensa;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.common.RegraNegocioException;
import br.com.minhalista.lista.ItemLista;
import br.com.minhalista.receita.IngredienteReceita;
import br.com.minhalista.receita.NormalizadorIngrediente;
import br.com.minhalista.receita.NormalizadorIngrediente.UnidadeCanonica;
import br.com.minhalista.usuario.Usuario;
import br.com.minhalista.usuario.UsuarioService;

@Service
public class DespensaService {

    private static final String MENSAGEM_NAO_ALIMENTO =
        "Este item não é classificado como alimento e não pode ser adicionado à Despensa de Receitas.";

    private final ItemDespensaRepository repository;
    private final UsuarioService usuarioService;
    private final ClassificadorProduto classificador;

    public DespensaService(
        ItemDespensaRepository repository,
        UsuarioService usuarioService,
        ClassificadorProduto classificador
    ) {
        this.repository = repository;
        this.usuarioService = usuarioService;
        this.classificador = classificador;
    }

    @Transactional(readOnly = true)
    public List<ItemDespensaResponse> listar() {
        return listarDoUsuario(usuarioService.obterAutenticado()).stream()
            .map(ItemDespensaResponse::de)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ItemDespensa> listarDoUsuario(Usuario usuario) {
        return repository.findByUsuarioIdOrderByNomeAsc(usuario.getId()).stream()
            .filter(item -> classificador.permitidoNaDespensa(item.getNome(), item.getCategoria()))
            .toList();
    }

    @Transactional
    public ItemDespensaResponse adicionar(ItemDespensaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        validarAlimento(request.nome(), request.categoria());
        boolean conhecida = request.quantidade() != null;
        UnidadeCanonica valor = NormalizadorIngrediente.converter(request.quantidade(), request.unidade());
        ItemDespensa item = somar(
            usuario,
            request.nome(),
            valor.quantidade(),
            valor.unidade(),
            conhecida,
            categoria(request.categoria())
        );
        return ItemDespensaResponse.de(item);
    }

    @Transactional
    public ItemDespensaResponse atualizar(UUID id, ItemDespensaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        ItemDespensa item = repository.findByIdAndUsuarioId(id, usuario.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Item da despensa não encontrado."));
        validarAlimento(request.nome(), request.categoria());
        boolean conhecida = request.quantidade() != null;
        UnidadeCanonica valor = NormalizadorIngrediente.converter(request.quantidade(), request.unidade());
        item.setNome(request.nome().trim());
        item.setChaveProduto(NormalizadorIngrediente.chave(request.nome()));
        item.setQuantidade(valor.quantidade().setScale(3, RoundingMode.HALF_UP));
        item.setQuantidadeConhecida(conhecida);
        item.setUnidade(valor.unidade());
        item.setCategoria(categoria(request.categoria()));
        return ItemDespensaResponse.de(repository.save(item));
    }

    @Transactional
    public void remover(UUID id) {
        Usuario usuario = usuarioService.obterAutenticado();
        ItemDespensa item = repository.findByIdAndUsuarioId(id, usuario.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Item da despensa não encontrado."));
        repository.delete(item);
    }

    @Transactional
    public List<ItemDespensaResponse> adicionarCompra(CompraDespensaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        request.itens().stream()
            .filter(item -> classificador.permitidoNaDespensa(item.nome(), item.categoria()))
            .forEach(item -> {
                UnidadeCanonica valor = NormalizadorIngrediente.converter(item.quantidade(), item.unidade());
                somar(usuario, item.nome(), valor.quantidade(), valor.unidade(), true, categoria(item.categoria()));
            });
        return listarDoUsuario(usuario).stream().map(ItemDespensaResponse::de).toList();
    }

    @Transactional
    public void adicionarCompra(Usuario usuario, List<ItemLista> itens) {
        itens.stream()
            .filter(item -> classificador.permitidoNaDespensa(item.getNome(), item.getCategoria()))
            .forEach(item -> {
                boolean porPeso = item.getPeso() != null && item.getPeso().signum() > 0;
                UnidadeCanonica valor = porPeso
                    ? NormalizadorIngrediente.converter(item.getPeso(), "kg")
                    : NormalizadorIngrediente.converter(BigDecimal.valueOf(item.getQuantidade()), item.getMedida());
                if (valor.quantidade().signum() > 0) {
                    somar(
                        usuario,
                        item.getNome(),
                        valor.quantidade(),
                        valor.unidade(),
                        true,
                        categoria(item.getCategoria())
                    );
                }
            });
    }

    @Transactional
    public void descontar(Usuario usuario, List<IngredienteReceita> ingredientes) {
        ingredientes.stream()
            .filter(IngredienteReceita::isObrigatorio)
            .filter(item -> !item.isBasico())
            .forEach(ingrediente -> {
                UnidadeCanonica necessario = NormalizadorIngrediente.converter(
                    ingrediente.getQuantidade(),
                    ingrediente.getUnidade()
                );
                repository.findByUsuarioIdAndChaveProdutoAndUnidade(
                    usuario.getId(),
                    ingrediente.getChaveProduto(),
                    necessario.unidade()
                ).filter(ItemDespensa::isQuantidadeConhecida).ifPresent(item -> {
                    item.setQuantidade(item.getQuantidade().subtract(necessario.quantidade()).max(BigDecimal.ZERO));
                    repository.save(item);
                });
            });
    }

    private ItemDespensa somar(
        Usuario usuario,
        String nome,
        BigDecimal quantidade,
        String unidade,
        boolean quantidadeConhecida,
        String categoria
    ) {
        String chave = NormalizadorIngrediente.chave(nome);
        ItemDespensa item = repository.findByUsuarioIdAndChaveProdutoAndUnidade(usuario.getId(), chave, unidade)
            .or(() -> repository.findFirstByUsuarioIdAndChaveProduto(usuario.getId(), chave))
            .orElseGet(() -> {
                ItemDespensa novo = new ItemDespensa();
                novo.setUsuario(usuario);
                novo.setNome(nome.trim());
                novo.setChaveProduto(chave);
                novo.setUnidade(unidade);
                novo.setQuantidade(BigDecimal.ZERO);
                novo.setQuantidadeConhecida(quantidadeConhecida);
                return novo;
            });
        item.setCategoria(categoria);
        if (item.isQuantidadeConhecida() && quantidadeConhecida && item.getUnidade().equals(unidade)) {
            item.setQuantidade(item.getQuantidade().add(quantidade).max(BigDecimal.ZERO).setScale(3, RoundingMode.HALF_UP));
        } else {
            item.setQuantidadeConhecida(false);
        }
        return repository.save(item);
    }

    private void validarAlimento(String nome, String categoria) {
        if (!classificador.permitidoNaDespensa(nome, categoria)) {
            throw new RegraNegocioException(HttpStatus.BAD_REQUEST, MENSAGEM_NAO_ALIMENTO);
        }
    }

    private String categoria(String valor) {
        return valor == null || valor.isBlank() ? "Alimento" : valor.trim();
    }
}
