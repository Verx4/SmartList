import {
    agruparComprasPorCategoria,
    dataDaCompra,
    itensDaCompra,
    precoUnitarioDoItem,
    resumirCompras
} from "./historico-calculos.js";

const chaveMes = data => [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0")
].join("-");

const normalizarNome = valor => String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/*
 * Alguns nomes genéricos não identificam uma apresentação específica.
 * Compará-los poderia misturar, por exemplo, leite em pó com leite em caixa
 * quando um registro antigo foi salvo apenas como "Leite".
 */
const NOMES_AMBIGUOS_PARA_PRECO = new Set([
    "leite"
]);

const medidaDoItem = item => normalizarNome(
    item?.medida
    || item?.tipoMedida
    || (Number(item?.peso) > 0 ? "kg" : "unidade")
);

const chaveComparacaoProduto = item => {
    const nome = normalizarNome(item?.nome);

    if (!nome || NOMES_AMBIGUOS_PARA_PRECO.has(nome)) {
        return "";
    }

    /*
     * O nome completo preserva diferenças como "leite em pó" e
     * "leite em caixa". A medida impede comparar preço por kg com unidade.
     */
    return `${nome}|${medidaDoItem(item)}`;
};

export function comprasDoMes(compras = [], referencia = new Date(), deslocamento = 0) {
    const alvo = new Date(
        referencia.getFullYear(),
        referencia.getMonth() + deslocamento,
        1
    );
    const alvoChave = chaveMes(alvo);

    return compras.filter(compra => {
        const data = dataDaCompra(compra);
        return !Number.isNaN(data.getTime()) && chaveMes(data) === alvoChave;
    });
}

export function compararMeses(compras = [], referencia = new Date()) {
    const atuais = comprasDoMes(compras, referencia);
    const anteriores = comprasDoMes(compras, referencia, -1);
    const atual = resumirCompras(atuais);
    const anterior = resumirCompras(anteriores);
    const diferenca = atual.totalGasto - anterior.totalGasto;
    const menorQuantidadeCompras = Math.min(
        atual.quantidadeCompras,
        anterior.quantidadeCompras
    );
    const maiorQuantidadeCompras = Math.max(
        atual.quantidadeCompras,
        anterior.quantidadeCompras
    );
    const volumeComparavel = menorQuantidadeCompras >= 2
        && maiorQuantidadeCompras / menorQuantidadeCompras <= 1.25;
    const economiaConfiavel = volumeComparavel && diferenca < 0;

    return {
        atual,
        anterior,
        diferenca,
        tipo: anterior.quantidadeCompras === 0 || atual.quantidadeCompras === 0
            ? "sem-dados"
            : diferenca < 0
                ? "menor"
                : diferenca > 0
                    ? "maior"
                    : "igual",
        volumeComparavel,
        economiaConfiavel,
        economia: economiaConfiavel ? Math.abs(diferenca) : 0
    };
}

export function categoriaComMaiorGasto(compras = []) {
    const categorias = agruparComprasPorCategoria(compras);
    const principal = [...categorias.entries()]
        .sort((a, b) => b[1].total - a[1].total)[0];
    const total = resumirCompras(compras).totalGasto;

    if (!principal) return null;

    return {
        nome: principal[0],
        total: principal[1].total,
        percentual: total > 0 ? principal[1].total / total * 100 : 0
    };
}

export function produtoComMaiorAumento(compras = []) {
    const precosPorProduto = new Map();

    [...compras]
        .sort((a, b) => dataDaCompra(a) - dataDaCompra(b))
        .forEach(compra => itensDaCompra(compra).forEach(item => {
            const chave = chaveComparacaoProduto(item);
            const preco = precoUnitarioDoItem(item);

            if (!chave || preco <= 0) return;

            const registro = precosPorProduto.get(chave) || {
                nome: item.nome || "Item",
                precos: []
            };
            registro.nome = item.nome || registro.nome;
            registro.precos.push(preco);
            precosPorProduto.set(chave, registro);
        }));

    return [...precosPorProduto.values()]
        .filter(registro => registro.precos.length >= 2)
        .map(registro => {
            const precoAnterior = registro.precos.at(-2);
            const precoAtual = registro.precos.at(-1);
            return {
                nome: registro.nome,
                precoAnterior,
                precoAtual,
                percentual: precoAnterior > 0
                    ? (precoAtual - precoAnterior) / precoAnterior * 100
                    : 0
            };
        })
        .filter(registro => registro.percentual > 0)
        .sort((a, b) => b.percentual - a.percentual)[0] || null;
}

export function serieDeGastos(compras = [], quantidadeMeses = 6, referencia = new Date()) {
    const meses = Math.max(1, Number(quantidadeMeses) || 6);

    return Array.from({ length: meses }, (_, indice) => {
        const deslocamento = indice - (meses - 1);
        const data = new Date(
            referencia.getFullYear(),
            referencia.getMonth() + deslocamento,
            1
        );
        const resumo = resumirCompras(comprasDoMes(compras, data));

        return {
            chave: chaveMes(data),
            rotulo: data.toLocaleDateString("pt-BR", { month: "short" })
                .replace(".", ""),
            total: resumo.totalGasto,
            compras: resumo.quantidadeCompras
        };
    });
}

export function analisarMinhaEconomia(compras = [], referencia = new Date()) {
    const comparacao = compararMeses(compras, referencia);
    const comprasAtuais = comprasDoMes(compras, referencia);

    return {
        ...comparacao,
        itensComprados: comparacao.atual.itensComprados,
        categoriaPrincipal: categoriaComMaiorGasto(comprasAtuais),
        maiorAumento: produtoComMaiorAumento(compras)
    };
}
