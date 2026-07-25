import { api, ApiError } from "./api.js";
import { escaparHTML, normalizarTexto } from "./utils.js";

const CHAVE_LOCAL = "sugestoesLocais";
const CHAVE_MIGRACAO = "sugestoesMigradasParaServidorV1";

let sugestoes = [];
let usandoServidor = false;

function lerLocais() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || [];
        return Array.isArray(dados) ? dados : [];
    } catch {
        return [];
    }
}

function salvarLocais() {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(sugestoes));
}

function normalizarSugestao(item = {}) {
    return {
        ...item,
        id: String(item.id || ""),
        categoria: item.categoria || "outros",
        titulo: item.titulo || "",
        descricao: item.descricao || "",
        votos: Number(item.votos || 0),
        status: item.status || "NOVA",
        data: item.criadoEm || item.data || new Date().toISOString(),
        remota: Boolean(item.criadoEm || /^[0-9a-f]{8}-/i.test(String(item.id || "")))
    };
}

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemSugestao");
    if (!elemento) {
        return;
    }

    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
}

async function migrarSugestoesLocais() {
    if (localStorage.getItem(CHAVE_MIGRACAO) === "1") {
        return;
    }

    const locais = lerLocais();
    if (!locais.length) {
        localStorage.setItem(CHAVE_MIGRACAO, "1");
        return;
    }

    for (const item of locais) {
        await api.post("/sugestoes", {
            categoria: item.categoria || "outros",
            titulo: item.titulo,
            descricao: item.descricao
        });
    }

    localStorage.removeItem(CHAVE_LOCAL);
    localStorage.setItem(CHAVE_MIGRACAO, "1");
}

function renderizar() {
    const termo = normalizarTexto(
        document.getElementById("buscarSugestao")?.value
    );
    const ordem = document.getElementById("ordenarSugestoes")?.value;
    const lista = sugestoes
        .filter(item => normalizarTexto(
            `${item.titulo} ${item.descricao} ${item.categoria}`
        ).includes(termo))
        .filter(item => {
            if (ordem === "em-analise") {
                return item.status === "EM_ANALISE";
            }
            if (ordem === "aprovadas") {
                return ["PLANEJADA", "CONCLUIDA"].includes(item.status);
            }
            return true;
        });

    if (ordem === "recentes") {
        lista.sort((a, b) => new Date(b.data) - new Date(a.data));
    } else {
        lista.sort((a, b) => b.votos - a.votos);
    }

    const container = document.getElementById("listaSugestoes");
    if (!container) {
        return;
    }

    container.innerHTML = lista.length
        ? lista.map(item => `
            <article class="card sugestao" data-sugestao-id="${escaparHTML(item.id)}">
                <span>${escaparHTML(item.categoria)}</span>
                <h3>${escaparHTML(item.titulo)}</h3>
                <p>${escaparHTML(item.descricao)}</p>
                <div class="sugestao-acoes">
                    <button type="button" data-votar>
                        👍 <span>${item.votos}</span>
                    </button>
                    <small>${escaparHTML(
                        item.status === "EM_ANALISE"
                            ? "Em análise"
                            : item.status === "PLANEJADA"
                                ? "Planejada"
                                : item.status === "CONCLUIDA"
                                    ? "Concluída"
                                    : "Recebida"
                    )}</small>
                </div>
            </article>
        `).join("")
        : `<div class="card estado-vazio">Nenhuma sugestão enviada.</div>`;
}

async function carregar() {
    try {
        await migrarSugestoesLocais();
        const resposta = await api.get("/sugestoes");
        sugestoes = (Array.isArray(resposta) ? resposta : [])
            .map(normalizarSugestao);
        usandoServidor = true;
    } catch {
        sugestoes = lerLocais().map(normalizarSugestao);
        usandoServidor = false;
        mostrarMensagem(
            "As sugestões serão mantidas neste aparelho até o servidor voltar.",
            "aviso"
        );
    }

    renderizar();
}

document.getElementById("formSugestao")?.addEventListener("submit", async evento => {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const botao = formulario.querySelector('button[type="submit"]');
    const dados = Object.fromEntries(new FormData(formulario));

    botao.disabled = true;

    try {
        if (usandoServidor) {
            const salva = await api.post("/sugestoes", dados);
            sugestoes.unshift(normalizarSugestao(salva));
        } else {
            sugestoes.unshift(normalizarSugestao({
                id: `local-${Date.now()}`,
                ...dados,
                data: new Date().toISOString()
            }));
            salvarLocais();
        }

        formulario.reset();
        mostrarMensagem(
            usandoServidor
                ? "Sugestão enviada para a equipe Smart List."
                : "Sugestão salva neste aparelho e será enviada quando o servidor voltar."
        );
        renderizar();
    } catch (erro) {
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível enviar a sugestão.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
});

document.addEventListener("click", async evento => {
    const botao = evento.target.closest("[data-votar]");
    if (!botao) {
        return;
    }

    const id = botao.closest("[data-sugestao-id]")?.dataset.sugestaoId;
    const sugestao = sugestoes.find(item => item.id === id);
    if (!sugestao) {
        return;
    }

    botao.disabled = true;

    try {
        if (usandoServidor && sugestao.remota) {
            const atualizada = await api.patch(`/sugestoes/${id}/voto`);
            Object.assign(sugestao, normalizarSugestao(atualizada));
        } else {
            sugestao.votos += 1;
            salvarLocais();
        }
        renderizar();
    } catch (erro) {
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível registrar o voto.",
            "erro"
        );
        botao.disabled = false;
    }
});

document.getElementById("buscarSugestao")
    ?.addEventListener("input", renderizar);
document.getElementById("ordenarSugestoes")
    ?.addEventListener("change", renderizar);

carregar();
