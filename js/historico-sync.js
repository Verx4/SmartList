const texto = valor => String(valor ?? "").trim();

const itensDaResposta = compra => {
    if (Array.isArray(compra?.itens)) return compra.itens;
    if (Array.isArray(compra?.produtos)) return compra.produtos;
    return [];
};

export function normalizarCompraRemota(compra = {}) {
    return {
        ...compra,
        id: compra.id || compra.compraId,
        data: compra.data || compra.realizadaEm || compra.finalizadoEm || compra.finalizadaEm || compra.criadoEm,
        mercado: compra.mercadoNome || compra.mercado || compra.supermercado,
        supermercado: compra.mercadoNome || compra.supermercado || compra.mercado,
        usuarioNome: compra.usuarioNome || compra.criador || compra.usuario || "Usuário não identificado",
        itens: itensDaResposta(compra),
        total: Number(compra.total ?? compra.valorTotal ?? compra.totalCompra ?? 0),
        economia: Number(compra.economia ?? compra.economiaEstimada ?? 0)
    };
}

function chaveCompra(compra, indice = 0) {
    const id = texto(compra?.id || compra?.compraId);
    if (id) return `id:${id}`;

    return [
        "legado",
        texto(compra?.data || compra?.realizadaEm || compra?.finalizadoEm),
        texto(compra?.supermercado || compra?.mercado),
        Number(compra?.total ?? compra?.valorTotal ?? 0),
        indice
    ].join(":");
}

export function combinarHistoricos(remoto = [], local = []) {
    const registros = new Map();

    (Array.isArray(remoto) ? remoto : []).forEach((compra, indice) => {
        const normalizada = normalizarCompraRemota(compra);
        registros.set(chaveCompra(normalizada, indice), normalizada);
    });

    (Array.isArray(local) ? local : []).forEach((compra, indice) => {
        const normalizada = normalizarCompraRemota(compra);
        const chave = chaveCompra(normalizada, indice);
        const remota = registros.get(chave);

        registros.set(chave, remota ? {
            ...remota,
            ...normalizada,
            usuarioNome: normalizada.usuarioNome === "Usuário não identificado"
                ? remota.usuarioNome
                : normalizada.usuarioNome,
            itens: normalizada.itens.length ? normalizada.itens : remota.itens,
            economia: Number(normalizada.economia || remota.economia || 0)
        } : normalizada);
    });

    return [...registros.values()].sort((a, b) => (
        new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
    ));
}
