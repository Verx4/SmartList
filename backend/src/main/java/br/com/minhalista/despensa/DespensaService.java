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

    private final ItemDespensaRepository repository;
    private final UsuarioService usuarioService;

    public DespensaService(ItemDespensaRepository repository, UsuarioService usuarioService) {
        this.repository = repository;
        this.usuarioService = usuarioService;
    }

    @Transactional(readOnly = true)
    public List<ItemDespensaResponse> listar() {
        return listarDoUsuario(usuarioService.obterAutenticado()).stream().map(ItemDespensaResponse::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ItemDespensa> listarDoUsuario(Usuario usuario) {
        return repository.findByUsuarioIdOrderByNomeAsc(usuario.getId());
    }

    @Transactional
    public ItemDespensaResponse adicionar(ItemDespensaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        UnidadeCanonica valor = NormalizadorIngrediente.converter(request.quantidade(), request.unidade());
        return ItemDespensaResponse.de(somar(usuario, request.nome(), valor.quantidade(), valor.unidade()));
    }

    @Transactional
    public ItemDespensaResponse atualizar(UUID id, ItemDespensaRequest request) {
        Usuario usuario = usuarioService.obterAutenticado();
        ItemDespensa item = repository.findByIdAndUsuarioId(id, usuario.getId())
            .orElseThrow(() -> new RegraNegocioException(HttpStatus.NOT_FOUND, "Item da despensa não encontrado."));
        UnidadeCanonica valor = NormalizadorIngrediente.converter(request.quantidade(), request.unidade());
        item.setNome(request.nome().trim());
        item.setChaveProduto(NormalizadorIngrediente.chave(request.nome()));
        item.setQuantidade(valor.quantidade().setScale(3, RoundingMode.HALF_UP));
        item.setUnidade(valor.unidade());
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
        request.itens().forEach(item -> {
            UnidadeCanonica valor = NormalizadorIngrediente.converter(item.quantidade(), item.unidade());
            somar(usuario, item.nome(), valor.quantidade(), valor.unidade());
        });
        return listarDoUsuario(usuario).stream().map(ItemDespensaResponse::de).toList();
    }

    @Transactional
    public void adicionarCompra(Usuario usuario, List<ItemLista> itens) {
        itens.forEach(item -> {
            boolean porPeso = item.getPeso() != null && item.getPeso().signum() > 0;
            UnidadeCanonica valor = porPeso
                ? NormalizadorIngrediente.converter(item.getPeso(), "kg")
                : NormalizadorIngrediente.converter(BigDecimal.valueOf(item.getQuantidade()), item.getMedida());
            if (valor.quantidade().signum() > 0) {
                somar(usuario, item.getNome(), valor.quantidade(), valor.unidade());
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
                ).ifPresent(item -> {
                    item.setQuantidade(item.getQuantidade().subtract(necessario.quantidade()).max(BigDecimal.ZERO));
                    repository.save(item);
                });
            });
    }

    private ItemDespensa somar(Usuario usuario, String nome, BigDecimal quantidade, String unidade) {
        String chave = NormalizadorIngrediente.chave(nome);
        ItemDespensa item = repository.findByUsuarioIdAndChaveProdutoAndUnidade(usuario.getId(), chave, unidade)
            .orElseGet(() -> {
                ItemDespensa novo = new ItemDespensa();
                novo.setUsuario(usuario);
                novo.setNome(nome.trim());
                novo.setChaveProduto(chave);
                novo.setUnidade(unidade);
                novo.setQuantidade(BigDecimal.ZERO);
                return novo;
            });
        item.setQuantidade(item.getQuantidade().add(quantidade).max(BigDecimal.ZERO).setScale(3, RoundingMode.HALF_UP));
        return repository.save(item);
    }
}
