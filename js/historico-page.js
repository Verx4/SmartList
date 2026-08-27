import "./animations.js";
import { api } from "./api.js";

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

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = valor => Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const lerHistoricoLocal = () => {
    try {
        const dados = JSON.parse(localStorage.getItem("historicoCompras"));
        return Array.isArray(dados) ? dados : [];
    } catch (_erro) {
        return [];
    }
};

const normalizarCompraApi = compra => ({
    ...compra,
    data: compra.finalizadoEm || compra.finalizadaEm || compra.criadoEm,
    mercado: compra.mercadoNome || compra.mercado || compra.supermercado,
    supermercado: compra.mercadoNome || compra.supermercado || compra.mercado,
    usuarioNome: compra.usuarioNome || compra.usuario || "Usuário não identificado"
});

let compras = [];
const seletorPeriodo = document.getElementById("periodoHistorico");
const graficoCategorias = document.getElementById("graficoCategoriasHistorico");
const detalheCategoria = document.getElementById("detalheCategoriaHistorico");
const campoBusca = document.getElementById("buscarHistorico");
const listaHistorico = document.getElementById("listaHistorico");

let periodoSelecionado = "todos";
let comprasVisiveis = [];
let categorias = new Map();
let compraAbertaId = null;

function formatarData(data) {
    return Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleDateString("pt-BR");
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
    if (peso > 0) return `${numero(peso)} kg × ${moeda(precoUnitario)}/kg`;
    const quantidade = quantidadeCompradaDoItem(item);
    return `${numero(quantidade)} ${quantidade === 1 ? "unidade" : "unidades"} × ${moeda(precoUnitario)}`;
}

function mercadoDaCompra(compra) {
    return compra.mercadoNome || compra.supermercado || compra.mercado || "Mercado não informado";
}

function usuarioDaCompra(compra) {
    return compra.usuarioNome || compra.usuario || "Usuário não identificado";
}

function idDaCompra(compra, indice) {
    return String(compra.id || compra.compraId || `${chaveDiaDaCompra(compra)}-${indice}`);
}

function preencherSeletorDeDias() {
    const dias = [...new Set(compras.map(chaveDiaDaCompra).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    seletorPeriodo.innerHTML = [
        '<option value="todos">Todas as compras</option>',
        ...dias.map(dia => `<option value="${dia}">Compra do dia ${formatarChaveDia(dia)}</option>`)
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
    const categoriasOrdenadas = [...categorias.entries()].sort((a, b) => b[1].total - a[1].total);
    const maximo = Math.max(1, ...categoriasOrdenadas.map(([, dados]) => dados.total));
    graficoCategorias.innerHTML = categoriasOrdenadas.length
        ? categoriasOrdenadas.map(([nome, dados]) => `
            <button type="button" data-categoria="${escapar(nome)}" style="--largura:${Math.max(3, dados.total / maximo * 100)}%">
                <span><strong>${escapar(nome)}</strong><b>${moeda(dados.total)}</b></span><i></i><small>${rotuloQuantidade(dados.quantidade)}</small>
            </button>`).join("")
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
        .map(({ item, compra }) => `<article><div><strong>${escapar(item.nome || "Item")}</strong><small>${escapar(mercadoDaCompra(compra))} · ${formatarData(dataDaCompra(compra))}</small><span>${descricaoQuantidadeEPreco(item)}</span></div><b>${moeda(subtotalDoItem(item))}</b></article>`).join("");
    detalheCategoria.hidden = false;
    detalheCategoria.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function comprasFiltradas(termo = "") {
    const filtro = normalizar(termo);
    return [...comprasVisiveis]
        .sort((a, b) => dataDaCompra(b) - dataDaCompra(a))
        .filter(compra => {
            const texto = [mercadoDaCompra(compra), usuarioDaCompra(compra), ...itensDaCompra(compra).map(item => item.nome)].join(" ");
            return !filtro || normalizar(texto).includes(filtro);
        });
}

function renderizarPastas(termo = "") {
    const filtradas = comprasFiltradas(termo);
    document.getElementById("tituloListaHistorico").textContent = periodoSelecionado === "todos" ? "Compras salvas" : `Compras de ${formatarChaveDia(periodoSelecionado)}`;
    listaHistorico.innerHTML = filtradas.length
        ? filtradas.map((compra, indice) => {
            const id = idDaCompra(compra, indice);
            return `<button class="historico-pasta" type="button" data-abrir-compra="${escapar(id)}">
                <span class="historico-pasta-icone" aria-hidden="true">📁</span>
                <span class="historico-pasta-info"><strong>${formatarData(dataDaCompra(compra))} · ${escapar(mercadoDaCompra(compra))}</strong><small>Usuário: ${escapar(usuarioDaCompra(compra))}</small><small>${rotuloQuantidade(totalItensComprados(compra))} · ${moeda(totalDaCompra(compra))}</small></span>
                <span class="historico-pasta-acao">Abrir</span>
            </button>`;
        }).join("")
        : '<p class="historico-vazio">Nenhuma compra encontrada.</p>';
}

function abrirCompra(id) {
    const filtradas = comprasFiltradas(campoBusca.value);
    const compra = filtradas.find((item, indice) => idDaCompra(item, indice) === id);
    if (!compra) return;
    compraAbertaId = id;
    document.getElementById("tituloListaHistorico").textContent = "Lista da compra";
    listaHistorico.innerHTML = `<article class="historico-pasta-detalhe">
        <header><button type="button" class="btn-voltar-compra" data-voltar-compras>← Voltar</button><div><small>Compra salva</small><h3>${formatarData(dataDaCompra(compra))} · ${escapar(mercadoDaCompra(compra))}</h3><p>Usuário: <strong>${escapar(usuarioDaCompra(compra))}</strong></p></div><strong>${moeda(totalDaCompra(compra))}</strong></header>
        <div class="historico-itens-compra">${itensDaCompra(compra).map(item => `<div class="historico-item-compra"><span><strong>${escapar(item.nome || "Item")}</strong><small>${escapar(item.categoria || "Sem categoria")} · ${descricaoQuantidadeEPreco(item)}</small></span><strong>${moeda(subtotalDoItem(item))}</strong></div>`).join("") || '<p class="historico-vazio">Sem itens detalhados.</p>'}</div>
    </article>`;
    listaHistorico.scrollIntoView({ behavior: "smooth", block: "start" });
}

function aplicarPeriodo() {
    compraAbertaId = null;
    comprasVisiveis = filtrarComprasPorPeriodo(compras, periodoSelecionado);
    atualizarResumo();
    renderizarCategorias();
    renderizarPastas(campoBusca.value);
}

async function carregarCompras() {
    listaHistorico.innerHTML = '<p class="historico-vazio">Carregando compras salvas...</p>';
    try {
        const dados = await api.get("/listas/historico");
        compras = Array.isArray(dados) ? dados.map(normalizarCompraApi) : [];
    } catch (_erro) {
        compras = lerHistoricoLocal();
    }
    preencherSeletorDeDias();
    aplicarPeriodo();
}

graficoCategorias.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-categoria]");
    if (!botao) return;
    graficoCategorias.querySelectorAll("[data-categoria]").forEach(item => item.classList.toggle("ativo", item === botao));
    mostrarCategoria(botao.dataset.categoria);
});

listaHistorico.addEventListener("click", evento => {
    const abrir = evento.target.closest("[data-abrir-compra]");
    if (abrir) return abrirCompra(abrir.dataset.abrirCompra);
    if (evento.target.closest("[data-voltar-compras]")) {
        compraAbertaId = null;
        renderizarPastas(campoBusca.value);
    }
});

seletorPeriodo.addEventListener("change", evento => { periodoSelecionado = evento.target.value; aplicarPeriodo(); });
campoBusca.addEventListener("input", evento => { compraAbertaId = null; renderizarPastas(evento.target.value); });

document.getElementById("btnLimparHistorico").addEventListener("click", () => {
    if (window.confirm("Zerar o histórico salvo apenas neste aparelho? As compras da sua conta continuam protegidas no servidor.")) {
        localStorage.removeItem("historicoCompras");
        localStorage.removeItem("ultimaCompra");
        window.location.reload();
    }
});

document.getElementById("btnExportarHistorico").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(comprasVisiveis, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = periodoSelecionado === "todos" ? "historico-smart-list.json" : `historico-smart-list-${periodoSelecionado}.json`;
    link.click();
    URL.revokeObjectURL(url);
});

carregarCompras();
