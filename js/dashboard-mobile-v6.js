const PRODUTOS_POR_PESO_V6 = [
    "abacate","abacaxi","abobora","abobrinha","acerola","alho","ameixa","banana","batata","batata doce",
    "berinjela","beterraba","caqui","cara","cenoura","cebola","coco seco","goiaba","gengibre","inhame",
    "jilo","kiwi","laranja","limao","maca","mamao","mandioca","manga","maracuja","maxixe","melancia",
    "melao","morango","nabo","pepino","pera","pimentao","pitaya","quiabo","rabanete","tangerina",
    "tomate","uva","vagem","acem","alcatra","bisteca","carne","contrafile","costela","coxa","coxao",
    "coracao","dobradinha","file mignon","figado","frango","linguica","mocoto","musculo","patinho",
    "picanha","sobrecoxa","bife","charque","carne seca","camarao","corvina","file de peixe","lula",
    "marisco","merluza","ostra","peixe fresco","pescada","polvo","salmao fresco","sardinha fresca",
    "sururu","tilapia fresca","presunto fatiado","mortadela fatiada","mussarela fatiada","queijo fatiado",
    "salame fatiado","pao frances","bolo por kg","salgado por kg"
];

function normalizarV6(valor = "") {
    return String(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function lerProdutosV6() {
    try {
        const dados = JSON.parse(localStorage.getItem("produtos") || "[]");
        return Array.isArray(dados) ? dados : [];
    } catch (_) {
        return [];
    }
}

function produtoVendidoPorPesoV6(produto) {
    const categoria = normalizarV6(produto?.categoria);
    const nome = normalizarV6(produto?.nome);

    if (categoria.includes("acougue")) return true;
    if (["graos","mercearia","limpeza","higiene","bebe","pet","farmacia","utilidades","bebidas","congelados","enlatados","doces"].some(item => categoria.includes(item))) return false;

    return PRODUTOS_POR_PESO_V6.some(item => nome.includes(item));
}

function atualizarProdutoV6(id, alteracoes) {
    const produtos = lerProdutosV6();
    const indice = produtos.findIndex(item => String(item.id) === String(id));
    if (indice < 0) return false;
    produtos[indice] = { ...produtos[indice], ...alteracoes };
    localStorage.setItem("produtos", JSON.stringify(produtos));
    return true;
}

function iconeLapisV6() {
    return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
    `;
}

function prepararItensCompactosV6() {
    const lista = document.getElementById("listaProdutos");
    if (!lista) return;

    const aplicar = () => {
        const produtosSalvos = lerProdutosV6();

        lista.querySelectorAll(".produto[data-produto-id]").forEach((produto) => {
            const id = produto.dataset.produtoId;
            const dados = produtosSalvos.find(item => String(item.id) === String(id));
            if (!id) return;

            produto.classList.toggle("produto-por-peso", produtoVendidoPorPesoV6(dados));

            produto.querySelectorAll(".produto-check, input[type='checkbox']").forEach(check => check.remove());
            produto.classList.remove("produto-comprado");

            const botaoEditar = produto.querySelector(".btn-excluir");
            if (botaoEditar) {
                botaoEditar.setAttribute("aria-label", "Editar item");
                botaoEditar.setAttribute("title", "Editar nome, valor ou remover item");
                botaoEditar.innerHTML = iconeLapisV6();
            }
        });
    };

    aplicar();
    new MutationObserver(aplicar).observe(lista, { childList: true, subtree: true });
}

function configurarEditorV6(overlay, produtoElemento) {
    const id = produtoElemento?.dataset.produtoId;
    const dados = lerProdutosV6().find(item => String(item.id) === String(id));
    if (!overlay || !dados) return;

    const porPeso = produtoVendidoPorPesoV6(dados);
    const campoPreco = overlay.querySelector("#itemEditPrice")?.closest(".item-edit-field");
    if (!campoPreco) return;

    campoPreco.classList.remove("item-edit-field-preco");
    campoPreco.querySelector("label").textContent = porPeso ? "Preço por kg" : "Valor unitário";
    overlay.querySelector("#itemEditPrice").value = Number(dados.preco || 0);

    let campoPeso = overlay.querySelector(".item-edit-field-peso");
    if (!campoPeso) {
        campoPeso = document.createElement("div");
        campoPeso.className = "item-edit-field item-edit-field-peso";
        campoPeso.innerHTML = `<label for="itemEditWeight">Peso (kg)</label><input id="itemEditWeight" type="number" min="0" step="0.001" inputmode="decimal">`;
        campoPreco.insertAdjacentElement("afterend", campoPeso);
    }
    campoPeso.hidden = !porPeso;
    campoPeso.querySelector("input").value = Number(dados.peso || 0);

    const salvarAntigo = overlay.querySelector(".item-edit-save");
    const salvar = salvarAntigo.cloneNode(true);
    salvar.textContent = "Salvar alterações";
    salvarAntigo.replaceWith(salvar);

    salvar.addEventListener("click", () => {
        const nome = overlay.querySelector("#itemEditName")?.value.trim();
        const preco = Number(overlay.querySelector("#itemEditPrice")?.value || 0);
        const peso = Number(overlay.querySelector("#itemEditWeight")?.value || 0);
        if (!nome || !Number.isFinite(preco) || preco < 0 || (porPeso && (!Number.isFinite(peso) || peso < 0))) return;

        const alteracoes = porPeso ? { nome, preco, peso } : { nome, preco, peso: 0 };
        if (atualizarProdutoV6(id, alteracoes)) window.location.reload();
    });

    const excluir = overlay.querySelector(".item-edit-delete");
    if (excluir) excluir.textContent = "Remover item";
}

function ajustarEditorV6() {
    document.addEventListener("click", (evento) => {
        const botao = evento.target.closest(".btn-excluir");
        if (!botao) return;
        const produto = botao.closest(".produto[data-produto-id]");
        setTimeout(() => configurarEditorV6(document.getElementById("itemEditOverlay"), produto), 0);
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
