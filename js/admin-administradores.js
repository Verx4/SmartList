import { api, ApiError } from "./api.js";

const EMAIL_FUNDADOR = "smartlistevx@gmail.com";
let usuarioLogado = null;

function emailFundador(email) {
    return String(email || "").trim().toLowerCase() === EMAIL_FUNDADOR;
}

function escapar(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemAdministradores");
    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
    elemento.hidden = false;
}

function formatarData(valor) {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

async function validarAdministrador() {
    try {
        usuarioLogado = await api.get("/usuarios/me");
        localStorage.setItem("usuarioAtual", JSON.stringify(usuarioLogado));
    } catch (erro) {
        if (Number(erro?.status) === 401) {
            location.replace("../login.html");
        } else {
            mostrarMensagem(
                erro instanceof ApiError
                    ? erro.message
                    : "Não foi possível confirmar a sessão administrativa agora.",
                "erro"
            );
        }
        return false;
    }

    if (String(usuarioLogado?.perfil || "").toUpperCase() !== "ADMIN") {
        location.replace("../inicio.html");
        return false;
    }

    const fundador = emailFundador(usuarioLogado?.email);
    const secaoNovoAcesso = document.querySelector(".admin-gerenciamento-form");
    if (secaoNovoAcesso) {
        secaoNovoAcesso.hidden = !fundador;
        secaoNovoAcesso.style.display = fundador ? "" : "none";
        secaoNovoAcesso.setAttribute("aria-hidden", String(!fundador));
    }

    return true;
}

async function carregarAdministradores() {
    const corpo = document.getElementById("listaAdministradores");

    try {
        const administradores = await api.get("/admin/administradores");

        corpo.innerHTML = administradores.length
            ? administradores.map(administrador => {
                const proprioAcesso = String(administrador.email).toLowerCase()
                    === String(usuarioLogado?.email).toLowerCase();
                const contaFundadora = emailFundador(administrador.email);
                const protegido = proprioAcesso || contaFundadora || Boolean(administrador.fundador);

                return `
                    <tr>
                        <td>${escapar(administrador.nome)}${(contaFundadora || administrador.fundador) ? " <strong>(Fundador)</strong>" : ""}</td>
                        <td>${escapar(administrador.email)}</td>
                        <td>${escapar(formatarData(administrador.criadoEm))}</td>
                        <td>
                            <button
                                type="button"
                                class="btn btn-danger"
                                data-revogar-admin="${escapar(administrador.id)}"
                                data-admin-email="${escapar(administrador.email)}"
                                ${protegido ? 'disabled title="O acesso do fundador não pode ser revogado"' : ""}>
                                Revogar acesso
                            </button>
                        </td>
                    </tr>`;
            }).join("")
            : '<tr><td colspan="4" class="estado-vazio">Nenhum administrador cadastrado.</td></tr>';
    } catch (erro) {
        corpo.innerHTML = `<tr><td colspan="4" class="estado-vazio">${escapar(
            erro instanceof ApiError ? erro.message : "Não foi possível carregar os administradores."
        )}</td></tr>`;
    }
}

document.getElementById("formAdministrador")?.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (!emailFundador(usuarioLogado?.email)) {
        mostrarMensagem("Somente a conta ADM principal pode conceder novos administradores.", "erro");
        return;
    }
    const formulario = evento.currentTarget;
    const botao = formulario.querySelector('button[type="submit"]');
    const email = formulario.email.value.trim();

    botao.disabled = true;
    try {
        const administrador = await api.post("/admin/administradores", { email });
        formulario.reset();
        await carregarAdministradores();
        mostrarMensagem(`${administrador.email} agora possui acesso administrativo limitado.`);
    } catch (erro) {
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível conceder o acesso.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
});

document.getElementById("listaAdministradores")?.addEventListener("click", async evento => {
    const botao = evento.target.closest("[data-revogar-admin]");

    if (!botao) {
        return;
    }

    const confirmou = window.confirm(
        `Revogar o acesso ADM de ${botao.dataset.adminEmail}?`
    );

    if (!confirmou) {
        return;
    }

    botao.disabled = true;
    try {
        await api.delete(`/admin/administradores/${botao.dataset.revogarAdmin}`);
        await carregarAdministradores();
        mostrarMensagem("Acesso administrativo revogado.");
    } catch (erro) {
        botao.disabled = false;
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível revogar o acesso.",
            "erro"
        );
    }
});

document.getElementById("atualizarAdministradores")
    ?.addEventListener("click", carregarAdministradores);

if (await validarAdministrador()) {
    await carregarAdministradores();
}
