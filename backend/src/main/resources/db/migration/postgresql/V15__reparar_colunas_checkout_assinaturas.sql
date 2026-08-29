-- Reparo idempotente para bancos que registraram migrations antigas sem
-- conservar todas as colunas de auditoria do checkout com cupom.
ALTER TABLE IF EXISTS assinaturas
    ADD COLUMN IF NOT EXISTS cupom_codigo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cupom_percentual_desconto NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS cupom_valor_desconto NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cupom_valor_original NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cupom_aplicado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cupom_primeira_cobranca_somente BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cupom_primeiro_pagamento_aplicado BOOLEAN DEFAULT FALSE;

UPDATE assinaturas
   SET cupom_primeira_cobranca_somente = FALSE
 WHERE cupom_primeira_cobranca_somente IS NULL;

UPDATE assinaturas
   SET cupom_primeiro_pagamento_aplicado = FALSE
 WHERE cupom_primeiro_pagamento_aplicado IS NULL;

ALTER TABLE IF EXISTS assinaturas
    ALTER COLUMN cupom_primeira_cobranca_somente SET DEFAULT FALSE,
    ALTER COLUMN cupom_primeira_cobranca_somente SET NOT NULL,
    ALTER COLUMN cupom_primeiro_pagamento_aplicado SET DEFAULT FALSE,
    ALTER COLUMN cupom_primeiro_pagamento_aplicado SET NOT NULL;

ALTER TABLE IF EXISTS cupons
    ADD COLUMN IF NOT EXISTS ciclo VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_assinaturas_cupom_codigo
    ON assinaturas (cupom_codigo)
    WHERE cupom_codigo IS NOT NULL;
