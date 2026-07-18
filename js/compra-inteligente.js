export function calcularMelhorMercado(resultados) {
    const validos = Array.isArray(resultados)
        ? resultados.filter(
            item =>
                Number.isFinite(
                    Number(item.total)
                )
        )
        : [];

    if (!validos.length) {
        return null;
    }

    return validos.reduce(
        (melhor, atual) =>
            Number(atual.total) <
            Number(melhor.total)
                ? atual
                : melhor
    );
}

export function calcularMelhorCombinacao(produtos) {
    if (!Array.isArray(produtos)) {
        return {
            itens: [],
            total: 0,
            mercados: []
        };
    }

    const itens = [];

    produtos.forEach(produto => {
        const precos =
            produto.precos?.filter(
                preco =>
                    Number(preco.valor) > 0
            ) || [];

        if (!precos.length) return;

        const melhor = precos.reduce(
            (menor, atual) =>
                Number(atual.valor) <
                Number(menor.valor)
                    ? atual
                    : menor
        );

        itens.push({
            produtoId: produto.id,
            produto: produto.nome,
            supermercadoId:
                melhor.supermercadoId,
            supermercado:
                melhor.supermercado,
            preco: Number(melhor.valor),
            quantidade:
                Number(produto.quantidade) || 1
        });
    });

    const total = itens.reduce(
        (soma, item) =>
            soma +
            item.preco *
            item.quantidade,
        0
    );

    return {
        itens,
        total,

        mercados: [
            ...new Set(
                itens.map(
                    item =>
                        item.supermercadoId
                )
            )
        ]
    };
}