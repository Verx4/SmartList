ALTER TABLE observacoes_precos
    ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id);

ALTER TABLE observacoes_precos
    ADD COLUMN IF NOT EXISTS economia_compra NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_observacoes_precos_usuario
    ON observacoes_precos(usuario_id);

CREATE INDEX IF NOT EXISTS idx_observacoes_precos_usuario_compra
    ON observacoes_precos(usuario_id, compra_chave, realizada_em DESC);
