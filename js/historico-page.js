import "./animations.js";

import {
    agruparComprasPorCategoria,
    chaveDiaDaCompra,
    dataDaCompra,
    filtrarComprasPorPeriodo,
    itensDaCompra,
    precoUnitarioDoItem,
    quantidadeCompradaDoItem,
    resumirCompras,
    subtotalDoItem,
    totalDaCompra,
    totalItensComprados
} from "./historico-calculos.js";

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
});
const numero = valor => Number(valor || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3
});
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const lerHistorico = () => {
    try {
        const dados = JSON.parse(localStorage.getItem("historicoCompras"));
        return Array.isArray(dados) ? dados : [];
    } catch (_erro) {
        return [];
    }
};

const compras = lerHistorico();
const seletorPeriodo = document.getElementById("periodoHistorico");
const graficoCategorias = document.getElementById("graficoCategoriasHistorico");
const detalheCategoria = document.getElementById("detalheCategoriaHistorico");
const campoBusca = document.getElementById("buscarHistorico");

let periodoSelecionado = "todos";
let comprasVisiveis = [];
let categorias = new Map();

function formatarData(data) {
    return Number.isNaN(data.getTime())
        ? "Data não informada"
        : data.toLocaleDateString("pt-BR");
}

function formatarChaveDia(chave) {
    const [ano, mes, dia] = String(chave).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "Data não informada";
}

function rotuloQuantidade(quantidade) {
    return `${numero(quantidade)} ${quantidade === 1 ? "item" : "itens"}`;
}

function descricaoQuantidadeEPreco(item) {
    const peso = Number(item.peso || 0);
    const precoUnitario = precoUnitarioDoItem(item);

    if (peso > 0) {
        return `${numero(peso)} kg × ${moeda(precoUnitario)}/kg`;
    }

    const quantidade = quantidadeCompradaDoItem(item);
    return `${numero(quantidade)} ${quantidade === 1 ? "unidade" : "unidades"} × ${moeda(precoUnitario)}`;
}

function preencherSeletorDeDias() {
    const dias = [...new Set(
        compras.map(chaveDiaDaCompra).filter(Boolean)
    )].sort((a, b) => b.localeCompare(a));

    seletorPeriodo.innerHTML = [
        '<option value="todos">Todas as compras</option>',
        ...dias.map(dia => (
            `<option value="${dia}">Compra do dia ${formatarChaveDia(dia)}</option>`
        ))
    ].join("");
}

function atualizarResumo() {
    const resumo = resumirCompras(comprasVisiveis);

    document.getElementById("historicoTotalGasto").textContent = moeda(resumo.totalGasto);
    document.getElementById("historicoTotalEconomizado").textContent = moeda(resumo.economia);
    document.getElementById("historicoQuantidadeCompras").textContent = String(resumo.quantidadeCompras);
    document.getElementById("historicoItensComprados").textContent = numero(resumo.itensComprados);
    document.getElementById("historicoMediaCompra").textContent = moeda(resumo.media);
    document.getElementById("historicoPeriodoDescricao").textContent = periodoSelecionado === "todos"
        ? "Somando todas as compras finalizadas"
        : `Somente as compras de ${formatarChaveDia(periodoSelecionado)}`;
}

function renderizarCategorias() {
    categorias = agruparComprasPorCategoria(comprasVisiveis);

    const categoriasOrdenadas = [...categorias.entries()]
        .sort((a, b) => b[1].total - a[1].total);
    const maximo = Math.max(
        1,
        ...categoriasOrdenadas.map(([, dados]) => dados.total)
    );

    graficoCategorias.innerHTML = categoriasOrdenadas.length
        ? categoriasOrdenadas.map(([nome, dados]) => `
            <button type="button" data-categoria="${escapar(nome)}" style="--largura:${Math.max(3, dados.total / maximo * 100)}%">
                <span><strong>${escapar(nome)}</strong><b>${moeda(dados.total)}</b></span>
                <i></i>
                <small>${rotuloQuantidade(dados.quantidade)}</small>
            </button>
        `).join("")
        : '<p class="historico-vazio">Nenhuma compra encontrada neste período.</p>';

    detalheCategoria.hidden = true;
}

function mostrarCategoria(nome) {
    const registro = categorias.get(nome);
    if (!registro) return;

    document.getElementById("nomeCategoriaHistorico").textContent = nome;
    document.getElementById("totalCategoriaHistorico").textContent = moeda(registro.total);
    document.getElementById("quantidadeCategoriaHistorico").textContent = rotuloQuantidade(registro.quantidade);
    document.getElementById("itensCategoriaHistorico").innerHTML = registro.itens
        .sort((a, b) => dataDaCompra(b.compra) - dataDaCompra(a.compra))
        .map(({ item, compra }) => `
            <article>
                <div>
                    <strong>${escapar(item.nome || "Item")}</strong>
                    <small>${escapar(compra.supermercado || compra.mercado || item.supermercado || "Mercado não informado")} · ${formatarData(dataDaCompra(compra))}</small>
                    <span>${descricaoQuantidadeEPreco(item)}</span>
                </div>
                <b>${moeda(subtotalDoItem(item))}</b>
            </article>
        `).join("");

    detalheCategoria.hidden = false;
    detalheCategoria.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderizarCompras(termo = "") {
    const filtro = normalizar(termo);
    const filtradas = [...comprasVisiveis]
        .sort((a, b) => dataDaCompra(b) - dataDaCompra(a))
        .filter(compra => {
            const texto = [
                compra.supermercado,
                compra.mercado,
                ...itensDaCompra(compra).map(item => item.nome)
            ].join(" ");
            return !filtro || normalizar(texto).includes(filtro);
        });

    document.getElementById("tituloListaHistorico").textContent = periodoSelecionado === "todos"
        ? "Todas as compras"
        : `Compras de ${formatarChaveDia(periodoSelecionado)}`;
    document.getElementById("listaHistorico").innerHTML = filtradas.length
        ? filtradas.map(compra => `
            <details>
                <summary>
                    <span>
                        <strong>${formatarData(dataDaCompra(compra))}</strong>
                        <small>${escapar(compra.supermercado || compra.mercado || "Mercado não informado")} · ${rotuloQuantidade(totalItensComprados(compra))}</small>
                    </span>
                    <b>${moeda(totalDaCompra(compra))}</b>
                </summary>
                <div>
                    ${itensDaCompra(compra).map(item => `
                        <p>
                            <span><strong>${escapar(item.nome || "Item")}</strong><small>${descricaoQuantidadeEPreco(item)}</small></span>
                            <strong>${moeda(subtotalDoItem(item))}</strong>
                        </p>
                    `).join("") || "<p>Sem itens detalhados.</p>"}
                </div>
            </details>
        `).join("")
        : '<p class="historico-vazio">Nenhuma compra encontrada.</p>';
}

function aplicarPeriodo() {
    comprasVisiveis = filtrarComprasPorPeriodo(compras, periodoSelecionado);
    atualizarResumo();
    renderizarCategorias();
    renderizarCompras(campoBusca.value);
}

graficoCategorias.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-categoria]");
    if (!botao) return;

    graficoCategorias.querySelectorAll("[data-categoria]").forEach(item => {
        item.classList.toggle("ativo", item === botao);
    });
    mostrarCategoria(botao.dataset.categoria);
});

seletorPeriodo.addEventListener("change", evento => {
    periodoSelecionado = evento.target.value;
    aplicarPeriodo();
});

campoBusca.addEventListener("input", evento => renderizarCompras(evento.target.value));
document.getElementById("btnLimparHistorico").addEventListener("click", () => {
    if (window.confirm("Zerar todo o histórico de compras deste aparelho?")) {
        localStorage.removeItem("historicoCompras");
        localStorage.removeItem("ultimaCompra");
        window.location.reload();
    }
});
document.getElementById("btnExportarHistorico").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob(
        [JSON.stringify(comprasVisiveis, null, 2)],
        { type: "application/json" }
    ));
    const link = document.createElement("a");
    link.href = url;
    link.download = periodoSelecionado === "todos"
        ? "historico-smart-list.json"
        : `historico-smart-list-${periodoSelecionado}.json`;
    link.click();
    URL.revokeObjectURL(url);
});

preencherSeletorDeDias();
aplicarPeriodo();
