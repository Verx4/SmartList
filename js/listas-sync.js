import { api } from "./api.js";

const CHAVE_LISTAS = "listasSalvas";
const CHAVE_LISTA_ATUAL = "listaAtualId";
const CHAVE_PRODUTOS = "produtos";
const CHAVE_MERCADO_ATUAL = "mercadoAtual";
const CHAVE_MERCADOS = "mercadosFrequentes";
const CHAVE_MERCADOS_ANTIGOS = "mercadosRecentes";
const CHAVE_ORCAMENTO = "orcamentoCompra";
const CHAVE_EXCLUIDAS = "listasExcluidasSync";
const CHAVE_ULTIMA_ALTERACAO = "listasUltimaAlteracao";
const CHAVE_USUARIO_ATIVO = "smartListUsuarioListasAtivo";
const PREFIXO_CACHE_USUARIO = "smartListListasUsuario:";
const TEMPO_LIMITE_REQUISICAO = 6000;

let sincronizando = false;
let sincronizacaoPendente = false;
let temporizador = null;

function lerJson(chave, padrao) {
    try {
        return JSON.parse(localStorage.getItem(chave)) ?? padrao;
    } catch (_erro) {
        return padrao;
    }
}

function texto(valor) {
    return String(valor ?? "").trim();
}

function instante(valor) {
    const tempo = new Date(valor || 0).getTime();
    return Number.isFinite(tempo) ? tempo : 0;
}

function usuarioSincronizacao() {
    for (const chave of ["usuarioAtual", "usuarioLogado"]) {
        const usuario = lerJson(chave, null);
        const identificador = texto(usuario?.id || usuario?.usuarioId || usuario?.email)
            .toLocaleLowerCase("pt-BR");

        if (identificador) return identificador;
    }

    return "";
}

function possuiSessao() {
    return Boolean(
        sessionStorage.getItem("accessToken")
        || sessionStorage.getItem("token")
        || localStorage.getItem("accessToken")
        || localStorage.getItem("token")
    );
}

function normalizarLista(lista = {}) {
    return {
        ...lista,
        id: texto(lista.id),
        nome: texto(lista.nome) || "Minha lista",
        criadorNome: texto(lista.criadorNome) || "Usuário",
        mercado: texto(lista.mercado),
        produtos: Array.isArray(lista.produtos) ? lista.produtos : [],
        criadoEm: lista.criadoEm || new Date().toISOString(),
        atualizadoEm: lista.atualizadoEm || lista.criadoEm || new Date().toISOString()
    };
}

function normalizarExcluidas(registros) {
    const porId = new Map();

    (Array.isArray(registros) ? registros : []).forEach(registro => {
        const id = texto(registro?.id);
        const excluidoEm = registro?.excluidoEm || new Date(0).toISOString();

        if (!id) return;

        const anterior = porId.get(id);
        if (!anterior || instante(excluidoEm) > instante(anterior.excluidoEm)) {
            porId.set(id, { id, excluidoEm });
        }
    });

    return [...porId.values()];
}

function capturarEstadoLocal() {
    let listas = (lerJson(CHAVE_LISTAS, []) || [])
        .map(normalizarLista)
        .filter(lista => lista.id);

    if (!listas.length) {
        const produtosLegados = lerJson(CHAVE_PRODUTOS, []);

        if (Array.isArray(produtosLegados) && produtosLegados.length) {
            const agora = new Date().toISOString();
            listas = [{
                id: texto(localStorage.getItem(CHAVE_LISTA_ATUAL))
                    || window.crypto?.randomUUID?.()
                    || `lista-${Date.now()}`,
                nome: "Minha lista",
                criadorNome: "Usuário",
                mercado: texto(localStorage.getItem(CHAVE_MERCADO_ATUAL)),
                produtos: produtosLegados,
                criadoEm: agora,
                atualizadoEm: agora
            }];
        }
    }
    const ultimaLista = listas.reduce(
        (maisRecente, lista) => Math.max(maisRecente, instante(lista.atualizadoEm)),
        0
    );
    const ultimaAlteracao = localStorage.getItem(CHAVE_ULTIMA_ALTERACAO);

    return {
        formato: 1,
        atualizadoEm: ultimaAlteracao
            || (ultimaLista ? new Date(ultimaLista).toISOString() : new Date().toISOString()),
        listas,
        listaAtualId: texto(localStorage.getItem(CHAVE_LISTA_ATUAL)),
        mercadosFrequentes: lerJson(CHAVE_MERCADOS, []),
        mercadosRecentes: lerJson(CHAVE_MERCADOS_ANTIGOS, []),
        orcamentoCompra: localStorage.getItem(CHAVE_ORCAMENTO),
        listasExcluidas: normalizarExcluidas(lerJson(CHAVE_EXCLUIDAS, []))
    };
}

function normalizarEstado(estado = {}) {
    return {
        formato: 1,
        atualizadoEm: estado.atualizadoEm || new Date(0).toISOString(),
        listas: (Array.isArray(estado.listas) ? estado.listas : [])
            .map(normalizarLista)
            .filter(lista => lista.id),
        listaAtualId: texto(estado.listaAtualId),
        mercadosFrequentes: Array.isArray(estado.mercadosFrequentes)
            ? estado.mercadosFrequentes.map(texto).filter(Boolean)
            : [],
        mercadosRecentes: Array.isArray(estado.mercadosRecentes)
            ? estado.mercadosRecentes.map(texto).filter(Boolean)
            : [],
        orcamentoCompra: estado.orcamentoCompra == null
            ? null
            : String(estado.orcamentoCompra),
        listasExcluidas: normalizarExcluidas(estado.listasExcluidas)
    };
}

function estadoInicialVazio(estado) {
    if (estado.listas.length !== 1) return false;

    const lista = estado.listas[0];
    return lista.nome === "Minha lista"
        && !lista.mercado
        && lista.produtos.length === 0
        && estado.listasExcluidas.length === 0;
}

function unirTextos(primeira, segunda) {
    const resultado = [];

    [...primeira, ...segunda].forEach(valor => {
        const item = texto(valor);
        if (!item) return;

        if (!resultado.some(existente => (
            existente.toLocaleLowerCase("pt-BR") === item.toLocaleLowerCase("pt-BR")
        ))) {
            resultado.push(item);
        }
    });

    return resultado;
}

function combinarEstados(localInformado, remotoInformado) {
    const local = normalizarEstado(localInformado);
    const remoto = normalizarEstado(remotoInformado);

    if (estadoInicialVazio(local) && !estadoInicialVazio(remoto)) {
        return remoto;
    }

    if (estadoInicialVazio(remoto) && !estadoInicialVazio(local)) {
        return local;
    }

    const excluidas = normalizarExcluidas([
        ...local.listasExcluidas,
        ...remoto.listasExcluidas
    ]);
    const exclusaoPorId = new Map(excluidas.map(item => [item.id, item]));
    const listasPorId = new Map();

    [...remoto.listas, ...local.listas].forEach(lista => {
        const anterior = listasPorId.get(lista.id);
        if (!anterior || instante(lista.atualizadoEm) >= instante(anterior.atualizadoEm)) {
            listasPorId.set(lista.id, lista);
        }
    });

    let listas = [...listasPorId.values()].filter(lista => {
        const exclusao = exclusaoPorId.get(lista.id);
        return !exclusao || instante(lista.atualizadoEm) > instante(exclusao.excluidoEm);
    });

    if (!listas.length) {
        const agora = new Date().toISOString();
        listas = [{
            id: window.crypto?.randomUUID?.() || `lista-${Date.now()}`,
            nome: "Minha lista",
            criadorNome: "Usuário",
            mercado: "",
            produtos: [],
            criadoEm: agora,
            atualizadoEm: agora
        }];
    }

    const localMaisNovo = instante(local.atualizadoEm) >= instante(remoto.atualizadoEm);
    const preferido = localMaisNovo ? local : remoto;
    const alternativo = localMaisNovo ? remoto : local;
    const ids = new Set(listas.map(lista => lista.id));
    const listaAtualId = ids.has(preferido.listaAtualId)
        ? preferido.listaAtualId
        : ids.has(alternativo.listaAtualId)
            ? alternativo.listaAtualId
            : listas[0].id;

    return {
        formato: 1,
        atualizadoEm: new Date(Math.max(
            instante(local.atualizadoEm),
            instante(remoto.atualizadoEm)
        )).toISOString(),
        listas,
        listaAtualId,
        mercadosFrequentes: unirTextos(
            remoto.mercadosFrequentes,
            local.mercadosFrequentes
        ),
        mercadosRecentes: unirTextos(
            remoto.mercadosRecentes,
            local.mercadosRecentes
        ),
        orcamentoCompra: preferido.orcamentoCompra ?? alternativo.orcamentoCompra,
        listasExcluidas: excluidas
    };
}

function conteudoComparavel(estado) {
    const normalizado = normalizarEstado(estado);
    delete normalizado.atualizadoEm;
    return JSON.stringify(normalizado);
}

function aplicarEstadoLocal(estadoInformado) {
    const estado = normalizarEstado(estadoInformado);
    const listaAtual = estado.listas.find(lista => lista.id === estado.listaAtualId)
        || estado.listas[0];

    if (!listaAtual) return;

    localStorage.setItem(CHAVE_LISTAS, JSON.stringify(estado.listas));
    localStorage.setItem(CHAVE_LISTA_ATUAL, listaAtual.id);
    localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(listaAtual.produtos));
    localStorage.setItem(CHAVE_EXCLUIDAS, JSON.stringify(estado.listasExcluidas));
    localStorage.setItem(CHAVE_ULTIMA_ALTERACAO, estado.atualizadoEm);
    localStorage.setItem(CHAVE_MERCADOS, JSON.stringify(estado.mercadosFrequentes));
    localStorage.setItem(CHAVE_MERCADOS_ANTIGOS, JSON.stringify(estado.mercadosRecentes));

    if (listaAtual.mercado) localStorage.setItem(CHAVE_MERCADO_ATUAL, listaAtual.mercado);
    else localStorage.removeItem(CHAVE_MERCADO_ATUAL);

    if (estado.orcamentoCompra == null) localStorage.removeItem(CHAVE_ORCAMENTO);
    else localStorage.setItem(CHAVE_ORCAMENTO, estado.orcamentoCompra);

    const usuario = usuarioSincronizacao();
    if (usuario) {
        localStorage.setItem(
            `${PREFIXO_CACHE_USUARIO}${usuario}`,
            JSON.stringify(estado)
        );
    }
}

function limparDadosDeOutraConta() {
    [
        CHAVE_LISTAS,
        CHAVE_LISTA_ATUAL,
        CHAVE_PRODUTOS,
        CHAVE_MERCADO_ATUAL,
        CHAVE_MERCADOS,
        CHAVE_MERCADOS_ANTIGOS,
        CHAVE_ORCAMENTO,
        CHAVE_EXCLUIDAS,
        CHAVE_ULTIMA_ALTERACAO
    ].forEach(chave => localStorage.removeItem(chave));
}

function prepararArmazenamentoDoUsuario() {
    const usuario = usuarioSincronizacao();
    if (!usuario) return;

    const anterior = texto(localStorage.getItem(CHAVE_USUARIO_ATIVO));
    if (anterior && anterior !== usuario) {
        localStorage.setItem(
            `${PREFIXO_CACHE_USUARIO}${anterior}`,
            JSON.stringify(capturarEstadoLocal())
        );
        limparDadosDeOutraConta();

        const cache = lerJson(`${PREFIXO_CACHE_USUARIO}${usuario}`, null);
        if (cache) aplicarEstadoLocal(cache);
    }

    localStorage.setItem(CHAVE_USUARIO_ATIVO, usuario);
}

async function requisicaoComPrazo(executor) {
    const controlador = new AbortController();
    const limite = window.setTimeout(() => controlador.abort(), TEMPO_LIMITE_REQUISICAO);

    try {
        return await executor(controlador.signal);
    } finally {
        window.clearTimeout(limite);
    }
}

function lerEstadoRemoto(resposta) {
    if (!resposta?.conteudo) return null;

    try {
        return normalizarEstado(JSON.parse(resposta.conteudo));
    } catch (_erro) {
        return null;
    }
}

async function enviarEstado(estado, versaoBase) {
    const atualizado = {
        ...normalizarEstado(estado),
        atualizadoEm: new Date().toISOString()
    };
    const resposta = await requisicaoComPrazo(signal => api.put(
        "/listas/sincronizacao",
        {
            conteudo: JSON.stringify(atualizado),
            versaoBase
        },
        { signal }
    ));

    aplicarEstadoLocal(atualizado);
    return resposta;
}

async function sincronizar(tentativa = 0) {
    if (!possuiSessao() || !usuarioSincronizacao()) return;

    if (sincronizando) {
        sincronizacaoPendente = true;
        return;
    }

    sincronizando = true;

    try {
        const resposta = await requisicaoComPrazo(signal => api.get(
            "/listas/sincronizacao",
            { signal }
        ));
        const versao = Number(resposta?.versao || 0);
        const local = capturarEstadoLocal();
        const remoto = lerEstadoRemoto(resposta);

        if (!remoto) {
            await enviarEstado(local, versao);
            return;
        }

        const combinado = combinarEstados(local, remoto);
        const localMudou = conteudoComparavel(combinado) !== conteudoComparavel(local);
        const remotoMudou = conteudoComparavel(combinado) !== conteudoComparavel(remoto);

        if (localMudou) aplicarEstadoLocal(combinado);
        if (remotoMudou) await enviarEstado(combinado, versao);
    } catch (erro) {
        if (Number(erro?.status) === 409 && tentativa < 1) {
            sincronizando = false;
            await sincronizar(tentativa + 1);
            return;
        }

        console.warn("Não foi possível sincronizar as listas agora.", erro);
    } finally {
        sincronizando = false;

        if (sincronizacaoPendente) {
            sincronizacaoPendente = false;
            agendarSincronizacao();
        }
    }
}

function agendarSincronizacao() {
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => void sincronizar(), 700);
}

export async function iniciarSincronizacaoListas() {
    prepararArmazenamentoDoUsuario();

    try {
        await sincronizar();
    } finally {
        window.__smartListSincronizacaoInicialConcluida = true;
        window.dispatchEvent(new CustomEvent("listassincronizadas"));
    }

    window.addEventListener("dadoslistaalterados", agendarSincronizacao);
    window.addEventListener("produtosalterados", agendarSincronizacao);
    window.addEventListener("online", agendarSincronizacao);
}

export const listasSyncInterno = {
    capturarEstadoLocal,
    combinarEstados,
    normalizarEstado
};
