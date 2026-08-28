CREATE TABLE IF NOT EXISTS cupons (
    id UUID PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    percentual_desconto NUMERIC(5, 2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_cupons_percentual
        CHECK (percentual_desconto > 0 AND percentual_desconto <= 90)
);

ALTER TABLE IF EXISTS assinaturas
    ADD COLUMN IF NOT EXISTS cupom_codigo VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_cupons_codigo_ativo
    ON cupons (codigo, ativo);
