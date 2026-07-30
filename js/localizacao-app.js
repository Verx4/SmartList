import { api } from "./api.js";

const CHAVE_AUTORIZADA = "smartListLocalizacaoAutorizada";
const CHAVE_SESSAO = "smartListLocalizacaoAtualizadaSessao";
const CHAVE_ULTIMA = "smartListUltimaLocalizacaoEm";
const INTERVALO_ATUALIZACAO = 15 * 60 * 1000;

let atualizacaoEmAndamento = null;

function autenticado() {
    return Boolean(
        sessionStorage.getItem("accessToken")
        || localStorage.getItem("accessToken")
        || sessionStorage.getItem("token")
        || localStorage.getItem("token")
    );
}

async function permissaoPersistente() {
    if (!navigator.permissions?.query) {
        return false;
    }
    try {
        const permissao = await navigator.permissions.query({
            name: "geolocation"
        });
        return permissao.state === "granted";
    } catch (_erro) {
        return false;
    }
}

function obterPosicao() {
    return new Promise(resolve => {
        navigator.geolocation.getCurrentPosition(
            posicao => resolve({ posicao }),
            erro => resolve({ erro }),
            {
                enableHighAccuracy: false,
                timeout: 12000,
                maximumAge: 300000
            }
        );
    });
}

async function salvarPosicao(posicao) {
    const coordenadas = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        precisao: posicao.coords.accuracy
    };
    await api.post("/localizacoes", {
        origem: "GPS",
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
        precisaoMetros: coordenadas.precisao,
        cidade: "",
        estado: "",
        bairro: null,
        consentimento: true
    });

    const parametros = new URLSearchParams({
        latitude: String(coordenadas.latitude),
        longitude: String(coordenadas.longitude),
        raioKm: "25"
    });
    api.get(`/ofertas/unidades-proximas?${parametros}`).catch(() => null);

    localStorage.setItem(CHAVE_AUTORIZADA, "true");
    localStorage.setItem(CHAVE_ULTIMA, String(Date.now()));
    sessionStorage.setItem(CHAVE_SESSAO, "true");
    return { atualizada: true };
}

export async function atualizarLocalizacaoAtual({
    solicitar = false,
    renovar = false
} = {}) {
    if (!autenticado() || !navigator.geolocation) {
        return { atualizada: false, motivo: "indisponivel" };
    }
    if (!solicitar) {
        if (localStorage.getItem(CHAVE_AUTORIZADA) !== "true") {
            return { atualizada: false, motivo: "nao_autorizada" };
        }
        if (!await permissaoPersistente()) {
            return { atualizada: false, motivo: "permissao_nao_persistente" };
        }
    }
    if (!renovar && sessionStorage.getItem(CHAVE_SESSAO) === "true") {
        return { atualizada: false, motivo: "sessao_atualizada" };
    }
    if (atualizacaoEmAndamento) {
        return atualizacaoEmAndamento;
    }

    atualizacaoEmAndamento = (async () => {
        const resultado = await obterPosicao();
        if (resultado.erro) {
            if (resultado.erro.code === resultado.erro.PERMISSION_DENIED) {
                localStorage.removeItem(CHAVE_AUTORIZADA);
            }
            return {
                atualizada: false,
                motivo: resultado.erro.code === resultado.erro.PERMISSION_DENIED
                    ? "negada"
                    : "falha"
            };
        }
        try {
            return await salvarPosicao(resultado.posicao);
        } catch (_erro) {
            return { atualizada: false, motivo: "servidor" };
        }
    })();

    try {
        return await atualizacaoEmAndamento;
    } finally {
        atualizacaoEmAndamento = null;
    }
}

export function ativarAtualizacaoLocalizacao() {
    atualizarLocalizacaoAtual().catch(() => null);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") {
            return;
        }
        const ultima = Number(localStorage.getItem(CHAVE_ULTIMA) || 0);
        if (Date.now() - ultima >= INTERVALO_ATUALIZACAO) {
            atualizarLocalizacaoAtual({ renovar: true }).catch(() => null);
        }
    });
}
