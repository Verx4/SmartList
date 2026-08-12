package br.com.minhalista.receita;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.minhalista.receita.GerarReceitaRequest.ItemDespensaIa;

@Service
public class CatalogoReceitasService {

    private final ReceitaRepository repository;
    private final TheMealDbReceitaProvider theMealDb;
    private final OpenAiReceitaProvider openAi;

    public CatalogoReceitasService(
        ReceitaRepository repository,
        TheMealDbReceitaProvider theMealDb,
        OpenAiReceitaProvider openAi
    ) {
        this.repository = repository;
        this.theMealDb = theMealDb;
        this.openAi = openAi;
    }

    @Transactional
    public List<String> buscarEImportar(String busca) {
        return theMealDb.buscar(busca).stream().map(this::salvar).toList();
    }

    @Transactional
    public String gerarEImportar(String busca, List<ItemDespensaIa> despensa) {
        return salvar(openAi.gerar(busca, despensa));
    }

    private String salvar(ReceitaEstruturada origem) {
        Receita receita = repository.findById(origem.id()).orElseGet(Receita::new);
        receita.setId(limitar(origem.id(), 100));
        receita.setNome(limitar(origem.nome(), 160));
        receita.setDescricao(limitar(origem.descricao(), 600));
        receita.setIcone(limitar(origem.icone(), 12));
        receita.setCategoria(limitar(origem.categoria(), 40));
        receita.setTipo(limitar(origem.tipo(), 20));
        receita.setTempoMinutos(Math.max(0, origem.tempoMinutos()));
        receita.setDificuldade(limitar(origem.dificuldade(), 30));
        receita.setRendimento(limitar(origem.rendimento(), 80));
        receita.setOrigem(limitar(origem.origem(), 30));
        receita.setFonte(limitar(origem.fonte(), 100));
        receita.setReferenciaExterna(limitarNulo(origem.referenciaExterna(), 600));
        receita.getUtensilios().clear();
        receita.getUtensilios().addAll(lista(origem.utensilios()).stream().map(item -> limitar(item, 160)).toList());
        receita.getIngredientes().clear();
        receita.getPassos().clear();
        Set<String> ingredientesGerais = new HashSet<>();
        for (int indice = 0; indice < lista(origem.ingredientes()).size(); indice++) {
            ReceitaEstruturada.IngredienteEstruturado item = origem.ingredientes().get(indice);
            if (item.nome() == null || item.nome().isBlank()) continue;
            IngredienteReceita ingrediente = new IngredienteReceita();
            ingrediente.setNome(limitar(item.nome(), 160));
            ingrediente.setChaveProduto(NormalizadorIngrediente.chave(item.nome()));
            ingrediente.setQuantidade(item.quantidade() == null ? java.math.BigDecimal.ONE : item.quantidade().max(java.math.BigDecimal.ZERO));
            ingrediente.setUnidade(limitar(item.unidade(), 30));
            ingrediente.setObrigatorio(item.obrigatorio());
            ingrediente.setBasico(item.basico());
            ingrediente.setOrdem(indice);
            receita.adicionarIngrediente(ingrediente);
            ingredientesGerais.add(ingrediente.getChaveProduto());
        }
        for (int indice = 0; indice < lista(origem.passos()).size(); indice++) {
            ReceitaEstruturada.PassoEstruturado item = origem.passos().get(indice);
            PassoReceita passo = new PassoReceita();
            passo.setTitulo(limitar(item.titulo(), 160));
            passo.setDescricao(limitar(item.descricao(), 1200));
            for (ReceitaEstruturada.IngredientePassoEstruturado usado : lista(item.ingredientes())) {
                if (!ingredientesGerais.contains(NormalizadorIngrediente.chave(usado.nome()))) continue;
                IngredientePasso ingrediente = new IngredientePasso();
                ingrediente.setNome(limitar(usado.nome(), 160));
                ingrediente.setChaveProduto(NormalizadorIngrediente.chave(usado.nome()));
                ingrediente.setQuantidade(usado.quantidade() == null ? java.math.BigDecimal.ZERO : usado.quantidade().max(java.math.BigDecimal.ZERO));
                ingrediente.setUnidade(limitar(usado.unidade(), 30));
                passo.getIngredientes().add(ingrediente);
            }
            passo.getUtensilios().addAll(limitarLista(item.utensilios(), 160));
            passo.getContinueUsando().addAll(limitarLista(item.continueUsando(), 160));
            passo.getAcoes().addAll(limitarLista(item.acoes(), 1200));
            if (passo.getAcoes().isEmpty()) passo.getAcoes().add(passo.getDescricao());
            passo.setTempoAproximado(limitarNulo(item.tempoAproximado(), 120));
            passo.setIntensidadeFogo(limitarNulo(item.intensidadeFogo(), 160));
            passo.setPontoEsperado(limitarNulo(item.pontoEsperado(), 1200));
            passo.getObservacoes().addAll(limitarLista(item.observacoes(), 1200));
            passo.setOrdem(indice);
            receita.adicionarPasso(passo);
        }
        return repository.save(receita).getId();
    }

    private List<String> limitarLista(List<String> valores, int limite) {
        return lista(valores).stream().filter(item -> item != null && !item.isBlank()).map(item -> limitar(item, limite)).toList();
    }

    private String limitar(String valor, int limite) {
        String seguro = valor == null ? "" : valor.trim();
        return seguro.length() <= limite ? seguro : seguro.substring(0, limite);
    }

    private String limitarNulo(String valor, int limite) {
        if (valor == null || valor.isBlank()) return null;
        return limitar(valor, limite);
    }

    private <T> List<T> lista(List<T> itens) {
        return itens == null ? List.of() : itens;
    }
}
