CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    usuario_id UUID NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    email_hash VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    codigo_hash VARCHAR(100) NOT NULL,
    token_redefinicao_hash VARCHAR(64),
    criado_em TIMESTAMPTZ NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
    verificado_em TIMESTAMPTZ,
    utilizado_em TIMESTAMPTZ,
    invalidado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_reset_email_criado
    ON password_reset_tokens (email_hash, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_ip_criado
    ON password_reset_tokens (ip_hash, criado_em DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uk_password_reset_token_hash
    ON password_reset_tokens (token_redefinicao_hash)
    WHERE token_redefinicao_hash IS NOT NULL;
