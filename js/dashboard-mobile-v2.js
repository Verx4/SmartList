const dashboard = document.querySelector(".dashboard-cabecalho");

if (dashboard) {
    prepararDashboard();
}

function prepararDashboard() {
    document.body.classList.add("dashboard-mobile-ready");
    dashboard.classList.add("compacto");

    prepararCabecalho();
    prepararMercado();
    prepararOrcamento();
    prepararBotaoAdicionar();
    controlarResumoCompra();
}

function prepararCabecalho() {
    const headerContent = document.querySelector(".site-header .header-content");
    const brand = headerContent?.querySelector(".brand");
    const nav = headerContent?.querySelector(".main-nav");
    const menuAntigo = headerContent?.querySelector(".mobile-menu-button");

    if (!headerContent || !brand || !nav) return;

    brand.classList.add("dashboard-brand");
    brand.innerHTML = `
        <img class="dashboard-brand-logo" src="./assets/logo/logo.png" alt="Logo Smart List">
        <span class="dashboard-brand-text">Smart List</span>
    `;

    menuAntigo?.remove();
    nav.classList.add("dashboard-menu-compacto");
    nav.id = "menuDashboardCompacto";

    const actions = document.createElement("div");
    actions.className = "dashboard-header-actions";
    actions.innerHTML = `
        <button type="button" class="dashboard-header-icon" id="btnLeitorNota" aria-label="Abrir leitor de nota fiscal">▣</button>
        <button type="button" class="dashboard-header-icon" id="btnTemaTopo" aria-label="Alterar tema">🎨</button>
        <button type="button" class="dashboard-header-icon" id="btnMenuTopo" aria-label="Abrir menu" aria-controls="menuDashboardCompacto" aria-expanded="false">☰</button>
    `;
    headerContent.appendChild(actions);

    actions.querySelector("#btnLeitorNota")?.addEventListener("click", () => {
        window.alert("O leitor inteligente de nota fiscal será aberto aqui.");
    });

    actions.querySelector("#btnTemaTopo")?.addEventListener("click", () => {
        document.getElementById("botaoTemaGlobal")?.click();
    });

    const menuButton = actions.querySelector("#btnMenuTopo");
    menuButton?.addEventListener("click", () => {
        const aberto = nav.classList.toggle("aberto");
        menuButton.setAttribute("aria-expanded", String(aberto));
    });

    document.addEventListener("click", (event) => {
        if (!headerContent.contains(event.target)) {
            nav.classList.remove("aberto");
            menuButton?.setAttribute("aria-expanded", "false");
        }
    });
}

function prepararMercado() {
    const grid = document.querySelector(".dashboard-grid-superior");
    const card = document.querySelector(".mercado-atual-card");
    const select = document.getElementById("mercadoAtual");
    const salvar = document.getElementById("btnSalvarMercadoAtual");

    if (!grid || !card || !select) return;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "mercado-compacto-trigger";
    trigger.innerHTML = `<span>📍 Selecione o mercado</span><b>⌄</b>`;
    grid.insertAdjacentElement("beforebegin", trigger);

    const atualizar = () => {
        const nome = select.options[select.selectedIndex]?.text?.trim();
        const selecionado = Boolean(select.value);
        trigger.querySelector("span").textContent = selecionado
            ? `📍 ${nome}`
            : "📍 Selecione o mercado";

        if (selecionado && !card.classList.contains("mercado-editando")) {
            card.classList.add("mercado-recolhido");
            grid.classList.add("mercado-configurado");
        }
    };

    trigger.addEventListener("click", () => {
        const recolhido = card.classList.toggle("mercado-recolhido");
        card.classList.toggle("mercado-editando", !recolhido);
    });

    salvar?.addEventListener("click", () => {
        window.setTimeout(() => {
            card.classList.remove("mercado-editando");
            atualizar();
        }, 100);
    });

    select.addEventListener("change", atualizar);
    window.setTimeout(atualizar, 250);
}

function prepararOrcamento() {
    const card = document.getElementById("cardOrcamento");
    const percentual = document.getElementById("orcamentoPercentual");

    if (!card || !percentual) return;

    card.classList.add("orcamento-flutuante");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "orcamento-config-toggle";
    toggle.setAttribute("aria-label", "Editar orçamento");
    toggle.textContent = "⚙";
    card.appendChild(toggle);

    toggle.addEventListener("click", () => {
        card.classList.toggle("orcamento-aberto");
    });

    const atualizarLed = () => {
        const valor = Math.max(0, Math.min(100, Number.parseFloat(percentual.textContent) || 0));
        let cor = "#22c55e";

        if (valor >= 100) cor = "#ef4444";
        else if (valor >= 90) cor = "#f97316";
        else if (valor >= 70) cor = "#eab308";

        document.documentElement.style.setProperty("--budget-led-color", cor);
        document.documentElement.style.setProperty("--budget-progress", `${valor * 3.6}deg`);
    };

    new MutationObserver(atualizarLed).observe(percentual, {
        childList: true,
        characterData: true,
        subtree: true
    });

    atualizarLed();
}

function prepararBotaoAdicionar() {
    const botao = document.getElementById("btnAdicionarProduto");
    if (!botao) return;

    botao.setAttribute("aria-label", "Adicionar produto");
    botao.setAttribute("title", "Adicionar produto");
}

function controlarResumoCompra() {
    const resumo = document.getElementById("resumoItens");
    const finalizar = document.getElementById("btnFinalizarCompra");

    if (!resumo) return;

    resumo.classList.add("resumo-oculto");

    finalizar?.addEventListener("click", () => {
        window.setTimeout(() => {
            if (resumo.textContent.trim()) {
                resumo.classList.remove("resumo-oculto");
                resumo.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 350);
    });
}
