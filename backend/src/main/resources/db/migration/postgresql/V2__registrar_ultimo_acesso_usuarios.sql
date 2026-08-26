ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ultimo_acesso_em TIMESTAMPTZ;

UPDATE usuarios
SET ultimo_acesso_em = CURRENT_TIMESTAMP
WHERE ultimo_acesso_em IS NULL;

ALTER TABLE usuarios
    ALTER COLUMN ultimo_acesso_em SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso_em
    ON usuarios (ultimo_acesso_em);
