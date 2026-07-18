import {
    CATEGORIA_HORTIFRUTI
} from "./categorias.js";

import {
    produtoSelecionado,
    subtotalProduto
} from "./produtos.js";

import {
    arredondarMoeda
} from "./utils.js";

export function calcularResumo(produtos) {
    const resumo = {
        total: 0,
        totalItens: 0,
        totalPeso: 0,
        porCategoria: {}
    };

    produtos
        .filter(produtoSelecionado)
        .forEach(produto => {
            const subtotal =
                subtotalProduto(produto);

            resumo.total += subtotal;

            resumo.porCategoria[
                produto.categoria
            ] =
                (
                    resumo.porCategoria[
                        produto.categoria
                    ] || 0
                )
                + subtotal;

            if (
                produto.categoria ===
                CATEGORIA_HORTIFRUTI
            ) {
                resumo.totalPeso +=
                    produto.peso;
            } else {
                resumo.totalItens +=
                    produto.quantidade;
            }
        });

    resumo.total =
        arredondarMoeda(
            resumo.total
        );

    return resumo;
}

export function compararCompras(
    totalAtual,
    ultimaCompra
) {
    if (!ultimaCompra) {
        return {
            tipo: "neutro",
            diferenca: 0,
            percentual: 0
        };
    }

    const diferenca =
        totalAtual - ultimaCompra;

    return {
        tipo:
            diferenca > 0
                ? "aumento"
                : diferenca < 0
                    ? "economia"
                    : "neutro",

        diferenca,

        percentual:
            (diferenca / ultimaCompra)
            * 100
    };
}

export function compararPreco(
    precoAtual,
    ultimoPreco
) {
    if (!ultimoPreco) {
        return {
            tipo: "primeira",
            diferenca: 0,
            percentual: 0
        };
    }

    const diferenca =
        precoAtual - ultimoPreco;

    return {
        tipo:
            diferenca > 0
                ? "aumento"
                : diferenca < 0
                    ? "queda"
                    : "igual",

        diferenca,

        percentual:
            (diferenca / ultimoPreco)
            * 100
    };
}