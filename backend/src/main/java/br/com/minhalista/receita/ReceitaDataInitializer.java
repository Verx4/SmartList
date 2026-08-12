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
        if (repository.count() > 0) return;
        try (InputStream entrada = new ClassPathResource("data/receitas.json").getInputStream()) {
            List<ReceitaCatalogo> catalogo = objectMapper.readValue(
                entrada,
                new TypeReference<List<ReceitaCatalogo>>() { }
            );
            repository.saveAll(catalogo.stream().map(this::mapear).toList());
        }
    }

    private Receita mapear(ReceitaCatalogo origem) {
        Receita receita = new Receita();
        receita.setId(origem.id());
        receita.setNome(origem.nome());
        receita.setDescricao(origem.descricao());
        receita.setIcone(origem.icone());
        receita.setCategoria(origem.categoria());
        receita.setTipo(origem.tipo());
        receita.setTempoMinutos(origem.tempoMinutos());
        receita.setDificuldade(origem.dificuldade());
        receita.setRendimento(origem.rendimento());
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
            passo.setOrdem(indice);
            receita.adicionarPasso(passo);
        }
        return receita;
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

    private record PassoCatalogo(String titulo, String descricao) { }
}
