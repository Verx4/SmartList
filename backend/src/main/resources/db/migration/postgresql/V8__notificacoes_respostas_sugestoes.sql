ALTER TABLE IF EXISTS sugestoes
    ADD COLUMN IF NOT EXISTS tem_nova_resposta BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF to_regclass('sugestoes') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_sugestoes_email_nova_resposta
            ON sugestoes (LOWER(usuario_email), tem_nova_resposta);
    END IF;
END
$$;
