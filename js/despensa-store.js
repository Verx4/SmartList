const CHAVE_DESPENSA = "despensa";
const CHAVE_ATUALIZACAO = "despensaAtualizadaEm";
const CHAVE_LISTAS_ATUALIZACAO = "listasUltimaAlteracao";

const texto = valor => String(valor ?? "").trim().replace(/\s+/g, " ");
const numero = valor => {
    const resultado = Number(valor);
    return Number.isFinite(resultado) ? Math.max(0, resultado) : 0;
};
const normalizarUnidade = valor => {
    const unidade = texto(valor).toLocaleLowerCase("pt-BR");
    if (["un", "und", "unid", "unidade", "unidades"].includes(unidade)) return "unidade";
    if (["quilo", "quilos", "kilograma", "kilogramas"].includes(unidade)) return "kg";
    if (["litro", "litros"].includes(unidade)) return "l";
    return unidade || "unidade";
};
const chaveProduto = item => `${texto(item.nome).toLocaleLowerCase("pt-BR")}::${normalizarUnidade(item.unidade || item.medida)}`;

function criarId() {
    return globalThis.crypto?.randomUUID?.() || `despensa-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizarItemDespensa(item = {}) {
    const agora = new Date().toISOString();
    return { id: texto(item.id) || criarId(), nome: texto(item.nome) || "Produto sem nome", categoria: texto(item.categoria) || "📦 Outros", quantidade: numero(item.quantidade), unidade: normalizarUnidade(item.unidade || item.medida), minimo: Math.max(1, numero(item.minimo) || 1), atualizadoEm: item.atualizadoEm || agora };
}

export function listarDespensa() {
    try {
        const itens = JSON.parse(localStorage.getItem(CHAVE_DESPENSA));
        return Array.isArray(itens) ? itens.map(normalizarItemDespensa) : [];
    } catch (_erro) { return []; }
}

export function salvarDespensa(itens = []) {
    const agora = new Date().toISOString();
    const normalizados = itens.map(normalizarItemDespensa);
    localStorage.setItem(CHAVE_DESPENSA, JSON.stringify(normalizados));
    localStorage.setItem(CHAVE_ATUALIZACAO, agora);
    localStorage.setItem(CHAVE_LISTAS_ATUALIZACAO, agora);
    globalThis.window?.dispatchEvent?.(new CustomEvent("dadoslistaalterados", { detail: { despensa: normalizados } }));
    return normalizados;
}

export function adicionarItemDespensa(dados = {}) {
    const itens = listarDespensa();
    const novo = normalizarItemDespensa(dados);
    const indice = itens.findIndex(item => chaveProduto(item) === chaveProduto(novo));
    if (indice >= 0) itens[indice] = { ...itens[indice], categoria: novo.categoria || itens[indice].categoria, quantidade: numero(itens[indice].quantidade) + numero(novo.quantidade), atualizadoEm: new Date().toISOString() };
    else itens.push(novo);
    return salvarDespensa(itens);
}

export function alterarQuantidadeDespensa(id, variacao) {
    return salvarDespensa(listarDespensa().map(item => String(item.id) === String(id) ? { ...item, quantidade: Math.max(0, numero(item.quantidade) + Number(variacao || 0)), atualizadoEm: new Date().toISOString() } : item));
}

export function marcarItemComoAcabou(id) {
    return salvarDespensa(listarDespensa().map(item => String(item.id) === String(id) ? { ...item, quantidade: 0, atualizadoEm: new Date().toISOString() } : item));
}

export function removerItemDespensa(id) {
    return salvarDespensa(listarDespensa().filter(item => String(item.id) !== String(id)));
}

export function produtosAcabando(itens = listarDespensa()) {
    return itens.filter(item => numero(item.quantidade) <= Math.max(1, numero(item.minimo) || 1));
}

export function adicionarCompraNaDespensa(compra = {}) {
    let itens = listarDespensa();
    (Array.isArray(compra.itens) ? compra.itens : []).forEach(produto => {
        const quantidade = numero(produto.peso) > 0 ? numero(produto.peso) : numero(produto.quantidade);
        if (quantidade <= 0) return;
        const novo = normalizarItemDespensa({ nome: produto.nome, categoria: produto.categoria, quantidade, unidade: numero(produto.peso) > 0 ? "kg" : produto.medida || "unidade" });
        const indice = itens.findIndex(item => chaveProduto(item) === chaveProduto(novo));
        if (indice >= 0) itens[indice] = { ...itens[indice], quantidade: numero(itens[indice].quantidade) + quantidade, atualizadoEm: new Date().toISOString() };
        else itens.push(novo);
    });
    return salvarDespensa(itens);
}

export const despensaInterno = { chaveProduto, CHAVE_DESPENSA, CHAVE_ATUALIZACAO };
