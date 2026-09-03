CREATE TABLE IF NOT EXISTS configuracao_planos (
    id INTEGER PRIMARY KEY,
    exibir_cupons BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO configuracao_planos (id, exibir_cupons)
VALUES (1, TRUE)
ON CONFLICT (id) DO NOTHING;
