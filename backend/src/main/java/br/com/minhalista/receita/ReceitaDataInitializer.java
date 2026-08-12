package br.com.minhalista.receita;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Component
public class ReceitaDataInitializer implements ApplicationRunner {

    private final ReceitaRepository repository;
    private final ObjectMapper objectMapper;

    public ReceitaDataInitializer(ReceitaRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        try (InputStream entrada = new ClassPathResource("data/receitas.json").getInputStream()) {
            List<ReceitaCatalogo> catalogo = objectMapper.readValue(
                entrada,
                new TypeReference<List<ReceitaCatalogo>>() { }
            );
            repository.saveAll(catalogo.stream().map(origem -> mapear(
                origem,
                repository.findById(origem.id()).orElseGet(Receita::new)
            )).toList());
        }
    }

    private Receita mapear(ReceitaCatalogo origem, Receita receita) {
        receita.setId(origem.id());
        receita.setNome(origem.nome());
        receita.setDescricao(origem.descricao());
        receita.setIcone(origem.icone());
        receita.setCategoria(origem.categoria());
        receita.setTipo(origem.tipo());
        receita.setTempoMinutos(origem.tempoMinutos());
        receita.setDificuldade(origem.dificuldade());
        receita.setRendimento(origem.rendimento());
        receita.getUtensilios().clear();
        receita.getUtensilios().addAll(lista(origem.utensilios()));
        receita.getIngredientes().clear();
        receita.getPassos().clear();
        for (int indice = 0; indice < origem.ingredientes().size(); indice++) {
            IngredienteCatalogo item = origem.ingredientes().get(indice);
            IngredienteReceita ingrediente = new IngredienteReceita();
            ingrediente.setNome(item.nome());
            ingrediente.setChaveProduto(NormalizadorIngrediente.chave(item.nome()));
            ingrediente.setQuantidade(item.quantidade());
            ingrediente.setUnidade(item.unidade());
            ingrediente.setObrigatorio(item.obrigatorio());
            ingrediente.setBasico(item.basico());
            ingrediente.setOrdem(indice);
            receita.adicionarIngrediente(ingrediente);
        }
        for (int indice = 0; indice < origem.passos().size(); indice++) {
            PassoCatalogo item = origem.passos().get(indice);
            PassoReceita passo = new PassoReceita();
            passo.setTitulo(item.titulo());
            passo.setDescricao(item.descricao());
            for (IngredientePassoCatalogo usado : lista(item.ingredientes())) {
                IngredientePasso ingrediente = new IngredientePasso();
                ingrediente.setNome(usado.nome());
                ingrediente.setChaveProduto(NormalizadorIngrediente.chave(usado.nome()));
                ingrediente.setQuantidade(usado.quantidade());
                ingrediente.setUnidade(usado.unidade());
                passo.getIngredientes().add(ingrediente);
            }
            passo.getUtensilios().addAll(lista(item.utensilios()));
            passo.getContinueUsando().addAll(lista(item.continueUsando()));
            passo.getAcoes().addAll(
                item.acoes() == null || item.acoes().isEmpty()
                    ? List.of(item.descricao())
                    : item.acoes()
            );
            passo.setTempoAproximado(item.tempoAproximado());
            passo.setIntensidadeFogo(item.intensidadeFogo());
            passo.setPontoEsperado(item.pontoEsperado());
            passo.getObservacoes().addAll(lista(item.observacoes()));
            passo.setOrdem(indice);
            receita.adicionarPasso(passo);
        }
        return receita;
    }

    private <T> List<T> lista(List<T> itens) {
        return itens == null ? List.of() : itens;
    }

    private record ReceitaCatalogo(
        String id,
        String nome,
        String descricao,
        String icone,
        String categoria,
        String tipo,
        int tempoMinutos,
        String dificuldade,
        String rendimento,
        List<String> utensilios,
        List<IngredienteCatalogo> ingredientes,
        List<PassoCatalogo> passos
    ) { }

    private record IngredienteCatalogo(
        String nome,
        BigDecimal quantidade,
        String unidade,
        boolean obrigatorio,
        boolean basico
    ) { }

    private record PassoCatalogo(
        String titulo,
        String descricao,
        List<IngredientePassoCatalogo> ingredientes,
        List<String> utensilios,
        List<String> continueUsando,
        List<String> acoes,
        String tempoAproximado,
        String intensidadeFogo,
        String pontoEsperado,
        List<String> observacoes
    ) { }

    private record IngredientePassoCatalogo(
        String nome,
        BigDecimal quantidade,
        String unidade
    ) { }
}
