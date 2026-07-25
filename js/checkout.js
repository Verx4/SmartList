const CHAVE_HISTORICO = "historicoCompras";
const CHAVE_ULTIMA_COMPRA = "ultimaCompra";
const CHAVE_ECONOMIA = "economiaAcumulada";


function numeroSeguro(valor) {

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;

}


function ehHortifruti(produto) {

    return String(produto.categoria || "")
        .toLowerCase()
        .includes("hortifruti");

}


function resumirPrecos(produto = {}) {

    const precos = Array.isArray(produto.precos) ? produto.precos : [];
    const quantidade = precos.reduce(
        (total, item) => total + Math.max(0, numeroSeguro(item.quantidade)),
        0
    );
    const subtotal = precos.reduce(
        (total, item) => total + (
            Math.max(0, numeroSeguro(item.valor)) *
            Math.max(0, numeroSeguro(item.quantidade))
        ),
        0
    );

    return {
        precos,
        quantidade,
        subtotal,
        media: quantidade > 0 ? subtotal / quantidade : 0
    };

}


function calcularSubtotal(produto) {

    if (Array.isArray(produto.precos) && produto.precos.length) {

        return resumirPrecos(produto).subtotal;

    }

    const preco = Math.max(
        0,
        numeroSeguro(produto.preco)
    );

    const quantidade = Math.max(
        0,
        numeroSeguro(produto.quantidade)
    );

    const peso = Math.max(
        0,
        numeroSeguro(produto.peso)
    );

    if (ehHortifruti(produto) && peso > 0) {

        return preco * peso;

    }

    return preco * quantidade;

}


export function carregarHistorico() {

    try {

        const historico = JSON.parse(
            localStorage.getItem(CHAVE_HISTORICO)
        );

        return Array.isArray(historico)
            ? historico
            : [];

    } catch {

        return [];

    }

}


function descobrirMercadoPrincipal(produtos) {

    const mercados = produtos
        .map(produto => produto.supermercado)
        .filter(Boolean);

    const unicos = [...new Set(mercados)];

    if (unicos.length === 1) {

        return unicos[0];

    }

    if (unicos.length > 1) {

        return "Vários mercados";

    }

    return "Mercado não informado";

}


export function finalizarCompra(produtos = []) {

    if (!produtos.length) {

        throw new Error(
            "Adicione pelo menos um produto antes de finalizar."
        );

    }

    const itensValidos = produtos.filter(
        produto => calcularSubtotal(produto) > 0
    );

    if (!itensValidos.length) {

        throw new Error(
            "Informe o preço de pelo menos um produto."
        );

    }

    const itens = itensValidos.map(produto => {

        const resumo = resumirPrecos(produto);

        return {
            id: produto.id,
            nome: produto.nome,
            categoria: produto.categoria,
            supermercado: produto.supermercado,
            precos: resumo.precos.map(item => ({ ...item })),
            preco: resumo.precos.length ? resumo.media : numeroSeguro(produto.preco),
            quantidade: resumo.precos.length ? resumo.quantidade : numeroSeguro(produto.quantidade),
            peso: numeroSeguro(produto.peso),
            subtotal: calcularSubtotal(produto)
        };

    });

    const total = itens.reduce(
        (soma, item) => soma + item.subtotal,
        0
    );

    const historico = carregarHistorico();

    const compraAnterior =
        historico.length
            ? numeroSeguro(historico[0].total)
            : 0;

    const economia =
        compraAnterior > total
            ? compraAnterior - total
            : 0;

    const compra = {

        id:
            window.crypto?.randomUUID?.() ||
            `${Date.now()}`,

        data: new Date().toISOString(),

        supermercado:
            descobrirMercadoPrincipal(itensValidos),

        itens,
        total,
        economia

    };

    historico.unshift(compra);

    localStorage.setItem(
        CHAVE_HISTORICO,
        JSON.stringify(historico)
    );

    localStorage.setItem(
        CHAVE_ULTIMA_COMPRA,
        String(total)
    );

    const economiaAcumulada =
        numeroSeguro(
            localStorage.getItem(CHAVE_ECONOMIA)
        ) + economia;

    localStorage.setItem(
        CHAVE_ECONOMIA,
        String(economiaAcumulada)
    );

    const produtosAtualizados =
        produtos.map(produto => ({

            ...produto,

            ultimoPreco:
                numeroSeguro(produto.preco) > 0
                    ? numeroSeguro(produto.preco)
                    : numeroSeguro(produto.ultimoPreco),

            ultimoSupermercado:
                produto.supermercado ||
                produto.ultimoSupermercado ||
                "",

            precos: Array.isArray(produto.precos) && produto.precos.length
                ? produto.precos.map(preco => ({
                    ...preco,
                    valor: 0,
                    quantidade: 0
                }))
                : [{ valor: 0, quantidade: 0 }],

            peso:
                ehHortifruti(produto)
                    ? 0
                    : numeroSeguro(produto.peso),

            atualizadoEm:
                new Date().toISOString()

        }));

    return {

        compra,
        historico,
        produtosAtualizados,
        economiaAcumulada

    };

}


export function limparHistorico() {

    localStorage.removeItem(CHAVE_HISTORICO);
    localStorage.removeItem(CHAVE_ULTIMA_COMPRA);
    localStorage.removeItem(CHAVE_ECONOMIA);

    return [];

}


export function obterEconomiaAcumulada() {

    return numeroSeguro(
        localStorage.getItem(CHAVE_ECONOMIA)
    );

}
