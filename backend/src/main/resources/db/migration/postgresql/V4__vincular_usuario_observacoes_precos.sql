ALTER TABLE observacoes_precos
    ADD COLUMN IF NOT EXISTS usuario_id UUID;

ALTER TABLE observacoes_precos
    ADD CONSTRAINT fk_observacoes_precos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_observacoes_precos_usuario
    ON observacoes_precos(usuario_id);
