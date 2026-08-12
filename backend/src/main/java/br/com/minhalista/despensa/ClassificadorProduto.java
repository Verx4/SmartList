package br.com.minhalista.despensa;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

@Component
public class ClassificadorProduto {

    private static final Set<String> CATEGORIAS_ALIMENTO = Set.of(
        "laticinios", "carnes", "frango", "peixes", "hortifruti", "padaria",
        "graos", "mercearia", "doces", "snacks", "enlatados", "conservas",
        "congelados", "temperos"
    );
    private static final Set<String> CATEGORIAS_BEBIDA = Set.of("bebidas", "energeticos", "alcoolicas");
    private static final Set<String> CATEGORIAS_LIMPEZA = Set.of("limpeza");
    private static final Set<String> CATEGORIAS_HIGIENE = Set.of("higiene", "farmacia");
    private static final Set<String> CATEGORIAS_DOMESTICO = Set.of("descartaveis", "utilidades");

    private static final List<String> ALIMENTOS = List.of(
        "arroz", "feijao", "macarrao", "massa", "aveia", "cereal", "grao", "lentilha",
        "ervilha", "farinha", "fuba", "flocao", "tapioca", "polvilho", "acucar", "sal",
        "pao", "ovo", "leite", "queijo", "iogurte", "manteiga", "creme de leite", "requeijao",
        "carne", "bife", "charque", "calabresa", "linguica", "bacon", "frango", "peru",
        "peixe", "salmao", "tilapia", "atum", "sardinha", "camarao", "frutos do mar",
        "banana", "maca", "laranja", "mamao", "morango", "abacaxi", "uva", "melancia",
        "couve", "alface", "tomate", "cenoura", "cebola", "batata", "pimentao", "alho",
        "abobora", "abobrinha", "berinjela", "beterraba", "repolho", "pepino", "espinafre",
        "chuchu", "inhame", "mandioca", "macaxeira", "aipim", "oleo", "azeite", "vinagre", "molho",
        "tempero", "erva", "coentro", "pimenta", "canela", "cominho", "oregano", "paprica",
        "chocolate", "biscoito", "bolacha", "milho", "cafe", "quinoa", "chia", "linhaca",
        "grao de bico", "soja", "cogumelo"
    );
    private static final List<String> BEBIDAS = List.of(
        "refrigerante", "energetico", "agua", "suco pronto", "isotonico", "cerveja", "vinho", "vodka", "whisky"
    );
    private static final List<String> LIMPEZA = List.of(
        "detergente", "sabao em po", "desinfetante", "agua sanitaria", "amaciante", "esponja", "limpador", "pano de chao"
    );
    private static final List<String> HIGIENE = List.of(
        "shampoo", "condicionador", "sabonete", "creme dental", "pasta de dente", "escova de dente",
        "desodorante", "papel higienico", "fio dental", "absorvente", "fralda"
    );
    private static final List<String> DOMESTICO = List.of(
        "saco de lixo", "papel aluminio", "papel toalha", "filme plastico", "guardanapo",
        "copo descartavel", "prato descartavel", "pilha", "lampada"
    );

    public TipoProduto classificar(String nome, String categoria) {
        TipoProduto pelaCategoria = classificarCategoria(categoria);
        if (pelaCategoria != TipoProduto.OTHER) return pelaCategoria;
        String valor = normalizar(nome);
        if (contem(valor, LIMPEZA)) return TipoProduto.CLEANING;
        if (contem(valor, HIGIENE)) return TipoProduto.HYGIENE;
        if (contem(valor, DOMESTICO)) return TipoProduto.HOUSEHOLD;
        if (contem(valor, BEBIDAS)) return TipoProduto.BEVERAGE;
        if (contem(valor, ALIMENTOS)) return TipoProduto.FOOD;
        return TipoProduto.OTHER;
    }

    public boolean permitidoNaDespensa(String nome, String categoria) {
        return classificar(nome, categoria) == TipoProduto.FOOD;
    }

    private TipoProduto classificarCategoria(String categoria) {
        String valor = normalizar(categoria);
        if (possuiTermo(valor, CATEGORIAS_ALIMENTO)) return TipoProduto.FOOD;
        if (possuiTermo(valor, CATEGORIAS_BEBIDA)) return TipoProduto.BEVERAGE;
        if (possuiTermo(valor, CATEGORIAS_LIMPEZA)) return TipoProduto.CLEANING;
        if (possuiTermo(valor, CATEGORIAS_HIGIENE)) return TipoProduto.HYGIENE;
        if (possuiTermo(valor, CATEGORIAS_DOMESTICO)) return TipoProduto.HOUSEHOLD;
        return TipoProduto.OTHER;
    }

    private boolean contem(String valor, List<String> termos) {
        return termos.stream().anyMatch(valor::contains);
    }

    private boolean possuiTermo(String valor, Set<String> termos) {
        return termos.stream().anyMatch(valor::contains);
    }

    private String normalizar(String valor) {
        return Normalizer.normalize(String.valueOf(valor == null ? "" : valor), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", " ")
            .trim();
    }
}
