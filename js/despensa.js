import { api } from "./api.js";
import {
    descontarDoEstoque,
    normalizarIngrediente,
    normalizarUnidade,
    quantidadeCanonica,
    somarAoEstoque
} from "./receitas-core.js?v=2";

function usuarioAtual() {
    for (const chave of ["usuarioAtual", "usuarioLogado"]) {
        try {
            const usuario = JSON.parse(localStorage.getItem(chave));
            if (usuario) return usuario;
        } catch {
            // Usa o armazenamento local anônimo.
        }
    }
    return null;
}

function identificadorUsuario() {
    const usuario = usuarioAtual();
    return String(usuario?.id || usuario?.email || "anonimo")
        .toLocaleLowerCase("pt-BR")
        .replace(/[^a-z0-9@._-]/g, "-");
}

function chaveDespensa() {
    return `smartListDespensa:${identificadorUsuario()}`;
}

function lerDespensa() {
    try {
        const dados = JSON.parse(localStorage.getItem(chaveDespensa()));
        return Array.isArray(dados) ? dados : [];
    } catch {
        return [];
    }
}

export function listarDespensa() {
    return lerDespensa().map(item => ({
        ...item,
        quantidade: Math.max(0, Number(item.quantidade) || 0),
        unidade: normalizarUnidade(item.unidade).unidade,
        chaveProduto: item.chaveProduto || normalizarIngrediente(item.nome)
    }));
}

export function salvarDespensa(itens = []) {
    const dados = itens
        .filter(item => item?.nome)
        .map(item => ({
            ...item,
            quantidade: Math.max(0, Number(item.quantidade) || 0),
            unidade: normalizarUnidade(item.unidade).unidade,
            chaveProduto: normalizarIngrediente(item.nome),
            atualizadoEm: item.atualizadoEm || new Date().toISOString()
        }));
    localStorage.setItem(chaveDespensa(), JSON.stringify(dados));
    window.dispatchEvent(new CustomEvent("despensaalterada", { detail: { itens: dados } }));
    return dados;
}

function itensCompradosCanonicos(itens = []) {
    return itens.map(item => {
        const porPeso = item.medida === "kg" || Number(item.peso) > 0;
        return {
            nome: item.nome,
            quantidade: porPeso ? Number(item.peso) || Number(item.quantidade) : Number(item.quantidade),
            unidade: porPeso ? "kg" : item.medida || item.unidade || "unidade"
        };
    }).filter(item => item.nome && item.quantidade > 0);
}

export function adicionarCompraADespensa(itens = []) {
    const comprados = itensCompradosCanonicos(itens);
    const atualizada = salvarDespensa(somarAoEstoque(listarDespensa(), comprados));
    sincronizarCompraRemota(comprados);
    return atualizada;
}

export function adicionarItemDespensa(item) {
    const atualizada = salvarDespensa(somarAoEstoque(listarDespensa(), [item]));
    sincronizarItemRemoto(item, "POST");
    return atualizada;
}

export function atualizarItemDespensa(id, alteracoes = {}) {
    const itens = listarDespensa();
    const indice = itens.findIndex(item => String(item.id) === String(id));
    if (indice < 0) return null;
    const unidade = alteracoes.unidade || itens[indice].unidade;
    const canonica = quantidadeCanonica(
        alteracoes.quantidade ?? itens[indice].quantidade,
        unidade
    );
    itens[indice] = {
        ...itens[indice],
        ...alteracoes,
        quantidade: canonica.quantidade,
        unidade: canonica.unidade,
        chaveProduto: normalizarIngrediente(alteracoes.nome || itens[indice].nome),
        atualizadoEm: new Date().toISOString()
    };
    salvarDespensa(itens);
    sincronizarItemRemoto(itens[indice], "PATCH");
    return itens[indice];
}

export function removerItemDespensa(id) {
    const item = listarDespensa().find(entrada => String(entrada.id) === String(id));
    salvarDespensa(listarDespensa().filter(entrada => String(entrada.id) !== String(id)));
    if (item?.remotoId) api.delete(`/despensa/${item.remotoId}`).catch(() => null);
}

export function descontarReceitaDaDespensa(ingredientes = []) {
    const atualizada = salvarDespensa(descontarDoEstoque(listarDespensa(), ingredientes));
    return atualizada;
}

export async function carregarDespensaRemota() {
    try {
        const remota = await api.get("/despensa");
        if (!Array.isArray(remota)) return listarDespensa();
        if (!remota.length && listarDespensa().length) return listarDespensa();
        const adaptada = remota.map(item => ({
            id: item.id,
            remotoId: item.id,
            nome: item.nome,
            chaveProduto: item.chaveProduto,
            quantidade: item.quantidade,
            unidade: item.unidade,
            atualizadoEm: item.atualizadoEm
        }));
        return salvarDespensa(adaptada);
    } catch {
        return listarDespensa();
    }
}

async function sincronizarCompraRemota(itens) {
    try {
        await api.post("/despensa/compras", { itens });
    } catch {
        // A despensa local continua funcional offline e será exibida imediatamente.
    }
}

async function sincronizarItemRemoto(item, metodo) {
    try {
        if (metodo === "PATCH" && item.remotoId) {
            await api.patch(`/despensa/${item.remotoId}`, item);
        } else if (metodo === "POST") {
            await api.post("/despensa", item);
        }
    } catch {
        // Mantém a alteração local se o backend estiver indisponível.
    }
}
