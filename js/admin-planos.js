import { api, ApiError } from "./api.js";

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemPlanos");
    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
    elemento.hidden = false;
}

function formatarValor(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function converterValor(valor) {
    const texto = String(valor || "").trim().replace(/\s|R\$/gi, "");
    const normalizado = texto.includes(",")
        ? texto.replaceAll(".", "").replace(",", ".")
        : texto;
    return Number(normalizado);
}

async function validarAdministrador() {
    try {
        const usuario = await api.get("/usuarios/me");
        localStorage.setItem("usuarioAtual", JSON.stringify(usuario));

        if (String(usuario?.perfil || "").toUpperCase() !== "ADMIN") {
            location.replace("../inicio.html");
            return false;
        }
        return true;
    } catch {
        location.replace("../login.html");
        return false;
    }
}

async function carregarPlanos() {
    try {
        const planos = await api.get("/admin/planos");
        const porCiclo = Object.fromEntries(
            planos.map(plano => [String(plano.ciclo).toUpperCase(), plano])
        );
        document.getElementById("valorMensal").value = formatarValor(porCiclo.MENSAL?.valor);
        document.getElementById("valorTrimestral").value = formatarValor(porCiclo.TRIMESTRAL?.valor);
        document.getElementById("valorAnual").value = formatarValor(porCiclo.ANUAL?.valor);
    } catch (erro) {
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível carregar os preços.",
            "erro"
        );
    }
}

document.getElementById("formPlanos")?.addEventListener("submit", async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const botao = formulario.querySelector('button[type="submit"]');
    const valores = {
        mensal: converterValor(formulario.mensal.value),
        trimestral: converterValor(formulario.trimestral.value),
        anual: converterValor(formulario.anual.value)
    };

    if (Object.values(valores).some(valor => !Number.isFinite(valor) || valor <= 0)) {
        mostrarMensagem("Informe valores válidos e maiores que zero para os três planos.", "erro");
        return;
    }

    botao.disabled = true;
    try {
        await api.put("/admin/planos", valores);
        await carregarPlanos();
        mostrarMensagem("Preços atualizados. Os novos checkouts já usarão estes valores.");
    } catch (erro) {
        mostrarMensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível salvar os preços.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
});

if (await validarAdministrador()) {
    await carregarPlanos();
}
