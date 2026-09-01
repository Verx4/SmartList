const numeroNaoNegativo = (valor, padrao = 0) => {
    const numero = Number(valor);

    return Number.isFinite(numero) && numero >= 0
        ? numero
        : padrao;
};

export const itensDaCompra = compra => {
    if (Array.isArray(compra?.itens)) return compra.itens;
    if (Array.isArray(compra?.produtos)) return compra.produtos;
    return [];
};

export const dataDaCompra = compra => new Date(
    compra?.data
    || compra?.finalizadoEm
    || compra?.finalizadaEm
    || compra?.criadoEm
    || 0
);

export function quantidadeCompradaDoItem(item = {}) {
    const quantidadeInformada = numeroNaoNegativo(item.quantidade);

    // Itens vendidos por peso podem chegar do backend com quantidade = 0
    // e peso > 0. Eles continuam sendo 1 item comprado; o peso é mostrado
    // separadamente na descrição (ex.: 1 kg × R$ 6,99/kg).
    if (quantidadeInformada > 0) {
        return quantidadeInformada;
    }

    const quantidadeNosPrecos = Array.isArray(item.precos)
        ? item.precos.reduce(
            (total, preco) => total + numeroNaoNegativo(preco?.quantidade),
            0
        )
        : 0;

    if (quantidadeNosPrecos > 0) return quantidadeNosPrecos;
    if (numeroNaoNegativo(item.peso) > 0) return 1;

    if (Object.prototype.hasOwnProperty.call(item, "quantidade")) {
        return quantidadeInformada;
    }

    return 1;
}

export const totalItensComprados = compras => (
    (Array.isArray(compras) ? compras : [compras])
        .filter(Boolean)
        .reduce(
            (total, compra) => total + itensDaCompra(compra).reduce(
                (subtotal, item) => subtotal + quantidadeCompradaDoItem(item),
                0
            ),
            0
        )
);

export function precoUnitarioDoItem(item = {}) {
    const precoInformado = Number(
        item.precoUnitario
        ?? item.preco
        ?? item.precoAtual
    );

    if (Number.isFinite(precoInformado) && precoInformado >= 0) {
        return precoInformado;
    }

    const medida = numeroNaoNegativo(item.peso) > 0
        ? numeroNaoNegativo(item.peso)
        : quantidadeCompradaDoItem(item);
    const subtotal = numeroNaoNegativo(item.subtotal, NaN);

    return medida > 0 && Number.isFinite(subtotal)
        ? subtotal / medida
        : 0;
}

export function subtotalDoItem(item = {}) {
    const subtotalInformado = Number(item.subtotal ?? item.valorTotal);

    if (Number.isFinite(subtotalInformado) && subtotalInformado >= 0) {
        return subtotalInformado;
    }

    const medida = numeroNaoNegativo(item.peso) > 0
        ? numeroNaoNegativo(item.peso)
        : quantidadeCompradaDoItem(item);

    return precoUnitarioDoItem(item) * medida;
}

export function totalDaCompra(compra = {}) {
    const totalInformado = Number(
        compra.total
        ?? compra.valorTotal
        ?? compra.totalCompra
    );

    if (Number.isFinite(totalInformado) && totalInformado >= 0) {
        return totalInformado;
    }

    return itensDaCompra(compra).reduce(
        (total, item) => total + subtotalDoItem(item),
        0
    );
}

export function economiaDaCompra(compra = {}) {
    const economia = Number(
        compra.economia
        ?? -Number(compra.diferenca || 0)
    );

    return Number.isFinite(economia)
        ? Math.max(0, economia)
        : 0;
}

export function resumirCompras(compras = []) {
    const lista = Array.isArray(compras) ? compras : [];
    const totalGasto = lista.reduce(
        (total, compra) => total + totalDaCompra(compra),
        0
    );

    return {
        totalGasto,
        economia: lista.reduce(
            (total, compra) => total + economiaDaCompra(compra),
            0
        ),
        quantidadeCompras: lista.length,
        itensComprados: totalItensComprados(lista),
        media: lista.length ? totalGasto / lista.length : 0
    };
}

export function agruparComprasPorCategoria(compras = []) {
    const categorias = new Map();

    compras.forEach(compra => itensDaCompra(compra).forEach(item => {
        const categoria = item.categoria || "Outros";
        const registro = categorias.get(categoria) || {
            total: 0,
            quantidade: 0,
            itens: []
        };

        registro.total += subtotalDoItem(item);
        registro.quantidade += quantidadeCompradaDoItem(item);
        registro.itens.push({ item, compra });
        categorias.set(categoria, registro);
    }));

    return categorias;
}

export function chaveDiaDaCompra(compra) {
    const data = dataDaCompra(compra);

    if (Number.isNaN(data.getTime())) return "";

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}

export function filtrarComprasPorPeriodo(compras = [], periodo = "todos") {
    if (periodo === "todos") return [...compras];

    return compras.filter(compra => chaveDiaDaCompra(compra) === periodo);
}
