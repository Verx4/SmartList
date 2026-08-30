package br.com.minhalista.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CheckoutSchemaRepairTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CheckoutSchemaRepair schemaRepair;

    @Test
    void recriaColunasAusentesQueImpediamOCheckout() {
        jdbcTemplate.execute("""
            ALTER TABLE assinaturas
                DROP COLUMN cupom_primeira_cobranca_somente
            """);
        jdbcTemplate.execute("""
            ALTER TABLE assinaturas
                DROP COLUMN cupom_primeiro_pagamento_aplicado
            """);
        jdbcTemplate.execute("""
            ALTER TABLE observacoes_precos
                DROP COLUMN economia_compra
            """);

        schemaRepair.run(null);

        assertEquals(1, quantidadeColuna("assinaturas", "cupom_primeira_cobranca_somente"));
        assertEquals(1, quantidadeColuna("assinaturas", "cupom_primeiro_pagamento_aplicado"));
        assertEquals(1, quantidadeColuna("observacoes_precos", "economia_compra"));
    }

    private Integer quantidadeColuna(String tabela, String coluna) {
        return jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
              FROM information_schema.columns
             WHERE LOWER(table_name) = LOWER(?)
               AND LOWER(column_name) = LOWER(?)
            """,
            Integer.class,
            tabela,
            coluna
        );
    }
}
