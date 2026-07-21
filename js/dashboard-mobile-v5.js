const CHAVE_MERCADO_ATUAL_V5 = "mercadoAtual";

function prepararListaMobileV5() {
    removerElementosAntigosV5();
    prepararMercadoV5();
    prepararOrcamentoV5();
    prepararAcoesV5();
}

function removerElementosAntigosV5() {
    document.querySelectorAll(".mercado-compacto-trigger").forEach((elemento) => elemento.remove());
    document.getElementById("btnTemaTopo")?.remove();
    document.getElementById("controleTemaGlobal")?.classList.add("tema-apenas-inicio");

    const cardOrcamento = document.getElementById("cardOrcamento");
    if (cardOrcamento) {
        cardOrcamento.classList.remove("orcamento-flutuante");
        cardOrcamento.style.removeProperty("position");
        cardOrcamento.style.removeProperty("bottom");
        cardOrcamento.style.removeProperty("left");
        cardOrcamento.style.removeProperty("right");
    }
}

function prepararMercadoV5() {
    const select = document.getElementById("mercadoAtual");
    const card = document.querySelector(".mercado-atual-card");
    const grid = document.querySelector(".dashboard-grid-superior");
    const botaoSalvar = document.getElementById("btnSalvarMercadoAtual");

    if (!select || !card || !grid) return;

    card.classList.remove("mercado-recolhido", "mercado-editando");
    grid.classList.remove("mercado-configurado");

    const montarOpcoes = () => {
        const valorAtual = select.value || localStorage.getItem(CHAVE_MERCADO_ATUAL_V5) || "";
        const existentes = Array.from(select.options)
            .map((opcao) => ({ value: opcao.value, text: opcao.textContent?.trim() || opcao.value }))
            .filter((opcao) => opcao.value);

        select.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "__placeholder__";
        placeholder.textContent = "Selecionar mercado (opcional)";
        placeholder.disabled = true;
        select.appendChild(placeholder);

        const vazio = document.createElement("option");
        vazio.value = "";
        vazio.textContent = "Manter barra vazia";
        select.appendChild(vazio);

        existentes.forEach((opcao) => {
            const item = document.createElement("option");
            item.value = opcao.value;
            item.textContent = opcao.text;
            select.appendChild(item);
        });

        if (valorAtual && Array.from(select.options).some((opcao) => opcao.value === valorAtual)) {
            select.value = valorAtual;
        } else {
            select.value = "__placeholder__";
        }
    };

    montarOpcoes();

    select.addEventListener("change", () => {
        if (select.value === "__placeholder__") return;

        if (!select.value) {
            localStorage.removeItem(CHAVE_MERCADO_ATUAL_V5);
            document.getElementById("mercadoModalAtual")?.replaceChildren(document.createTextNode("Nenhum mercado selecionado"));
            return;
        }

        localStorage.setItem(CHAVE_MERCADO_ATUAL_V5, select.value);
        botaoSalvar?.click();
    });

    const observarOpcoes = new MutationObserver(() => {
        if (!Array.from(select.options).some((opcao) => opcao.value === "__placeholder__")) {
            montarOpcoes();
        }
    });
    observarOpcoes.observe(select, { childList: true });
}

function prepararOrcamentoV5() {
    const card = document.getElementById("cardOrcamento");
    const percentual = document.getElementById("orcamentoPercentual");
    const limite = document.getElementById("orcamentoLimite");
    const gasto = document.getElementById("orcamentoGasto");

    if (!card || !percentual) return;

    card.classList.remove("orcamento-flutuante");

    const atualizarCor = () => {
        const valor = Math.max(0, Math.min(100, Number.parseFloat(percentual.textContent) || 0));
        let cor = "#22c55e";
        if (valor >= 100) cor = "#ef4444";
        else if (valor >= 70) cor = "#facc15";
        document.documentElement.style.setProperty("--budget-accent", cor);
    };

    new MutationObserver(atualizarCor).observe(percentual, { childList: true, subtree: true, characterData: true });
    atualizarCor();

    if (limite && gasto) {
        limite.setAttribute("aria-label", "Limite do orçamento");
        gasto.setAttribute("aria-label", "Valor gasto");
    }
}

function prepararAcoesV5() {
    const adicionar = document.getElementById("btnAdicionarProduto");
    const finalizar = document.getElementById("btnFinalizarCompra");

    if (adicionar) {
        adicionar.textContent = "＋ Adicionar item";
        adicionar.classList.remove("btn-historico");
    }

    if (finalizar) {
        finalizar.textContent = "✅ Finalizar compra";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(prepararListaMobileV5, 80));
} else {
    setTimeout(prepararListaMobileV5, 80);
}
