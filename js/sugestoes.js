import { api, ApiError } from "./api.js";

const CHAVE_LOCAL = "sugestoesLocais";

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
        await api.post("/sugestoes", dados);
        formulario.reset();
        mostrarMensagem("Sugestão enviada para a equipe Smart List.");
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
            mostrarMensagem(
                "Sugestão salva neste aparelho e será enviada quando o servidor voltar.",
                "aviso"
            );
        }
    } finally {
        botao.disabled = false;
    }
});

migrarSugestoesLocais().catch(() => {
    mostrarMensagem(
        "As sugestões pendentes serão enviadas quando o servidor voltar.",
        "aviso"
    );
});
