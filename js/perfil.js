import { api } from "./api.js";
import { exigirAutenticacao, sair, usuarioAtual } from "./auth.js";

function exibirMensagem(texto, tipo = "sucesso") {
    const area = document.getElementById("mensagemPerfil");

    if (!area) {
        return;
    }

    area.textContent = texto;
    const classes = {
        erro: "mensagem-erro",
        aviso: "mensagem-aviso",
        sucesso: "mensagem-sucesso"
    };

    area.classList.remove("mensagem-sucesso", "mensagem-erro", "mensagem-aviso");
    area.classList.add(classes[tipo] || classes.sucesso);
    area.hidden = false;
}

function nomeDoPlano(usuario) {
    if (usuario?.tipoAcesso === "PREMIUM") {
        return "Plano Premium";
    }

    if (usuario?.tipoAcesso === "CORTESIA") {
        return "Plano Cortesia";
    }

    return "Plano Free";
}

function preencherPerfil(usuario) {
    const formulario = document.getElementById("formPerfil");

    if (!formulario || !usuario) {
        return;
    }

    formulario.elements.nome.value = usuario.nome || "";
    formulario.elements.email.value = usuario.email || "";
    formulario.elements.telefone.value = usuario.telefone || "";
    formulario.elements.cidade.value = usuario.cidade || "";
    formulario.elements.estado.value = usuario.estado || "";
    formulario.elements.notificarPromocoes.checked = Boolean(usuario.notificarPromocoes);
    formulario.elements.notificarPrecos.checked = Boolean(usuario.notificarPrecos);

    const nome = document.getElementById("perfilNomeExibicao");
    const email = document.getElementById("perfilEmailExibicao");
    const avatar = document.getElementById("perfilAvatar");
    const plano = document.getElementById("perfilPlano");

    if (nome) {
        nome.textContent = usuario.nome || "Usuário";
    }

    if (email) {
        email.textContent = usuario.email || "";
    }

    if (avatar) {
        avatar.textContent = (usuario.nome || "U").trim().charAt(0).toUpperCase();
    }

    if (plano) {
        plano.textContent = nomeDoPlano(usuario);
    }
}

exigirAutenticacao();

const formulario = document.getElementById("formPerfil");
preencherPerfil(usuarioAtual());

if (formulario) {
    api.get("/usuarios/me")
        .then(usuario => {
            localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
            window.dispatchEvent(new CustomEvent("usuarioatualizado", {
                detail: { usuario }
            }));
            preencherPerfil(usuario);
        })
        .catch(erro => exibirMensagem(erro.message, "erro"));

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const botao = formulario.querySelector('button[type="submit"]');
        const textoOriginal = botao?.textContent;

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Salvando...";
        }

        try {
            const usuario = await api.put("/usuarios/me", {
                nome: formulario.elements.nome.value,
                telefone: formulario.elements.telefone.value,
                cidade: formulario.elements.cidade.value,
                estado: formulario.elements.estado.value,
                notificarPromocoes: formulario.elements.notificarPromocoes.checked,
                notificarPrecos: formulario.elements.notificarPrecos.checked
            });

            localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
            window.dispatchEvent(new CustomEvent("usuarioatualizado", {
                detail: { usuario }
            }));
            preencherPerfil(usuario);
            exibirMensagem("Dados atualizados com sucesso.");
        } catch (erro) {
            exibirMensagem(erro.message, "erro");
        } finally {
            if (botao) {
                botao.disabled = false;
                botao.textContent = textoOriginal;
            }
        }
    });
}

document.getElementById("btnSair")?.addEventListener("click", sair);

document.getElementById("btnExcluirConta")?.addEventListener("click", () => {
    exibirMensagem("A exclusão de conta estará disponível em breve.", "aviso");
});
