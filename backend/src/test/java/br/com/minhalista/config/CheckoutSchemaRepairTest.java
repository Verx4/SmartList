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

        schemaRepair.run(null);

        assertEquals(1, quantidadeColuna("cupom_primeira_cobranca_somente"));
        assertEquals(1, quantidadeColuna("cupom_primeiro_pagamento_aplicado"));
    }

    private Integer quantidadeColuna(String coluna) {
        return jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
              FROM information_schema.columns
             WHERE LOWER(table_name) = 'assinaturas'
               AND LOWER(column_name) = LOWER(?)
            """,
            Integer.class,
            coluna
        );
    }
}
