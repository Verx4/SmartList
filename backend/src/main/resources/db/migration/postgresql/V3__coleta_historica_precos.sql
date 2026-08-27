CREATE TABLE IF NOT EXISTS produtos_precos (
    id UUID PRIMARY KEY,
    nome_exibicao VARCHAR(180) NOT NULL,
    nome_normalizado VARCHAR(220) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_produtos_precos_nome_normalizado UNIQUE (nome_normalizado)
);

CREATE TABLE IF NOT EXISTS observacoes_precos (
    id UUID PRIMARY KEY,
    produto_id UUID NOT NULL REFERENCES produtos_precos(id),
    nome_original VARCHAR(180) NOT NULL,
    quantidade NUMERIC(12, 3) NOT NULL,
    unidade VARCHAR(24) NOT NULL,
    preco_unitario NUMERIC(12, 4) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    mercado VARCHAR(120),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    realizada_em TIMESTAMPTZ NOT NULL,
    origem VARCHAR(30) NOT NULL,
    compra_chave VARCHAR(120) NOT NULL,
    item_chave VARCHAR(120) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_observacoes_precos_origem_compra_item
        UNIQUE (origem, compra_chave, item_chave)
);

CREATE INDEX IF NOT EXISTS idx_produtos_precos_categoria
    ON produtos_precos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_precos_nome
    ON produtos_precos(nome_exibicao);
CREATE INDEX IF NOT EXISTS idx_observacoes_precos_produto_data
    ON observacoes_precos(produto_id, realizada_em DESC);
CREATE INDEX IF NOT EXISTS idx_observacoes_precos_mercado_data
    ON observacoes_precos(mercado, realizada_em DESC);
CREATE INDEX IF NOT EXISTS idx_observacoes_precos_estado_cidade
    ON observacoes_precos(estado, cidade);
CREATE INDEX IF NOT EXISTS idx_observacoes_precos_origem
    ON observacoes_precos(origem);
