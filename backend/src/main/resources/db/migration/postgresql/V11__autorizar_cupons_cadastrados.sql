ALTER TABLE IF EXISTS cupons
    ADD COLUMN IF NOT EXISTS ciclo VARCHAR(20);

UPDATE cupons
SET ciclo = 'TRIMESTRAL', percentual_desconto = 10.00
WHERE UPPER(codigo) LIKE '%10';

UPDATE cupons
SET ciclo = 'MENSAL', percentual_desconto = 5.00
WHERE ciclo IS NULL AND UPPER(codigo) LIKE '%5';

UPDATE cupons
SET ativo = FALSE
WHERE ciclo IS NULL;

CREATE INDEX IF NOT EXISTS idx_cupons_codigo_ciclo_ativo
    ON cupons (codigo, ciclo, ativo);
