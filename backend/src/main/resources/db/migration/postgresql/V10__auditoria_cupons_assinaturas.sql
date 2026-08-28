ALTER TABLE IF EXISTS assinaturas
    ADD COLUMN IF NOT EXISTS cupom_percentual_desconto NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS cupom_valor_desconto NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cupom_valor_original NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cupom_aplicado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cupom_primeira_cobranca_somente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cupom_primeiro_pagamento_aplicado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_assinaturas_cupom_codigo
    ON assinaturas (cupom_codigo)
    WHERE cupom_codigo IS NOT NULL;
