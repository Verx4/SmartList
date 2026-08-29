import { api } from "./api.js";
import { exigirAutenticacao, sair, usuarioAtual } from "./auth.js";
import { cpfValido, formatarCpf, somenteDigitosCpf } from "./cpf.js";

let assinaturaAtual;

function atualizarEstadoCpf(resposta = {}) {
    const campo = document.getElementById("perfilCpf");
    const status = document.getElementById("perfilCpfStatus");

    if (campo) {
        campo.value = resposta.cpf || "";
        campo.placeholder = "000.000.000-00";
        campo.dataset.cadastrado = String(Boolean(resposta.cadastrado));
    }

    if (status) {
        status.textContent = resposta.cadastrado
            ? "CPF salvo e disponível para identificar seus pagamentos."
            : "Cadastre seu CPF para iniciar pagamentos no Mercado Pago.";
    }
}

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

function nomeDoPlano(usuario, assinatura) {
    if (assinatura) {
        return "Plano Premium — Pagante";
    }

    if (usuario?.tipoAcesso === "CORTESIA") {
        return "Plano Premium — Cortesia";
    }

    if (usuario?.tipoAcesso === "PREMIUM") {
        return assinatura === null
            ? "Plano Premium — Acesso manual"
            : "Plano Premium";
    }

    return "Plano Free";
}

function preencherPerfil(usuario, assinatura = assinaturaAtual) {
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
        plano.textContent = nomeDoPlano(usuario, assinatura);
    }
}

exigirAutenticacao();

const formulario = document.getElementById("formPerfil");
preencherPerfil(usuarioAtual());

if (formulario) {
    const campoCpf = formulario.elements.cpf;

    campoCpf?.addEventListener("input", () => {
        campoCpf.value = formatarCpf(campoCpf.value);
        campoCpf.setCustomValidity("");
    });

    api.get("/assinaturas/atual")
        .then(async assinatura => {
            const [usuario, cpf] = await Promise.all([
                api.get("/usuarios/me"),
                api.get("/usuarios/me/cpf")
            ]);
            assinaturaAtual = assinatura;
            localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
            window.dispatchEvent(new CustomEvent("usuarioatualizado", {
                detail: { usuario }
            }));
            preencherPerfil(usuario, assinatura);
            atualizarEstadoCpf(cpf);
        })
        .catch(erro => exibirMensagem(erro.message, "erro"));

    formulario.addEventListener("submit", async evento => {
        evento.preventDefault();

        const cpfInformado = somenteDigitosCpf(formulario.elements.cpf?.value);

        if (!cpfInformado && formulario.elements.cpf?.dataset.cadastrado === "true") {
            formulario.elements.cpf.setCustomValidity(
                "Informe o CPF salvo ou digite a correção."
            );
            formulario.elements.cpf.reportValidity();
            exibirMensagem(
                "O CPF salvo não pode ficar vazio. Digite o número para corrigir.",
                "erro"
            );
            return;
        }

        if (cpfInformado && !cpfValido(cpfInformado)) {
            formulario.elements.cpf.setCustomValidity("Informe um CPF válido.");
            formulario.elements.cpf.reportValidity();
            exibirMensagem("Informe um CPF válido.", "erro");
            return;
        }

        formulario.elements.cpf?.setCustomValidity("");

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

            if (cpfInformado) {
                const cpf = await api.put("/usuarios/me/cpf", { cpf: cpfInformado });
                atualizarEstadoCpf(cpf);
            }

            localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
            window.dispatchEvent(new CustomEvent("usuarioatualizado", {
                detail: { usuario }
            }));
            preencherPerfil(usuario, assinaturaAtual);
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
