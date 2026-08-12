package br.com.minhalista.receita;

import java.math.BigDecimal;
import java.util.List;

public record ReceitaResponse(
    String id,
    String nome,
    String descricao,
    String icone,
    String categoria,
    String tipo,
    int tempoMinutos,
    String dificuldade,
    String rendimento,
    List<IngredienteResponse> ingredientes,
    List<PassoResponse> passos,
    int ingredientesDisponiveis,
    int ingredientesObrigatorios,
    List<IngredienteResponse> faltantes,
    BigDecimal compatibilidade,
    boolean podeFazer,
    boolean favorita
) {
    public record IngredienteResponse(
        String nome,
        String chaveProduto,
        BigDecimal quantidade,
        String unidade,
        boolean obrigatorio,
        boolean basico,
        BigDecimal disponivel,
        BigDecimal falta,
        String unidadeCanonica,
        boolean suficiente
    ) { }

    public record PassoResponse(int numero, String titulo, String descricao) { }
}
