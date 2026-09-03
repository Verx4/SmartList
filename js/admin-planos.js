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
    } catch (erro) {
        if (Number(erro?.status) === 401) location.replace("../login.html");
        else mostrarMensagem(erro instanceof ApiError ? erro.message : "Não foi possível confirmar a sessão administrativa agora.", "erro");
        return false;
    }
}

async function carregarPlanos() {
    const planos = await api.get("/admin/planos");
    const porCiclo = Object.fromEntries(planos.map(plano => [String(plano.ciclo).toUpperCase(), plano]));
    document.getElementById("valorMensal").value = formatarValor(porCiclo.MENSAL?.valor);
    document.getElementById("valorTrimestral").value = formatarValor(porCiclo.TRIMESTRAL?.valor);
    document.getElementById("valorAnual").value = formatarValor(porCiclo.ANUAL?.valor);
}

async function carregarConfiguracao() {
    const configuracao = await api.get("/admin/planos/configuracao");
    document.getElementById("exibirCupons").checked = configuracao?.exibirCupons !== false;
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
        mostrarMensagem("Preços atualizados. A tela inicial e os novos checkouts usarão estes valores.");
    } catch (erro) {
        mostrarMensagem(erro instanceof ApiError ? erro.message : "Não foi possível salvar os preços.", "erro");
    } finally {
        botao.disabled = false;
    }
});

document.getElementById("formCupons")?.addEventListener("submit", async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
        const exibirCupons = document.getElementById("exibirCupons").checked;
        await api.put("/admin/planos/configuracao", { exibirCupons });
        mostrarMensagem(exibirCupons ? "Card de cupons ativado na tela inicial." : "Card de cupons removido da tela inicial. Os cards de preços permanecem visíveis.");
    } catch (erro) {
        mostrarMensagem(erro instanceof ApiError ? erro.message : "Não foi possível salvar a exibição dos cupons.", "erro");
    } finally {
        botao.disabled = false;
    }
});

if (await validarAdministrador()) {
    try {
        await Promise.all([carregarPlanos(), carregarConfiguracao()]);
    } catch (erro) {
        mostrarMensagem(erro instanceof ApiError ? erro.message : "Não foi possível carregar a Gestão de Planos.", "erro");
    }
}
