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

function identificarMercadoAtual(unidades) {
    const proxima = Array.isArray(unidades) ? unidades[0] : null;
    const distancia = Number(proxima?.distanciaKm);
    if (!proxima || !Number.isFinite(distancia) || distancia > 0.3) {
        localStorage.removeItem("smartListUnidadeMercadoAtual");
        return;
    }

    const nome = [proxima.rede, proxima.unidade]
        .filter(Boolean)
        .join(" · ");
    if (!nome) {
        return;
    }

    let frequentes = [];
    try {
        const salvos = JSON.parse(localStorage.getItem("mercadosFrequentes"));
        frequentes = Array.isArray(salvos) ? salvos : [];
    } catch (_erro) {
        frequentes = [];
    }
    if (!frequentes.some(item =>
        String(item).toLocaleLowerCase("pt-BR")
            === nome.toLocaleLowerCase("pt-BR")
    )) {
        frequentes.push(nome);
        localStorage.setItem(
            "mercadosFrequentes",
            JSON.stringify(frequentes)
        );
    }

    localStorage.setItem("mercadoAtual", nome);
    localStorage.setItem(
        "smartListUnidadeMercadoAtual",
        JSON.stringify({
            id: proxima.id,
            rede: proxima.rede,
            unidade: proxima.unidade,
            endereco: proxima.endereco,
            bairro: proxima.bairro,
            cidade: proxima.cidade,
            estado: proxima.estado,
            distanciaKm: distancia,
            identificadaEm: new Date().toISOString()
        })
    );

    const resumo = document.getElementById("mercadoAtualResumo");
    if (resumo) {
        resumo.textContent = nome;
    }
    window.dispatchEvent(new CustomEvent(
        "smartlist:mercado-identificado",
        { detail: { nome, unidade: proxima } }
    ));
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
    try {
        const unidades = await api.get(
            `/ofertas/unidades-proximas?${parametros}`
        );
        identificarMercadoAtual(unidades);
    } catch (_erro) {
        // A atualização da localização não depende da resposta de mercados.
    }

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
