DO $$
BEGIN
    IF to_regclass('public.usuarios') IS NOT NULL THEN
        ALTER TABLE usuarios
            ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

        UPDATE usuarios
           SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
         WHERE cpf IS NOT NULL;

        UPDATE usuarios
           SET cpf = NULL
         WHERE cpf IS NOT NULL
           AND cpf !~ '^[0-9]{11}$';

        CREATE UNIQUE INDEX IF NOT EXISTS uk_usuarios_cpf
            ON usuarios (cpf)
            WHERE cpf IS NOT NULL;

        IF NOT EXISTS (
            SELECT 1
              FROM pg_constraint
             WHERE conname = 'ck_usuarios_cpf_numerico'
        ) THEN
            ALTER TABLE usuarios
                ADD CONSTRAINT ck_usuarios_cpf_numerico
                CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$');
        END IF;
    END IF;
END $$;
