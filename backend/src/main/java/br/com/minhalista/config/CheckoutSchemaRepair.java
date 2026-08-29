package br.com.minhalista.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Garante o contrato mínimo do checkout mesmo em bancos antigos nos quais o
 * histórico do Flyway não corresponde mais ao esquema físico.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CheckoutSchemaRepair implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(CheckoutSchemaRepair.class);

    private final JdbcTemplate jdbcTemplate;

    public CheckoutSchemaRepair(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!tabelaExiste("assinaturas")) {
            return;
        }

        jdbcTemplate.execute("""
            ALTER TABLE assinaturas
                ADD COLUMN IF NOT EXISTS cupom_codigo VARCHAR(30),
                ADD COLUMN IF NOT EXISTS cupom_percentual_desconto NUMERIC(5, 2),
                ADD COLUMN IF NOT EXISTS cupom_valor_desconto NUMERIC(10, 2),
                ADD COLUMN IF NOT EXISTS cupom_valor_original NUMERIC(10, 2),
                ADD COLUMN IF NOT EXISTS cupom_aplicado_em TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS cupom_primeira_cobranca_somente BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS cupom_primeiro_pagamento_aplicado BOOLEAN DEFAULT FALSE
            """);
        jdbcTemplate.update("""
            UPDATE assinaturas
               SET cupom_primeira_cobranca_somente = FALSE
             WHERE cupom_primeira_cobranca_somente IS NULL
            """);
        jdbcTemplate.update("""
            UPDATE assinaturas
               SET cupom_primeiro_pagamento_aplicado = FALSE
             WHERE cupom_primeiro_pagamento_aplicado IS NULL
            """);
        jdbcTemplate.execute("""
            ALTER TABLE assinaturas
                ALTER COLUMN cupom_primeira_cobranca_somente SET DEFAULT FALSE,
                ALTER COLUMN cupom_primeira_cobranca_somente SET NOT NULL,
                ALTER COLUMN cupom_primeiro_pagamento_aplicado SET DEFAULT FALSE,
                ALTER COLUMN cupom_primeiro_pagamento_aplicado SET NOT NULL
            """);

        if (tabelaExiste("cupons")) {
            jdbcTemplate.execute("""
                ALTER TABLE cupons
                    ADD COLUMN IF NOT EXISTS ciclo VARCHAR(20)
                """);
        }

        LOG.info("Esquema do checkout verificado e reparado com sucesso.");
    }

    private boolean tabelaExiste(String tabela) {
        Integer quantidade = jdbcTemplate.queryForObject(
            """
            SELECT COUNT(*)
              FROM information_schema.tables
             WHERE LOWER(table_name) = LOWER(?)
            """,
            Integer.class,
            tabela
        );
        return quantidade != null && quantidade > 0;
    }
}
