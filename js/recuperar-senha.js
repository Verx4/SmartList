import { api, ApiError } from "./api.js";

const etapas = Array.from(document.querySelectorAll("[data-recuperacao-etapa]"));
const formularioEmail = document.getElementById("formSolicitarCodigo");
const formularioCodigo = document.getElementById("formVerificarCodigo");
const formularioSenha = document.getElementById("formRedefinirSenha");
const campoEmail = document.getElementById("recuperarEmail");
const campoCodigo = document.getElementById("codigoRecuperacao");
const emailExibido = document.getElementById("emailRecuperacao");
const botaoReenviar = document.getElementById("btnReenviarCodigo");
const mensagem = document.getElementById("mensagemRecuperacao");
const titulo = document.getElementById("tituloRecuperacao");
const descricao = document.getElementById("descricaoRecuperacao");
const rodape = document.getElementById("rodapeRecuperacao");

let email = "";
let tokenRedefinicao = "";
let temporizadorReenvio = null;

function exibirEtapa(id, novoTitulo, novaDescricao) {
    etapas.forEach(etapa => { etapa.hidden = etapa.id !== id; });
    titulo.textContent = novoTitulo;
    descricao.textContent = novaDescricao;
    mensagem.hidden = true;
    rodape.hidden = id === "etapaSucesso";
}

function mostrarMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.className = `mensagem recuperacao-mensagem mensagem-${tipo}`;
    mensagem.hidden = false;
}

function textoDoErro(erro, padrao) {
    return erro instanceof ApiError && erro.message ? erro.message : padrao;
}

function validarFormulario(formulario) {
    if (formulario.checkValidity()) return true;
    formulario.reportValidity();
    return false;
}

function carregando(formulario, ativo, texto) {
    const botao = formulario.querySelector('button[type="submit"]');
    if (!botao.dataset.textoOriginal) botao.dataset.textoOriginal = botao.textContent.trim();
    botao.disabled = ativo;
    botao.textContent = ativo ? texto : botao.dataset.textoOriginal;
}

function iniciarEsperaReenvio(segundos = 60) {
    window.clearInterval(temporizadorReenvio);
    let restante = segundos;
    botaoReenviar.disabled = true;
    botaoReenviar.textContent = `Enviar novo código (${restante}s)`;
    temporizadorReenvio = window.setInterval(() => {
        restante -= 1;
        if (restante <= 0) {
            window.clearInterval(temporizadorReenvio);
            botaoReenviar.disabled = false;
            botaoReenviar.textContent = "Enviar novo código";
            return;
        }
        botaoReenviar.textContent = `Enviar novo código (${restante}s)`;
    }, 1000);
}

async function solicitarCodigo() {
    return api.post("/auth/recuperar-senha", { email }, { auth: false });
}

formularioEmail.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!validarFormulario(formularioEmail)) return;
    email = campoEmail.value.trim().toLowerCase();
    carregando(formularioEmail, true, "Enviando código...");
    try {
        await solicitarCodigo();
        emailExibido.textContent = email;
        exibirEtapa("etapaCodigo", "Confirmar código", "O código é válido por 10 minutos e pode ser usado somente uma vez.");
        mostrarMensagem("Se este e-mail estiver cadastrado, enviaremos um código de recuperação.", "sucesso");
        iniciarEsperaReenvio();
        campoCodigo.focus();
    } catch (erro) {
        mostrarMensagem(textoDoErro(erro, "Não foi possível enviar o código agora."));
    } finally {
        carregando(formularioEmail, false, "Enviando código...");
    }
});

campoCodigo.addEventListener("input", () => {
    campoCodigo.value = campoCodigo.value.replace(/\D/g, "").slice(0, 6);
});

formularioCodigo.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!validarFormulario(formularioCodigo)) return;
    carregando(formularioCodigo, true, "Verificando código...");
    try {
        const resposta = await api.post("/auth/verificar-codigo-recuperacao", {
            email,
            codigo: campoCodigo.value
        }, { auth: false });
        tokenRedefinicao = resposta.token;
        exibirEtapa("etapaNovaSenha", "Nova senha", "Crie uma nova senha para acessar sua conta.");
        document.getElementById("novaSenhaRecuperacao").focus();
    } catch (erro) {
        mostrarMensagem(textoDoErro(erro, "Não foi possível confirmar o código."));
    } finally {
        carregando(formularioCodigo, false, "Verificando código...");
    }
});

botaoReenviar.addEventListener("click", async () => {
    botaoReenviar.disabled = true;
    botaoReenviar.textContent = "Enviando código...";
    try {
        await solicitarCodigo();
        campoCodigo.value = "";
        mostrarMensagem("Um novo código foi solicitado. O código anterior deixou de ser válido.", "sucesso");
        iniciarEsperaReenvio();
    } catch (erro) {
        botaoReenviar.disabled = false;
        botaoReenviar.textContent = "Enviar novo código";
        mostrarMensagem(textoDoErro(erro, "Não foi possível enviar um novo código agora."));
    }
});

formularioSenha.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!validarFormulario(formularioSenha)) return;
    const dados = new FormData(formularioSenha);
    const novaSenha = String(dados.get("novaSenha") || "");
    const confirmarSenha = String(dados.get("confirmarSenha") || "");
    if (novaSenha !== confirmarSenha) {
        mostrarMensagem("As senhas não coincidem.");
        document.getElementById("confirmarSenhaRecuperacao").focus();
        return;
    }
    carregando(formularioSenha, true, "Alterando senha...");
    try {
        await api.post("/auth/redefinir-senha", {
            token: tokenRedefinicao,
            novaSenha,
            confirmarSenha
        }, { auth: false });
        tokenRedefinicao = "";
        formularioSenha.reset();
        exibirEtapa("etapaSucesso", "Senha alterada com sucesso!", "Sua conta está pronta para ser acessada novamente.");
    } catch (erro) {
        mostrarMensagem(textoDoErro(erro, "Não foi possível alterar a senha agora."));
    } finally {
        carregando(formularioSenha, false, "Alterando senha...");
    }
});

const origemConfiguracoes = new URLSearchParams(window.location.search).get("origem") === "configuracoes";
if (origemConfiguracoes) {
    document.getElementById("linkVoltarRecuperacaoTopo").href = "./configuracoes.html";
    const linkVoltar = document.getElementById("linkVoltarRecuperacao");
    linkVoltar.href = "./configuracoes.html";
    linkVoltar.textContent = "Voltar às configurações";
    try {
        const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
        if (usuario.email) campoEmail.value = usuario.email;
    } catch {
        // Mantém o campo vazio quando os dados locais não estiverem disponíveis.
    }
}
