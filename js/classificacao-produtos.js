import { identificarCategoria } from "./categorias.js";

export const TIPOS_PRODUTO = Object.freeze({
    ALIMENTO: "food",
    BEBIDA: "beverage",
    LIMPEZA: "cleaning",
    HIGIENE: "hygiene",
    DOMESTICO: "household",
    OUTRO: "other"
});

function normalizar(valor) {
    return String(valor || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

const TIPOS_POR_CATEGORIA = Object.freeze([
    { termos: ["laticinios", "carnes", "frango", "peixes", "hortifruti", "padaria", "graos", "mercearia", "doces", "snacks", "enlatados", "conservas", "congelados", "temperos"], tipo: TIPOS_PRODUTO.ALIMENTO },
    { termos: ["bebidas", "energeticos", "alcoolicas"], tipo: TIPOS_PRODUTO.BEBIDA },
    { termos: ["limpeza"], tipo: TIPOS_PRODUTO.LIMPEZA },
    { termos: ["higiene", "farmacia"], tipo: TIPOS_PRODUTO.HIGIENE },
    { termos: ["descartaveis", "utilidades"], tipo: TIPOS_PRODUTO.DOMESTICO }
]);

export function tipoDaCategoria(categoria) {
    const comparavel = normalizar(categoria);
    return TIPOS_POR_CATEGORIA.find(regra => regra.termos.some(termo => comparavel.includes(termo)))?.tipo
        || TIPOS_PRODUTO.OUTRO;
}

export function classificarProduto(produto = {}) {
    const categoriaInformada = String(produto.categoria || "").trim();
    const tipoInformado = tipoDaCategoria(categoriaInformada);
    const categoria = tipoInformado === TIPOS_PRODUTO.OUTRO
        ? identificarCategoria(produto.nome)
        : categoriaInformada;
    const tipo = tipoDaCategoria(categoria);
    return {
        categoria,
        tipo,
        permitidoNaDespensa: tipo === TIPOS_PRODUTO.ALIMENTO
    };
}

export function filtrarAlimentos(produtos = []) {
    return (produtos || [])
        .map(produto => ({ ...produto, ...classificarProduto(produto) }))
        .filter(produto => produto.permitidoNaDespensa);
}
