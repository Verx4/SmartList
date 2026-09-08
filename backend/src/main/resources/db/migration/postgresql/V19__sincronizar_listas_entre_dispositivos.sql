CREATE TABLE IF NOT EXISTS estados_listas_usuario (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL,
    conteudo_json TEXT NOT NULL,
    versao BIGINT NOT NULL DEFAULT 1,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_estados_listas_usuario_usuario UNIQUE (usuario_id),
    CONSTRAINT fk_estados_listas_usuario_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_estados_listas_usuario_atualizado
    ON estados_listas_usuario (atualizado_em DESC);
