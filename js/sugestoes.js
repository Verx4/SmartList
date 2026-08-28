import { api, ApiError } from "./api.js";
import { escaparHTML } from "./utils.js";
import { definirQuantidadeSugestoes } from "./sugestoes-badge.js";

const CHAVE_LOCAL = "sugestoesLocais";
const textosStatus = {
    NOVA: "Nova",
    EM_ANALISE: "Em análise",
    PLANEJADA: "Planejada",
    CONCLUIDA: "Concluída",
    ARQUIVADA: "Arquivada"
};

let minhasSugestoes = [];

function lerLocais() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || [];
        return Array.isArray(dados) ? dados : [];
    } catch {
        return [];
    }
}

function salvarLocal(sugestao) {
    const locais = lerLocais();
    locais.push({
        id: `local-${Date.now()}`,
        ...sugestao,
        data: new Date().toISOString()
    });
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(locais));
}

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemSugestao");
    if (!elemento) {
        return;
    }

    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
}

function formatarData(valor) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "-" : data.toLocaleString("pt-BR");
}

function renderizarMinhasSugestoes() {
    const container = document.getElementById("listaMinhasSugestoes");
    if (!container) {
        return;
    }

    const pendentesLocais = lerLocais().map(item => ({
        ...item,
        criadoEm: item.data,
        status: "PENDENTE_ENVIO",
        pendenteLocal: true
    }));
    const itens = [...pendentesLocais, ...minhasSugestoes];

    container.innerHTML = itens.length
        ? itens.map(item => {
            const respondida = Boolean(item.respostaAdmin);
            const status = item.pendenteLocal
                ? "Pendente de envio"
                : textosStatus[item.status] || "Em acompanhamento";

            return `
                <article class="sugestao-item">
                    <div class="minha-sugestao-meta">
                        <span>
                            ${escaparHTML(item.categoria || "Outros")} · ${escaparHTML(status)}
                            ${item.temNovaResposta
                                ? '<b class="sugestao-nova-resposta">Nova resposta</b>'
                                : ""}
                        </span>
                        <time>${escaparHTML(formatarData(item.criadoEm))}</time>
                    </div>
                    <h3>${escaparHTML(item.titulo)}</h3>
                    <p>${escaparHTML(item.descricao)}</p>
                    ${respondida
                        ? `<button
                            type="button"
                            class="btn btn-secondary sugestao-abrir-resposta"
                            data-visualizar-sugestao="${escaparHTML(item.id)}"
                            aria-expanded="false">
                            Ver resposta do ADM
                        </button>`
                        : ""}
                    <div
                        class="resposta-admin-usuario ${respondida ? "respondida" : "aguardando"}"
                        ${respondida ? "hidden" : ""}>
                        <strong>Resposta do ADM</strong>
                        <p>${respondida
                            ? escaparHTML(item.respostaAdmin)
                            : "Aguardando resposta da equipe Smart List."}</p>
                        ${respondida && item.respondidoEm
                            ? `<small>Respondida em ${escaparHTML(formatarData(item.respondidoEm))}</small>`
                            : ""}
                    </div>
                </article>
            `;
        }).join("")
        : '<p class="estado-vazio">Você ainda não enviou sugestões ou dúvidas.</p>';
}

function quantidadeNaoLida() {
    return minhasSugestoes.filter(item => item.temNovaResposta).length;
}

document.getElementById("listaMinhasSugestoes")?.addEventListener("click", async evento => {
    const botao = evento.target.closest("[data-visualizar-sugestao]");

    if (!botao) {
        return;
    }

    const item = minhasSugestoes.find(
        sugestao => String(sugestao.id) === botao.dataset.visualizarSugestao
    );
    const resposta = botao.nextElementSibling;
    const abrir = resposta?.hidden !== false;

    if (resposta) {
        resposta.hidden = !abrir;
    }
    botao.setAttribute("aria-expanded", String(abrir));
    botao.textContent = abrir ? "Ocultar resposta" : "Ver resposta do ADM";

    if (!abrir || !item?.temNovaResposta) {
        return;
    }

    item.temNovaResposta = false;
    botao.closest(".sugestao-item")
        ?.querySelector(".sugestao-nova-resposta")
        ?.remove();
    definirQuantidadeSugestoes(quantidadeNaoLida());

    try {
        await api.patch(`/sugestoes/${item.id}/visualizar`, {});
    } catch (erro) {
        item.temNovaResposta = true;
        renderizarMinhasSugestoes();
        definirQuantidadeSugestoes(quantidadeNaoLida());
        mostrarMensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível marcar a resposta como visualizada.",
            "erro"
        );
    }
});

async function carregarMinhasSugestoes() {
    const container = document.getElementById("listaMinhasSugestoes");
    if (!container) {
        return;
    }

    try {
        const resposta = await api.get("/sugestoes/minhas");
        minhasSugestoes = Array.isArray(resposta) ? resposta : [];
        definirQuantidadeSugestoes(quantidadeNaoLida());
        renderizarMinhasSugestoes();
    } catch (erro) {
        minhasSugestoes = [];
        renderizarMinhasSugestoes();

        if (!lerLocais().length) {
            container.innerHTML = `<p class="estado-vazio">${escaparHTML(
                erro instanceof ApiError
                    ? erro.message
                    : "Não foi possível carregar suas mensagens."
            )}</p>`;
        }
    }
}

async function migrarSugestoesLocais() {
    const locais = lerLocais();

    if (!locais.length) {
        return;
    }

    for (let indice = 0; indice < locais.length; indice += 1) {
        const item = locais[indice];

        try {
            await api.post("/sugestoes", {
                categoria: item.categoria || "outros",
                titulo: item.titulo,
                descricao: item.descricao
            });
        } catch (erro) {
            localStorage.setItem(
                CHAVE_LOCAL,
                JSON.stringify(locais.slice(indice))
            );
            throw erro;
        }
    }

    localStorage.removeItem(CHAVE_LOCAL);
}

document.getElementById("formSugestao")?.addEventListener("submit", async evento => {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const botao = formulario.querySelector('button[type="submit"]');
    const dados = Object.fromEntries(new FormData(formulario));

    botao.disabled = true;

    try {
        const criada = await api.post("/sugestoes", dados);
        minhasSugestoes = [criada, ...minhasSugestoes];
        formulario.reset();
        renderizarMinhasSugestoes();
        mostrarMensagem("Mensagem enviada para a equipe Smart List.");
    } catch (erro) {
        const erroCliente =
            erro instanceof ApiError &&
            erro.status >= 400 &&
            erro.status < 500;

        if (erroCliente) {
            mostrarMensagem(erro.message, "erro");
        } else {
            salvarLocal(dados);
            formulario.reset();
            renderizarMinhasSugestoes();
            mostrarMensagem(
                "Mensagem salva neste aparelho e será enviada quando o servidor voltar.",
                "aviso"
            );
        }
    } finally {
        botao.disabled = false;
    }
});

migrarSugestoesLocais()
    .catch(() => {
        mostrarMensagem(
            "As mensagens pendentes serão enviadas quando o servidor voltar.",
            "aviso"
        );
    })
    .finally(carregarMinhasSugestoes);
