const listaProdutosV4 = document.getElementById("listaProdutos");

if (listaProdutosV4) {
    listaProdutosV4.addEventListener("click", interceptarEdicaoItemV4, true);
}

function interceptarEdicaoItemV4(evento) {
    const botao = evento.target.closest(".btn-excluir");
    if (!botao) return;

    if (botao.dataset.permitirExclusao === "true") {
        delete botao.dataset.permitirExclusao;
        return;
    }

    evento.preventDefault();
    evento.stopPropagation();
    evento.stopImmediatePropagation();

    const produto = botao.closest("[data-produto-id]");
    if (!produto) return;

    abrirEditorItemV4(produto, botao);
}

function criarEditorItemV4() {
    let overlay = document.getElementById("itemEditOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "itemEditOverlay";
    overlay.className = "item-edit-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="item-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="itemEditTitle">
            <div class="item-edit-handle" aria-hidden="true"></div>
            <header class="item-edit-header">
                <h2 id="itemEditTitle">Editar item</h2>
                <button type="button" class="item-edit-close" aria-label="Fechar">×</button>
            </header>

            <div class="item-edit-field">
                <label for="itemEditPrice">Valor do produto</label>
                <input id="itemEditPrice" type="number" min="0" step="0.01" inputmode="decimal">
            </div>

            <div class="item-edit-actions">
                <button type="button" class="item-edit-save">Salvar valor</button>
                <button type="button" class="item-edit-delete">Excluir item</button>
            </div>
        </section>`;

    document.body.appendChild(overlay);

    const fechar = () => {
        overlay.hidden = true;
        overlay._produto = null;
        overlay._botaoExcluir = null;
        document.body.style.overflow = "";
    };

    overlay.querySelector(".item-edit-close")?.addEventListener("click", fechar);
    overlay.addEventListener("click", (evento) => {
        if (evento.target === overlay) fechar();
    });

    overlay.querySelector(".item-edit-save")?.addEventListener("click", () => {
        const produto = overlay._produto;
        const campoOriginal = produto?.querySelector('[data-campo="preco"]');
        const valor = Number(overlay.querySelector("#itemEditPrice")?.value || 0);

        if (!campoOriginal || !Number.isFinite(valor) || valor < 0) return;

        campoOriginal.value = String(valor);
        campoOriginal.dispatchEvent(new Event("change", { bubbles: true }));
        fechar();
    });

    overlay.querySelector(".item-edit-delete")?.addEventListener("click", () => {
        const botaoExcluir = overlay._botaoExcluir;
        fechar();
        if (!botaoExcluir) return;
        botaoExcluir.dataset.permitirExclusao = "true";
        botaoExcluir.click();
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && !overlay.hidden) fechar();
    });

    return overlay;
}

function abrirEditorItemV4(produto, botaoExcluir) {
    const overlay = criarEditorItemV4();
    const nome = produto.querySelector("h3")?.textContent?.trim() || "Editar item";
    const preco = produto.querySelector('[data-campo="preco"]')?.value || "0";

    overlay._produto = produto;
    overlay._botaoExcluir = botaoExcluir;
    overlay.querySelector("#itemEditTitle").textContent = nome;
    overlay.querySelector("#itemEditPrice").value = preco;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    window.setTimeout(() => overlay.querySelector("#itemEditPrice")?.focus(), 30);
}
