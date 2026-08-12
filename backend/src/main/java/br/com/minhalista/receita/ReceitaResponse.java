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
    String origem,
    String fonte,
    String referenciaExterna,
    List<String> utensilios,
    List<IngredienteResponse> ingredientes,
    List<PassoResponse> passos,
    int ingredientesDisponiveis,
    int ingredientesObrigatorios,
    List<IngredienteResponse> faltantes,
    List<IngredienteResponse> quantidadesDesconhecidas,
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
        boolean presente,
        boolean quantidadeConhecida,
        BigDecimal falta,
        String unidadeCanonica,
        boolean suficiente
    ) { }

    public record PassoResponse(
        int numero,
        String titulo,
        String descricao,
        List<IngredientePassoResponse> ingredientes,
        List<String> utensilios,
        List<String> continueUsando,
        List<String> acoes,
        String tempoAproximado,
        String intensidadeFogo,
        String pontoEsperado,
        List<String> observacoes
    ) { }

    public record IngredientePassoResponse(
        String nome,
        BigDecimal quantidade,
        String unidade
    ) { }
}
