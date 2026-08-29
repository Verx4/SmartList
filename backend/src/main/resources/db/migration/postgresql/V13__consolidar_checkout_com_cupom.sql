ALTER TABLE IF EXISTS assinaturas
    ADD COLUMN IF NOT EXISTS cupom_codigo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cupom_percentual_desconto NUMERIC(5, 2),
    ADD COLUMN IF NOT EXISTS cupom_valor_desconto NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cupom_valor_original NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cupom_aplicado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cupom_primeira_cobranca_somente BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cupom_primeiro_pagamento_aplicado BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
    IF to_regclass('public.assinaturas') IS NOT NULL THEN
        UPDATE assinaturas
        SET cupom_primeira_cobranca_somente = FALSE
        WHERE cupom_primeira_cobranca_somente IS NULL;

        UPDATE assinaturas
        SET cupom_primeiro_pagamento_aplicado = FALSE
        WHERE cupom_primeiro_pagamento_aplicado IS NULL;
    END IF;
END $$;

ALTER TABLE IF EXISTS assinaturas
    ALTER COLUMN cupom_primeira_cobranca_somente SET DEFAULT FALSE,
    ALTER COLUMN cupom_primeira_cobranca_somente SET NOT NULL,
    ALTER COLUMN cupom_primeiro_pagamento_aplicado SET DEFAULT FALSE,
    ALTER COLUMN cupom_primeiro_pagamento_aplicado SET NOT NULL;

ALTER TABLE IF EXISTS cupons
    ADD COLUMN IF NOT EXISTS ciclo VARCHAR(20);

UPDATE cupons
SET percentual_desconto = 10.00,
    ciclo = 'TRIMESTRAL'
WHERE UPPER(codigo) LIKE '%10';

UPDATE cupons
SET percentual_desconto = 5.00,
    ciclo = 'MENSAL'
WHERE UPPER(codigo) LIKE '%5'
  AND UPPER(codigo) NOT LIKE '%10';

UPDATE cupons
SET ativo = FALSE
WHERE ciclo IS NULL
   OR ciclo NOT IN ('MENSAL', 'TRIMESTRAL');

CREATE INDEX IF NOT EXISTS idx_cupons_codigo_normalizado_ativo
    ON cupons (UPPER(codigo), ativo);
