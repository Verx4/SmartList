package br.com.minhalista.receita;

import java.math.BigDecimal;
import java.util.List;

record ReceitaEstruturada(
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
    List<IngredienteEstruturado> ingredientes,
    List<PassoEstruturado> passos
) {
    record IngredienteEstruturado(
        String nome,
        BigDecimal quantidade,
        String unidade,
        boolean obrigatorio,
        boolean basico
    ) { }

    record PassoEstruturado(
        String titulo,
        String descricao,
        List<IngredientePassoEstruturado> ingredientes,
        List<String> utensilios,
        List<String> continueUsando,
        List<String> acoes,
        String tempoAproximado,
        String intensidadeFogo,
        String pontoEsperado,
        List<String> observacoes
    ) { }

    record IngredientePassoEstruturado(String nome, BigDecimal quantidade, String unidade) { }
}
