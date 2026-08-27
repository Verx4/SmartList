DELETE FROM produtos_precos p
WHERE NOT EXISTS (
    SELECT 1
    FROM observacoes_precos o
    WHERE o.produto_id = p.id
);
