import { api } from "./api.js";
import { classificarProduto, filtrarAlimentos } from "./classificacao-produtos.js";
import {
    descontarDoEstoque,
    normalizarIngrediente,
    normalizarUnidade,
    quantidadeCanonica,
    somarAoEstoque
} from "./receitas-core.js?v=3";

const MENSAGEM_NAO_ALIMENTO =
    "Este item não é classificado como alimento e não pode ser adicionado à Despensa de Receitas.";

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

function adaptarItem(item = {}) {
    const quantidadeConhecida = item.quantidadeConhecida !== false
        && item.quantidade !== null
        && item.quantidade !== undefined;
    return {
        ...item,
        quantidade: quantidadeConhecida ? Math.max(0, Number(item.quantidade) || 0) : null,
        quantidadeConhecida,
        unidade: normalizarUnidade(item.unidade).unidade,
        chaveProduto: item.chaveProduto || normalizarIngrediente(item.nome),
        ...classificarProduto(item)
    };
}

export function listarDespensa() {
    return lerDespensa()
        .map(adaptarItem)
        .filter(item => item.permitidoNaDespensa);
}

export function salvarDespensa(itens = []) {
    const dados = filtrarAlimentos(itens)
        .filter(item => item?.nome)
        .map(item => {
            const quantidadeConhecida = item.quantidadeConhecida !== false
                && item.quantidade !== null
                && item.quantidade !== undefined;
            return {
                ...item,
                quantidade: quantidadeConhecida ? Math.max(0, Number(item.quantidade) || 0) : null,
                quantidadeConhecida,
                unidade: normalizarUnidade(item.unidade).unidade,
                chaveProduto: normalizarIngrediente(item.nome),
                atualizadoEm: item.atualizadoEm || new Date().toISOString()
            };
        });
    localStorage.setItem(chaveDespensa(), JSON.stringify(dados));
    window.dispatchEvent(new CustomEvent("despensaalterada", { detail: { itens: dados } }));
    return dados;
}

function itensCompradosCanonicos(itens = []) {
    return filtrarAlimentos(itens).map(item => {
        const porPeso = item.medida === "kg" || Number(item.peso) > 0;
        return {
            nome: item.nome,
            categoria: item.categoria,
            tipo: item.tipo,
            quantidade: porPeso ? Number(item.peso) || Number(item.quantidade) : Number(item.quantidade),
            quantidadeConhecida: true,
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
    const classificacao = classificarProduto(item);
    if (!classificacao.permitidoNaDespensa) throw new Error(MENSAGEM_NAO_ALIMENTO);
    const quantidadeConhecida = item.quantidade !== null
        && item.quantidade !== undefined
        && String(item.quantidade).trim() !== "";
    const novo = {
        ...item,
        ...classificacao,
        quantidade: quantidadeConhecida ? Number(item.quantidade) : null,
        quantidadeConhecida,
        unidade: item.unidade || "unidade"
    };
    const atualizada = salvarDespensa(somarAoEstoque(listarDespensa(), [novo]));
    sincronizarItemRemoto(novo, "POST");
    return atualizada.find(entrada => entrada.chaveProduto === normalizarIngrediente(novo.nome));
}

export function atualizarItemDespensa(id, alteracoes = {}) {
    const itens = listarDespensa();
    const indice = itens.findIndex(item => String(item.id) === String(id));
    if (indice < 0) return null;
    const candidato = { ...itens[indice], ...alteracoes };
    const classificacao = classificarProduto(candidato);
    if (!classificacao.permitidoNaDespensa) throw new Error(MENSAGEM_NAO_ALIMENTO);
    const quantidadeConhecida = alteracoes.quantidadeConhecida === false
        ? false
        : alteracoes.quantidade !== null && alteracoes.quantidade !== undefined
            ? String(alteracoes.quantidade).trim() !== ""
            : itens[indice].quantidadeConhecida !== false;
    const unidade = alteracoes.unidade || itens[indice].unidade;
    const canonica = quantidadeCanonica(
        quantidadeConhecida ? alteracoes.quantidade ?? itens[indice].quantidade : 0,
        unidade
    );
    itens[indice] = {
        ...candidato,
        ...classificacao,
        quantidade: quantidadeConhecida ? canonica.quantidade : null,
        quantidadeConhecida,
        unidade: canonica.unidade,
        chaveProduto: normalizarIngrediente(candidato.nome),
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
    return salvarDespensa(descontarDoEstoque(listarDespensa(), ingredientes));
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
            quantidadeConhecida: item.quantidadeConhecida,
            unidade: item.unidade,
            categoria: item.categoria,
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
        // A despensa local continua funcional offline.
    }
}

async function sincronizarItemRemoto(item, metodo) {
    const corpo = {
        nome: item.nome,
        quantidade: item.quantidadeConhecida === false ? null : item.quantidade,
        unidade: item.unidade,
        categoria: item.categoria
    };
    try {
        if (metodo === "PATCH" && item.remotoId) {
            await api.patch(`/despensa/${item.remotoId}`, corpo);
        } else if (metodo === "POST") {
            await api.post("/despensa", corpo);
        }
    } catch {
        // Mantém a alteração local se o backend estiver indisponível.
    }
}
