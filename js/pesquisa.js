import {
    normalizarTexto
} from "./utils.js";

export function filtrarProdutos(
    produtos,
    termo = "",
    categoria = ""
) {
    const busca =
        normalizarTexto(termo);

    return produtos.filter(produto => {
        const correspondeNome =
            !busca
            || normalizarTexto(
                produto.nome
            ).includes(busca);

        const correspondeCategoria =
            !categoria
            || produto.categoria ===
                categoria;

        return (
            correspondeNome
            && correspondeCategoria
        );
    });
}

export function ordenarProdutos(
    produtos,
    criterio = "nome"
) {
    const ordenacoes = {
        nome: (a, b) =>
            a.nome.localeCompare(
                b.nome,
                "pt-BR"
            ),

        menorPreco: (a, b) =>
            a.precoAtual -
            b.precoAtual,

        maiorPreco: (a, b) =>
            b.precoAtual -
            a.precoAtual,

        categoria: (a, b) =>
            a.categoria.localeCompare(
                b.categoria,
                "pt-BR"
            )
    };

    return [...produtos].sort(
        ordenacoes[criterio]
        || ordenacoes.nome
    );
}