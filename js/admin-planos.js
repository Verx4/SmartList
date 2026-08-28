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

function apresentarCiclo(ciclo) {
    const valor = String(ciclo || "").toUpperCase();
    if (valor === "TRIMESTRAL") {
        return "Plano Trimestral";
    }
    if (valor === "MENSAL") {
        return "Plano Mensal";
    }
    return "Regra incompatível";
}

async function carregarCupons() {
    const lista = document.getElementById("listaCupons");

    try {
        const cupons = await api.get("/admin/cupons");

        if (!Array.isArray(cupons) || !cupons.length) {
            lista.innerHTML = '<p class="estado-vazio">Nenhum cupom autorizado.</p>';
            return;
        }

        lista.innerHTML = cupons.map(cupom => {
            const ativo = Boolean(cupom.ativo && cupom.ciclo);
            const ciclo = String(cupom.ciclo || "").toUpperCase();

            return `
                <article class="admin-cupom-item">
                    <strong class="admin-cupom-codigo">${escaparHtml(cupom.codigo)}</strong>
                    <span>${apresentarCiclo(ciclo)}</span>
                    <span>${formatarValor(cupom.percentualDesconto)}% de desconto</span>
                    <span class="status ${ativo ? "status-ok" : "status-neutro"}">
                        ${ativo ? "Autorizado" : "Desativado"}
                    </span>
                    <div class="admin-cupom-acoes">
                        ${ciclo ? `
                            <button
                                class="btn btn-secondary btn-pequeno"
                                type="button"
                                data-alternar-cupom="${escaparHtml(cupom.codigo)}"
                                data-ciclo-cupom="${escaparHtml(ciclo)}"
                                data-cupom-ativo="${ativo}">
                                ${ativo ? "Desativar" : "Ativar"}
                            </button>
                        ` : ""}
                        <button
                            class="btn btn-danger btn-pequeno"
                            type="button"
                            data-excluir-cupom="${escaparHtml(cupom.id)}"
                            data-codigo-cupom="${escaparHtml(cupom.codigo)}">
                            Excluir
                        </button>
                    </div>
                </article>
            `;
        }).join("");
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
    const codigo = formulario.codigo.value.trim().toUpperCase();
    const ciclo = formulario.ciclo.value;

    if (!/^[A-Z0-9_-]{1,30}$/.test(codigo)) {
        mostrarMensagemCupom(
            "Use de 1 a 30 letras, números, hífen ou sublinhado no nome do cupom.",
            "erro"
        );
        return;
    }

    if (ciclo === "MENSAL" && !codigo.endsWith("5")) {
        mostrarMensagemCupom("O cupom Mensal deve terminar em 5.", "erro");
        return;
    }

    if (ciclo === "TRIMESTRAL" && !codigo.endsWith("10")) {
        mostrarMensagemCupom("O cupom Trimestral deve terminar em 10.", "erro");
        return;
    }

    botao.disabled = true;
    try {
        await api.post("/admin/cupons", {
            codigo,
            ciclo,
            ativo: formulario.ativo.checked
        });
        formulario.reset();
        formulario.ativo.checked = true;
        await carregarCupons();
        mostrarMensagemCupom(
            `Cupom ${codigo} adicionado. Somente este código poderá usar o desconto correspondente.`
        );
    } catch (erro) {
        mostrarMensagemCupom(
            erro instanceof ApiError ? erro.message : "Não foi possível adicionar o cupom.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
});

document.getElementById("listaCupons")?.addEventListener("click", async evento => {
    const botaoAlternar = evento.target.closest("[data-alternar-cupom]");
    const botaoExcluir = evento.target.closest("[data-excluir-cupom]");

    if (botaoAlternar) {
        const codigo = botaoAlternar.dataset.alternarCupom;
        const ativar = botaoAlternar.dataset.cupomAtivo !== "true";
        botaoAlternar.disabled = true;

        try {
            await api.post("/admin/cupons", {
                codigo,
                ciclo: botaoAlternar.dataset.cicloCupom,
                ativo: ativar
            });
            await carregarCupons();
            mostrarMensagemCupom(
                `Cupom ${codigo} ${ativar ? "autorizado" : "desativado"}.`
            );
        } catch (erro) {
            botaoAlternar.disabled = false;
            mostrarMensagemCupom(
                erro instanceof ApiError ? erro.message : "Não foi possível alterar o cupom.",
                "erro"
            );
        }
        return;
    }

    if (!botaoExcluir) {
        return;
    }

    const codigo = botaoExcluir.dataset.codigoCupom;
    if (!window.confirm(`Excluir o cupom ${codigo}? Ele deixará de funcionar imediatamente.`)) {
        return;
    }

    botaoExcluir.disabled = true;
    try {
        await api.delete(`/admin/cupons/${botaoExcluir.dataset.excluirCupom}`);
        await carregarCupons();
        mostrarMensagemCupom(`Cupom ${codigo} excluído e não autorizado.`);
    } catch (erro) {
        botaoExcluir.disabled = false;
        mostrarMensagemCupom(
            erro instanceof ApiError ? erro.message : "Não foi possível excluir o cupom.",
            "erro"
        );
    }
});

if (await validarAdministrador()) {
    await Promise.all([carregarPlanos(), carregarCupons()]);
}
