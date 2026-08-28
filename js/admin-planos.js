import { api, ApiError } from "./api.js";

function mostrarMensagem(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemPlanos");
    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
    elemento.hidden = false;
}

function mostrarMensagemCupom(texto, tipo = "sucesso") {
    const elemento = document.getElementById("mensagemCupons");
    elemento.textContent = texto;
    elemento.className = `mensagem mensagem-${tipo}`;
    elemento.hidden = false;
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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

async function carregarCupons() {
    const lista = document.getElementById("listaCupons");

    try {
        const cupons = await api.get("/admin/cupons");

        if (!Array.isArray(cupons) || !cupons.length) {
            lista.innerHTML = '<p class="estado-vazio">Nenhum cupom cadastrado.</p>';
            return;
        }

        lista.innerHTML = cupons.map(cupom => `
            <article class="admin-cupom-item">
                <strong class="admin-cupom-codigo">${escaparHtml(cupom.codigo)}</strong>
                <span>${formatarValor(cupom.percentualDesconto)}% de desconto</span>
                <span class="status ${cupom.ativo ? "status-ok" : "status-neutro"}">
                    ${cupom.ativo ? "Ativo" : "Inativo"}
                </span>
                <button
                    class="btn btn-danger btn-pequeno"
                    type="button"
                    data-excluir-cupom="${escaparHtml(cupom.id)}"
                    data-codigo-cupom="${escaparHtml(cupom.codigo)}">
                    Excluir
                </button>
            </article>
        `).join("");
    } catch (erro) {
        lista.innerHTML = '<p class="estado-vazio">Não foi possível carregar os cupons.</p>';
        mostrarMensagemCupom(
            erro instanceof ApiError ? erro.message : "Não foi possível carregar os cupons.",
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

document.getElementById("formCupom")?.addEventListener("submit", async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const botao = formulario.querySelector('button[type="submit"]');
    const percentualDesconto = converterValor(formulario.percentualDesconto.value);
    const codigo = formulario.codigo.value.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) {
        mostrarMensagemCupom(
            "Use de 3 a 30 letras, números, hífen ou sublinhado no código.",
            "erro"
        );
        return;
    }

    if (!Number.isFinite(percentualDesconto)
        || percentualDesconto <= 0
        || percentualDesconto > 90) {
        mostrarMensagemCupom("Informe um desconto maior que 0% e de no máximo 90%.", "erro");
        return;
    }

    botao.disabled = true;
    try {
        await api.post("/admin/cupons", {
            codigo,
            percentualDesconto,
            ativo: formulario.ativo.checked
        });
        formulario.reset();
        formulario.ativo.checked = true;
        await carregarCupons();
        mostrarMensagemCupom(`Cupom ${codigo} salvo e disponível no checkout.`);
    } catch (erro) {
        mostrarMensagemCupom(
            erro instanceof ApiError ? erro.message : "Não foi possível salvar o cupom.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
});

document.getElementById("listaCupons")?.addEventListener("click", async evento => {
    const botao = evento.target.closest("[data-excluir-cupom]");

    if (!botao) {
        return;
    }

    const codigo = botao.dataset.codigoCupom;
    if (!window.confirm(`Excluir o cupom ${codigo}?`)) {
        return;
    }

    botao.disabled = true;
    try {
        await api.delete(`/admin/cupons/${botao.dataset.excluirCupom}`);
        await carregarCupons();
        mostrarMensagemCupom(`Cupom ${codigo} excluído.`);
    } catch (erro) {
        botao.disabled = false;
        mostrarMensagemCupom(
            erro instanceof ApiError ? erro.message : "Não foi possível excluir o cupom.",
            "erro"
        );
    }
});

if (await validarAdministrador()) {
    await Promise.all([carregarPlanos(), carregarCupons()]);
}
