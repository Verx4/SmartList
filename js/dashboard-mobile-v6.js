function prepararItensCompactosV6() {
    const lista = document.getElementById("listaProdutos");
    if (!lista) return;

    const aplicar = () => {
        lista.querySelectorAll(".produto[data-produto-id]").forEach((produto) => {
            const id = produto.dataset.produtoId;
            if (!id) return;

            if (!produto.querySelector(".produto-check")) {
                const check = document.createElement("input");
                check.type = "checkbox";
                check.className = "produto-check";
                check.setAttribute("aria-label", "Marcar item como comprado");

                try {
                    const produtos = JSON.parse(localStorage.getItem("produtos") || "[]");
                    const atual = Array.isArray(produtos)
                        ? produtos.find((item) => String(item.id) === String(id))
                        : null;
                    check.checked = Boolean(atual?.comprado);
                    produto.classList.toggle("produto-comprado", check.checked);
                } catch (_) {}

                check.addEventListener("change", () => {
                    produto.classList.toggle("produto-comprado", check.checked);
                    try {
                        const produtos = JSON.parse(localStorage.getItem("produtos") || "[]");
                        if (!Array.isArray(produtos)) return;
                        const indice = produtos.findIndex((item) => String(item.id) === String(id));
                        if (indice < 0) return;
                        produtos[indice] = { ...produtos[indice], comprado: check.checked };
                        localStorage.setItem("produtos", JSON.stringify(produtos));
                    } catch (_) {}
                });

                produto.prepend(check);
            }

            const botaoEditar = produto.querySelector(".btn-excluir");
            if (botaoEditar) {
                botaoEditar.setAttribute("aria-label", "Editar ou remover item");
                botaoEditar.setAttribute("title", "Editar ou remover item");
            }
        });
    };

    aplicar();
    new MutationObserver(aplicar).observe(lista, { childList: true, subtree: true });
}

function ajustarEditorV6() {
    document.addEventListener("click", (evento) => {
        if (!evento.target.closest(".btn-excluir")) return;
        setTimeout(() => {
            const overlay = document.getElementById("itemEditOverlay");
            if (!overlay) return;

            const campoPreco = overlay.querySelector("#itemEditPrice")?.closest(".item-edit-field");
            campoPreco?.classList.add("item-edit-field-preco");

            const salvar = overlay.querySelector(".item-edit-save");
            if (salvar) salvar.textContent = "Salvar nome";

            const excluir = overlay.querySelector(".item-edit-delete");
            if (excluir) excluir.textContent = "Remover item";
        }, 0);
    }, true);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        prepararItensCompactosV6();
        ajustarEditorV6();
    });
} else {
    prepararItensCompactosV6();
    ajustarEditorV6();
}
