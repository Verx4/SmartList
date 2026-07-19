import {
    cadastrar,
    entrar,
    solicitarRecuperacao
} from "./auth.js";

let temporizadorMensagem = null;

function mostrarMensagem(
    texto,
    tipo = "info"
) {
    const area =
        document.getElementById("mensagemAuth")
        || document.getElementById("mensagens");

    if (!area) {
        alert(texto);
        return;
    }

    clearTimeout(temporizadorMensagem);

    area.textContent = texto;
    area.hidden = false;

    area.classList.remove(
        "mensagem-sucesso",
        "mensagem-erro",
        "mensagem-aviso"
    );

    const classes = {
        sucesso: "mensagem-sucesso",
        erro: "mensagem-erro",
        aviso: "mensagem-aviso",
        info: "mensagem-aviso"
    };

    area.classList.add(
        classes[tipo] || classes.info
    );

    if (tipo === "sucesso") {
        temporizadorMensagem = setTimeout(() => {
            area.hidden = true;
        }, 5000);
    }
}

function mensagemDoErro(erro) {
    if (erro?.status === 0) {
        return (
            "O servidor está iniciando ou temporariamente indisponível. "
            + "Aguarde alguns segundos e tente novamente."
        );
    }

    return (
        erro?.message
        || "Não foi possível concluir a operação."
    );
}

function formularioValido(formulario) {
    if (formulario.checkValidity()) {
        return true;
    }

    formulario.reportValidity();
    return false;
}

function alterarEstadoBotao(
    formulario,
    carregando,
    textoCarregando
) {
    const botao =
        formulario.querySelector(
            'button[type="submit"]'
        );

    if (!botao) {
        return;
    }

    if (!botao.dataset.textoOriginal) {
        botao.dataset.textoOriginal =
            botao.textContent.trim();
    }

    botao.disabled = carregando;

    botao.textContent = carregando
        ? textoCarregando
        : botao.dataset.textoOriginal;
}

function configurarLogin() {
    const formulario =
        document.getElementById("formLogin");

    formulario?.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            if (!formularioValido(formulario)) {
                return;
            }

            const dados =
                new FormData(formulario);

            alterarEstadoBotao(
                formulario,
                true,
                "Entrando..."
            );

            const avisoServidor = window.setTimeout(() => {
                alterarEstadoBotao(
                    formulario,
                    true,
                    "Servidor iniciando..."
                );
                mostrarMensagem(
                    "O servidor está iniciando. Isso pode levar até um minuto.",
                    "info"
                );
            }, 8000);

            try {
                const usuario = await entrar(
                    dados.get("email"),
                    dados.get("senha"),
                    dados.get("lembrar") === "on"
                    || dados.get("manterConectado") === "on"
                );

                mostrarMensagem(
                    "Login realizado com sucesso.",
                    "sucesso"
                );

                window.location.assign(
                    String(usuario?.perfil || "").toUpperCase() === "ADMIN"
                        ? "./admin/index.html"
                        : "./dashboard.html"
                );
            } catch (erro) {
                mostrarMensagem(
                    mensagemDoErro(erro),
                    "erro"
                );
            } finally {
                window.clearTimeout(avisoServidor);
                alterarEstadoBotao(
                    formulario,
                    false,
                    "Entrando..."
                );
            }
        }
    );
}

function configurarCadastro() {
    const formulario =
        document.getElementById("formCadastro");

    formulario?.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            if (!formularioValido(formulario)) {
                return;
            }

            const dados =
                new FormData(formulario);

            const senha =
                String(dados.get("senha") || "");

            const confirmarSenha =
                String(
                    dados.get("confirmarSenha")
                    || ""
                );

            if (senha !== confirmarSenha) {
                mostrarMensagem(
                    "As senhas não coincidem.",
                    "erro"
                );

                return;
            }

            if (senha.length < 6) {
                mostrarMensagem(
                    "A senha deve possuir pelo menos 6 caracteres.",
                    "erro"
                );

                return;
            }

            const aceiteTermos =
                dados.get("aceiteTermos") === "on";

            if (!aceiteTermos) {
                mostrarMensagem(
                    "Você precisa aceitar os Termos de Uso.",
                    "erro"
                );

                return;
            }

            alterarEstadoBotao(
                formulario,
                true,
                "Criando conta..."
            );

            try {
                await cadastrar({
                    nome: String(
                        dados.get("nome") || ""
                    ).trim(),

                    email: String(
                        dados.get("email") || ""
                    ).trim(),

                    senha,
                    aceiteTermos,

                    aceiteMarketing:
                        dados.get("aceiteMarketing")
                        === "on"
                });

                mostrarMensagem(
                    "Conta criada com sucesso. Redirecionando...",
                    "sucesso"
                );

                formulario.reset();

                setTimeout(() => {
                    window.location.assign(
                        "./login.html"
                    );
                }, 1500);
            } catch (erro) {
                mostrarMensagem(
                    mensagemDoErro(erro),
                    "erro"
                );
            } finally {
                alterarEstadoBotao(
                    formulario,
                    false,
                    "Criando conta..."
                );
            }
        }
    );
}

function configurarRecuperacao() {
    const formulario =
        document.getElementById(
            "formRecuperarSenha"
        )
        || document.getElementById(
            "formRecuperacao"
        );

    formulario?.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            if (!formularioValido(formulario)) {
                return;
            }

            const email =
                new FormData(formulario)
                    .get("email");

            alterarEstadoBotao(
                formulario,
                true,
                "Enviando..."
            );

            try {
                await solicitarRecuperacao(email);

                mostrarMensagem(
                    "Se o e-mail estiver cadastrado, enviaremos as instruções.",
                    "sucesso"
                );

                formulario.reset();
            } catch (erro) {
                mostrarMensagem(
                    mensagemDoErro(erro),
                    "erro"
                );
            } finally {
                alterarEstadoBotao(
                    formulario,
                    false,
                    "Enviando..."
                );
            }
        }
    );
}

function iniciar() {
    configurarLogin();
    configurarCadastro();
    configurarRecuperacao();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciar
    );
} else {
    iniciar();
}
