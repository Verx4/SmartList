import { api, ApiError } from "./api.js";
import { escaparHTML, normalizarTexto } from "./utils.js";

let sugestoes = [];

const textosStatus = {
    NOVA: "Nova",
    EM_ANALISE: "Em análise",
    PLANEJADA: "Planejada",
    CONCLUIDA: "Concluída",
    ARQUIVADA: "Arquivada"
};

function preencher(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = String(valor);
    }
}

function formatarData(valor) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "-"
        : data.toLocaleString("pt-BR");
}

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemAdminSugestoes");
    if (!elemento) {
        return;
    }
    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
}

function opcoesStatus(statusAtual) {
    return Object.entries(textosStatus)
        .map(([valor, texto]) => `
            <option value="${valor}" ${valor === statusAtual ? "selected" : ""}>
                ${texto}
            </option>
        `)
        .join("");
}

function atualizarResumo() {
    preencher("totalSugestoes", sugestoes.length);
    preencher("sugestoesNovas", sugestoes.filter(item => item.status === "NOVA").length);
    preencher(
        "sugestoesAnalise",
        sugestoes.filter(item => item.status === "EM_ANALISE").length
    );
    preencher(
        "sugestoesConcluidas",
        sugestoes.filter(item => item.status === "CONCLUIDA").length
    );
}

function renderizar() {
    const termo = normalizarTexto(
        document.getElementById("buscarAdminSugestao")?.value
    );
    const status = document.getElementById("filtroAdminSugestao")?.value || "";
    const filtradas = sugestoes.filter(item => {
        const correspondeBusca = normalizarTexto(
            `${item.titulo} ${item.descricao} ${item.usuarioNome} ${item.usuarioEmail}`
        ).includes(termo);
        const correspondeStatus = !status || item.status === status;
        return correspondeBusca && correspondeStatus;
    });

    const container = document.getElementById("listaAdminSugestoes");
    if (!container) {
        return;
    }

    container.innerHTML = filtradas.length
        ? filtradas.map(item => `
            <article class="admin-feedback" data-sugestao-id="${escaparHTML(item.id)}">
                <div class="admin-feedback-topo">
                    <span class="status status-neutro">
                        ${escaparHTML(item.categoria || "Outros")}
                    </span>
                    <strong>👍 ${Number(item.votos || 0)}</strong>
                </div>
                <h3>${escaparHTML(item.titulo)}</h3>
                <p>${escaparHTML(item.descricao)}</p>
                <div class="admin-feedback-rodape">
                    <span>
                        <strong>${escaparHTML(item.usuarioNome || "Usuário")}</strong><br>
                        ${escaparHTML(item.usuarioEmail || "")}<br>
                        ${escaparHTML(formatarData(item.criadoEm))}
                    </span>
                    <label>
                        <span class="sr-only">Status da sugestão</span>
                        <select data-alterar-status>
                            ${opcoesStatus(item.status || "NOVA")}
                        </select>
                    </label>
                </div>
            </article>
        `).join("")
        : `<p class="estado-vazio">Nenhuma sugestão encontrada.</p>`;
}

async function carregar() {
    try {
        const resposta = await api.get("/admin/sugestoes");
        sugestoes = Array.isArray(resposta) ? resposta : [];
        atualizarResumo();
        renderizar();
    } catch (erro) {
        sugestoes = [];
        atualizarResumo();
        renderizar();
        mostrarMensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível carregar as sugestões.",
            "erro"
        );
    }
}

document.getElementById("listaAdminSugestoes")?.addEventListener("change", async evento => {
    const seletor = evento.target.closest("[data-alterar-status]");
    if (!seletor) {
        return;
    }

    const cartao = seletor.closest("[data-sugestao-id]");
    const sugestao = sugestoes.find(item => String(item.id) === cartao?.dataset.sugestaoId);
    if (!sugestao) {
        return;
    }

    const statusAnterior = sugestao.status;
    seletor.disabled = true;

    try {
        const atualizada = await api.patch(
            `/admin/sugestoes/${sugestao.id}/status`,
            { status: seletor.value }
        );
        Object.assign(sugestao, atualizada);
        atualizarResumo();
        mostrarMensagem("Status da sugestão atualizado.");
    } catch (erro) {
        seletor.value = statusAnterior;
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível atualizar o status.",
            "erro"
        );
    } finally {
        seletor.disabled = false;
    }
});

document.getElementById("buscarAdminSugestao")
    ?.addEventListener("input", renderizar);
document.getElementById("filtroAdminSugestao")
    ?.addEventListener("change", renderizar);

carregar();
