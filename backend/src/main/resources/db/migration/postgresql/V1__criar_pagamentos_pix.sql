DO $$
BEGIN
    -- Em instalações novas o Hibernate cria o schema inicial logo depois do
    -- Flyway. Em bancos existentes, esta migration acrescenta a estrutura PIX.
    IF to_regclass('public.usuarios') IS NULL
       OR to_regclass('public.assinaturas') IS NULL THEN
        RETURN;
    END IF;

    CREATE TABLE IF NOT EXISTS pagamentos (
        id UUID PRIMARY KEY,
        public_id UUID NOT NULL,
        usuario_id UUID NOT NULL,
        assinatura_id UUID NOT NULL,
        provider VARCHAR(40) NOT NULL,
        provider_payment_id VARCHAR(120),
        external_reference VARCHAR(64) NOT NULL,
        plan_id VARCHAR(40) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        payment_method VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        provider_status VARCHAR(60),
        benefit_granted BOOLEAN NOT NULL DEFAULT FALSE,
        idempotency_key UUID NOT NULL,
        pix_qr_code TEXT,
        pix_qr_code_base64 TEXT,
        pix_ticket_url VARCHAR(1000),
        expires_at TIMESTAMPTZ,
        paid_at TIMESTAMPTZ,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        CONSTRAINT uk_pagamentos_public_id UNIQUE (public_id),
        CONSTRAINT uk_pagamentos_assinatura UNIQUE (assinatura_id),
        CONSTRAINT uk_pagamentos_provider_id UNIQUE (provider_payment_id),
        CONSTRAINT uk_pagamentos_idempotencia UNIQUE (idempotency_key),
        CONSTRAINT fk_pagamentos_usuario
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        CONSTRAINT fk_pagamentos_assinatura
            FOREIGN KEY (assinatura_id) REFERENCES assinaturas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_pagamentos_usuario_status
        ON pagamentos (usuario_id, payment_method, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pagamentos_external_reference
        ON pagamentos (external_reference);
END
$$;
