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
                ${item.respostaAdmin ? `
                    <div class="admin-feedback-resposta-atual">
                        <strong>Resposta enviada</strong>
                        <p>${escaparHTML(item.respostaAdmin)}</p>
                        <small>${escaparHTML(formatarData(item.respondidoEm))}</small>
                    </div>
                ` : ""}
                <div class="admin-feedback-resposta">
                    <label for="resposta-${escaparHTML(item.id)}">Resposta do ADM</label>
                    <textarea
                        id="resposta-${escaparHTML(item.id)}"
                        data-resposta-admin
                        rows="3"
                        maxlength="2000"
                        placeholder="Digite a resposta que aparecerá na conta do usuário"
                    >${escaparHTML(item.respostaAdmin || "")}</textarea>
                    <div class="admin-feedback-acoes">
                        <button class="btn btn-primary btn-pequeno" type="button" data-enviar-resposta>
                            ${item.respostaAdmin ? "Atualizar resposta" : "Enviar resposta"}
                        </button>
                        <button class="btn btn-danger btn-pequeno" type="button" data-excluir-sugestao>
                            Excluir
                        </button>
                    </div>
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

document.getElementById("listaAdminSugestoes")?.addEventListener("click", async evento => {
    const botaoResponder = evento.target.closest("[data-enviar-resposta]");
    const botaoExcluir = evento.target.closest("[data-excluir-sugestao]");

    if (!botaoResponder && !botaoExcluir) {
        return;
    }

    const cartao = evento.target.closest("[data-sugestao-id]");
    const sugestao = sugestoes.find(item => String(item.id) === cartao?.dataset.sugestaoId);

    if (!sugestao) {
        return;
    }

    if (botaoExcluir) {
        const confirmar = window.confirm(
            `Excluir definitivamente a mensagem “${sugestao.titulo}”?`
        );

        if (!confirmar) {
            return;
        }

        botaoExcluir.disabled = true;
        try {
            await api.delete(`/admin/sugestoes/${sugestao.id}`);
            sugestoes = sugestoes.filter(item => item.id !== sugestao.id);
            atualizarResumo();
            renderizar();
            mostrarMensagem("Sugestão excluída com sucesso.");
        } catch (erro) {
            botaoExcluir.disabled = false;
            mostrarMensagem(
                erro instanceof ApiError ? erro.message : "Não foi possível excluir a sugestão.",
                "erro"
            );
        }
        return;
    }

    const campo = cartao.querySelector("[data-resposta-admin]");
    const resposta = campo?.value.trim() || "";

    if (!resposta) {
        mostrarMensagem("Digite uma resposta antes de enviar.", "erro");
        campo?.focus();
        return;
    }

    botaoResponder.disabled = true;
    try {
        const atualizada = await api.patch(
            `/admin/sugestoes/${sugestao.id}/resposta`,
            { resposta }
        );
        Object.assign(sugestao, atualizada);
        renderizar();
        mostrarMensagem("Resposta enviada para a conta do usuário.");
    } catch (erro) {
        botaoResponder.disabled = false;
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível enviar a resposta.",
            "erro"
        );
    }
});

document.getElementById("buscarAdminSugestao")
    ?.addEventListener("input", renderizar);
document.getElementById("filtroAdminSugestao")
    ?.addEventListener("change", renderizar);

carregar();
