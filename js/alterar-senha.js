import { api, ApiError } from "./api.js";

const formulario = document.getElementById("formAlterarSenha");
const botao = document.getElementById("btnAlterarSenha");
const mensagem = document.getElementById("mensagemAlterarSenha");

function possuiSessao() {
    return Boolean(
        sessionStorage.getItem("accessToken")
        || localStorage.getItem("accessToken")
        || sessionStorage.getItem("token")
        || localStorage.getItem("token")
    );
}

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `configuracoes-mensagem ${tipo}`;
    mensagem.hidden = false;
}

if (!possuiSessao()) {
    window.location.replace("./login.html");
}

formulario?.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const dados = new FormData(formulario);
    const senhaAtual = String(dados.get("senhaAtual") || "");
    const novaSenha = String(dados.get("novaSenha") || "");
    const confirmarNovaSenha = String(dados.get("confirmarNovaSenha") || "");

    if (novaSenha !== confirmarNovaSenha) {
        mostrarMensagem("A confirmação não corresponde à nova senha.", "erro");
        document.getElementById("confirmarNovaSenha")?.focus();
        return;
    }

    if (senhaAtual === novaSenha) {
        mostrarMensagem("A nova senha deve ser diferente da senha atual.", "erro");
        document.getElementById("novaSenha")?.focus();
        return;
    }

    botao.disabled = true;
    botao.textContent = "Salvando...";

    try {
        await api.put("/usuarios/me/senha", { senhaAtual, novaSenha });
        formulario.reset();
        mostrarMensagem("Senha alterada com sucesso.", "sucesso");
    } catch (erro) {
        const texto = erro instanceof ApiError
            ? erro.message
            : "Não foi possível alterar a senha agora.";
        mostrarMensagem(texto, "erro");

        if (Number(erro?.status) === 401) {
            window.setTimeout(() => window.location.replace("./login.html"), 1200);
        }
    } finally {
        botao.disabled = false;
        botao.textContent = "Salvar nova senha";
    }
});
