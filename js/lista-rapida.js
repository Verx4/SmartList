import { adicionarProduto, listarProdutos } from "./produtos.js";
import { CATEGORIAS, identificarCategoria } from "./categorias.js";

let itensConferencia = [];

function semAcentos(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function categoriaAutomatica(nome) {
    // Na criação da lista ainda não sabemos a embalagem; "kg" evita que
    // carnes frescas sejam confundidas com congelados por usarem quantidade.
    return identificarCategoria(nome, "kg");
}

function capitalizar(nome) {
    const limpo = String(nome || "").trim().replace(/\s+/g, " ");
    return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : "";
}

function interpretarLinha(linha) {
    let texto = String(linha || "").trim().replace(/^[-•*]+\s*/, "");
    if (!texto) return null;

    let quantidade = 1;
    let medida = "unidade";
    const inicio = texto.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|litros?|ml|un(?:idades?)?|x)?\s+(?:de\s+)?(.+)$/i);

    if (inicio) {
        quantidade = Number(inicio[1].replace(",", ".")) || 1;
        const unidade = semAcentos(inicio[2]);
        texto = inicio[3].trim();
        if (["kg", "g"].includes(unidade)) medida = "kg";
    } else {
        const final = texto.match(/^(.+?)\s+[xX](\d+)$/);
        if (final) {
            texto = final[1].trim();
            quantidade = Number(final[2]) || 1;
        }
    }

    const nome = capitalizar(texto);
    if (!nome) return null;
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nome,
        categoria: categoriaAutomatica(nome),
        quantidade: medida === "kg" ? quantidade : Math.max(1, Math.floor(quantidade)),
        medida
    };
}

function interpretarTexto(texto) {
    const candidatos = String(texto || "")
        .split(/\n|;|,(?=\s*[A-Za-zÀ-ÿ])/)
        .map(interpretarLinha)
        .filter(Boolean);

    const unicos = new Map();
    candidatos.forEach(item => {
        const chave = semAcentos(item.nome);
        const existente = unicos.get(chave);
        if (existente && existente.medida === item.medida) existente.quantidade += item.quantidade;
        else unicos.set(chave, item);
    });
    return [...unicos.values()];
}

function opcoesCategoria(selecionada) {
    return CATEGORIAS.map(categoria =>
        `<option value="${escaparHTML(categoria)}" ${categoria === selecionada ? "selected" : ""}>${escaparHTML(categoria)}</option>`
    ).join("");
}

function renderizarConferencia() {
    const lista = document.getElementById("listaRapidaConferencia");
    const etapa = document.getElementById("listaRapidaEtapaConferencia");
    const contador = document.getElementById("listaRapidaContador");
    if (!lista || !etapa || !contador) return;

    etapa.hidden = !itensConferencia.length;
    contador.textContent = `${itensConferencia.length} ${itensConferencia.length === 1 ? "item identificado" : "itens identificados"}`;
    lista.innerHTML = itensConferencia.map(item => `
        <article class="lista-rapida-item" data-lista-rapida-id="${escaparHTML(item.id)}">
            <label>
                <span>Produto</span>
                <input type="text" data-campo="nome" maxlength="100" value="${escaparHTML(item.nome)}">
            </label>
            <label>
                <span>Categoria</span>
                <select data-campo="categoria">${opcoesCategoria(item.categoria)}</select>
            </label>
            <label class="lista-rapida-campo-curto">
                <span>Quantidade</span>
                <input type="number" data-campo="quantidade" min="0.001" step="0.001" value="${item.quantidade}">
            </label>
            <label class="lista-rapida-campo-curto">
                <span>Unidade</span>
                <select data-campo="medida">
                    <option value="unidade" ${item.medida === "unidade" ? "selected" : ""}>Unidade</option>
                    <option value="kg" ${item.medida === "kg" ? "selected" : ""}>Kg</option>
                </select>
            </label>
            <button type="button" class="lista-rapida-remover" data-remover-item aria-label="Remover ${escaparHTML(item.nome)}">×</button>
        </article>
    `).join("");
}

function abrirModal() {
    const modal = document.getElementById("modalListaRapida");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-aberto");
    requestAnimationFrame(() => document.getElementById("textoListaRapida")?.focus());
}

function fecharModal() {
    const modal = document.getElementById("modalListaRapida");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-aberto");
}

function gerarConferencia() {
    const texto = document.getElementById("textoListaRapida")?.value;
    itensConferencia = interpretarTexto(texto);
    if (!itensConferencia.length) {
        document.getElementById("textoListaRapida")?.focus();
        return;
    }
    renderizarConferencia();
}

function atualizarItem(evento) {
    const card = evento.target.closest("[data-lista-rapida-id]");
    const campo = evento.target.dataset.campo;
    if (!card || !campo) return;
    const item = itensConferencia.find(atual => atual.id === card.dataset.listaRapidaId);
    if (!item) return;
    item[campo] = campo === "quantidade"
        ? Math.max(0.001, Number(evento.target.value) || 1)
        : evento.target.value;
}

function confirmarLista() {
    const existentes = new Set(listarProdutos().map(produto => semAcentos(produto.nome)));
    let adicionados = 0;

    itensConferencia.forEach(item => {
        const nome = capitalizar(item.nome);
        if (!nome || existentes.has(semAcentos(nome))) return;
        const porPeso = item.medida === "kg";
        adicionarProduto({
            nome,
            categoria: item.categoria || categoriaAutomatica(nome),
            medida: item.medida,
            preco: 0,
            quantidade: porPeso ? 0 : Math.max(1, Math.floor(Number(item.quantidade) || 1)),
            peso: porPeso ? Math.max(0.001, Number(item.quantidade) || 1) : 0,
            precos: [{ valor: 0, quantidade: porPeso ? 0 : Math.max(1, Math.floor(Number(item.quantidade) || 1)) }],
            supermercado: "",
            favorito: false
        });
        existentes.add(semAcentos(nome));
        adicionados += 1;
    });

    window.dispatchEvent(new CustomEvent("listarapida:concluida", { detail: { adicionados } }));
    fecharModal();
    itensConferencia = [];
    const texto = document.getElementById("textoListaRapida");
    if (texto) texto.value = "";
    renderizarConferencia();
}

function configurarCliqueNoProduto() {
    document.getElementById("listaProdutos")?.addEventListener("click", evento => {
        if (evento.target.closest("button, input, select, label, a, [data-acao]")) return;
        const produto = evento.target.closest(".produto");
        produto?.querySelector('[data-acao="editar"]')?.click();
    });
}

function iniciar() {
    document.getElementById("btnListaRapida")?.addEventListener("click", abrirModal);
    document.getElementById("btnFecharListaRapida")?.addEventListener("click", fecharModal);
    document.getElementById("btnCancelarListaRapida")?.addEventListener("click", fecharModal);
    document.getElementById("btnGerarListaRapida")?.addEventListener("click", gerarConferencia);
    document.getElementById("btnConfirmarListaRapida")?.addEventListener("click", confirmarLista);
    document.getElementById("listaRapidaConferencia")?.addEventListener("input", atualizarItem);
    document.getElementById("listaRapidaConferencia")?.addEventListener("change", atualizarItem);
    document.getElementById("listaRapidaConferencia")?.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-remover-item]");
        const card = botao?.closest("[data-lista-rapida-id]");
        if (!card) return;
        itensConferencia = itensConferencia.filter(item => item.id !== card.dataset.listaRapidaId);
        renderizarConferencia();
    });
    document.getElementById("modalListaRapida")?.addEventListener("click", evento => {
        if (evento.target.id === "modalListaRapida") fecharModal();
    });
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && !document.getElementById("modalListaRapida")?.hidden) fecharModal();
    });
    configurarCliqueNoProduto();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();

export { interpretarTexto, categoriaAutomatica };
