const dashboard = document.querySelector(".dashboard-cabecalho");

if (dashboard) prepararDashboard();

function prepararDashboard() {
    document.body.classList.add("dashboard-mobile-ready");
    dashboard.classList.add("compacto");
    prepararCabecalho();
    prepararMercado();
    prepararOrcamento();
    prepararBotaoAdicionar();
    prepararHortifruti();
    controlarResumoCompra();
}

function prepararCabecalho() {
    const headerContent = document.querySelector(".site-header .header-content");
    const brand = headerContent?.querySelector(".brand");
    const nav = headerContent?.querySelector(".main-nav");
    headerContent?.querySelector(".mobile-menu-button")?.remove();
    if (!headerContent || !brand || !nav) return;

    brand.classList.add("dashboard-brand");
    brand.innerHTML = `<img class="dashboard-brand-logo" src="./assets/logo/logo.png" alt="Logo Smart List"><span class="dashboard-brand-text">Smart List</span>`;
    nav.classList.add("dashboard-menu-compacto");
    nav.id = "menuDashboardCompacto";

    const actions = document.createElement("div");
    actions.className = "dashboard-header-actions";
    actions.innerHTML = `
        <button type="button" class="dashboard-header-icon" id="btnLeitorNota" aria-label="Ler QR Code da nota fiscal">▣</button>
        <button type="button" class="dashboard-header-icon" id="btnTemaTopo" aria-label="Alterar tema">🎨</button>
        <button type="button" class="dashboard-header-icon" id="btnMenuTopo" aria-label="Abrir menu" aria-controls="menuDashboardCompacto" aria-expanded="false">☰</button>`;
    headerContent.appendChild(actions);

    actions.querySelector("#btnLeitorNota")?.addEventListener("click", abrirScannerNota);
    actions.querySelector("#btnTemaTopo")?.addEventListener("click", () => document.getElementById("botaoTemaGlobal")?.click());

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
        trigger.querySelector("span").textContent = selecionado ? `📍 ${nome}` : "📍 Selecione o mercado";
        if (selecionado && !card.classList.contains("mercado-editando")) {
            card.classList.add("mercado-recolhido");
            grid.classList.add("mercado-configurado");
        }
    };

    trigger.addEventListener("click", () => {
        const recolhido = card.classList.toggle("mercado-recolhido");
        card.classList.toggle("mercado-editando", !recolhido);
    });
    salvar?.addEventListener("click", () => setTimeout(() => { card.classList.remove("mercado-editando"); atualizar(); }, 100));
    select.addEventListener("change", atualizar);
    setTimeout(atualizar, 250);
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
    toggle.addEventListener("click", () => card.classList.toggle("orcamento-aberto"));

    const atualizarCor = () => {
        const valor = Math.max(0, Math.min(100, Number.parseFloat(percentual.textContent) || 0));
        let cor = "#22c55e";
        if (valor >= 100) cor = "#ef4444";
        else if (valor >= 90) cor = "#f97316";
        else if (valor >= 70) cor = "#eab308";
        document.documentElement.style.setProperty("--budget-led-color", cor);
    };
    new MutationObserver(atualizarCor).observe(percentual, { childList: true, characterData: true, subtree: true });
    atualizarCor();
}

function prepararBotaoAdicionar() {
    const botao = document.getElementById("btnAdicionarProduto");
    if (!botao) return;
    botao.setAttribute("aria-label", "Adicionar produto");
    botao.setAttribute("title", "Adicionar produto");
}

function prepararHortifruti() {
    const lista = document.getElementById("listaProdutos");
    if (!lista) return;
    const marcar = () => lista.querySelectorAll(".produto").forEach((produto) => {
        const categoria = produto.querySelector(".categoria-produto")?.textContent || "";
        produto.classList.toggle("produto-peso", categoria.includes("Hortifruti"));
    });
    new MutationObserver(marcar).observe(lista, { childList: true, subtree: true });
    marcar();
}

function controlarResumoCompra() {
    const resumo = document.getElementById("resumoItens");
    const finalizar = document.getElementById("btnFinalizarCompra");
    if (!resumo) return;
    resumo.classList.add("resumo-oculto");
    finalizar?.addEventListener("click", () => setTimeout(() => {
        if (resumo.textContent.trim()) {
            resumo.classList.remove("resumo-oculto");
            resumo.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, 350));
}

function criarModalScanner() {
    let modal = document.getElementById("scannerNotaModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "scannerNotaModal";
    modal.className = "scanner-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="scanner-painel" role="dialog" aria-modal="true" aria-labelledby="scannerTitulo">
        <div class="scanner-topo"><div><small>Leitor inteligente</small><h2 id="scannerTitulo">Escanear QR Code da NFC-e</h2></div><button type="button" class="scanner-fechar" aria-label="Fechar">×</button></div>
        <video class="scanner-video" playsinline muted></video>
        <p class="scanner-status">Aponte a câmera para o QR Code da nota fiscal.</p>
        <div class="scanner-acoes"><button type="button" class="btn btn-secondary scanner-arquivo">Escolher imagem</button><button type="button" class="btn btn-primary scanner-abrir" hidden>Abrir nota</button></div>
        <input class="scanner-input" type="file" accept="image/*" capture="environment" hidden>
      </div>`;
    document.body.appendChild(modal);
    return modal;
}

async function abrirScannerNota() {
    const modal = criarModalScanner();
    const video = modal.querySelector(".scanner-video");
    const status = modal.querySelector(".scanner-status");
    const input = modal.querySelector(".scanner-input");
    const abrir = modal.querySelector(".scanner-abrir");
    let stream = null;
    let ativo = true;
    let linkLido = "";

    const fechar = () => {
        ativo = false;
        stream?.getTracks().forEach(track => track.stop());
        modal.hidden = true;
    };
    modal.querySelector(".scanner-fechar").onclick = fechar;
    modal.onclick = (e) => { if (e.target === modal) fechar(); };
    modal.querySelector(".scanner-arquivo").onclick = () => input.click();
    abrir.onclick = () => { if (linkLido) window.open(linkLido, "_blank", "noopener"); };
    modal.hidden = false;
    abrir.hidden = true;

    const processar = (valor) => {
        linkLido = valor;
        status.textContent = valor.startsWith("http") ? "QR Code lido. Toque em Abrir nota." : `Conteúdo lido: ${valor}`;
        abrir.hidden = !valor.startsWith("http");
        ativo = false;
        stream?.getTracks().forEach(track => track.stop());
    };

    if (!("BarcodeDetector" in window)) {
        status.textContent = "Seu navegador não oferece leitura ao vivo. Escolha uma foto do QR Code.";
    } else {
        try {
            const detector = new BarcodeDetector({ formats: ["qr_code"] });
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            video.srcObject = stream;
            await video.play();
            const ler = async () => {
                if (!ativo) return;
                try {
                    const codigos = await detector.detect(video);
                    if (codigos[0]?.rawValue) return processar(codigos[0].rawValue);
                } catch (_) {}
                requestAnimationFrame(ler);
            };
            ler();
        } catch (erro) {
            status.textContent = "Não foi possível abrir a câmera. Verifique a permissão ou escolha uma imagem.";
        }
    }

    input.onchange = async () => {
        const arquivo = input.files?.[0];
        if (!arquivo || !("BarcodeDetector" in window)) return;
        try {
            const detector = new BarcodeDetector({ formats: ["qr_code"] });
            const bitmap = await createImageBitmap(arquivo);
            const codigos = await detector.detect(bitmap);
            if (codigos[0]?.rawValue) processar(codigos[0].rawValue);
            else status.textContent = "Nenhum QR Code foi encontrado nessa imagem.";
        } catch (_) {
            status.textContent = "Não foi possível analisar a imagem.";
        }
    };
}
