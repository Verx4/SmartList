
const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const lerHistorico = () => {
    try { const dados = JSON.parse(localStorage.getItem("historicoCompras")); return Array.isArray(dados) ? dados : []; }
    catch (_erro) { return []; }
};
const compras = lerHistorico();
const itensCompra = compra => Array.isArray(compra.itens) ? compra.itens : Array.isArray(compra.produtos) ? compra.produtos : [];
const totalCompra = compra => Number(compra.total ?? compra.valorTotal ?? compra.totalCompra ?? 0);
const subtotalItem = item => Number(item.subtotal ?? (Number(item.preco ?? item.precoAtual ?? 0) * (Number(item.peso) > 0 ? Number(item.peso) : Number(item.quantidade) || 1)));
const dataCompra = compra => new Date(compra.data || compra.criadoEm || compra.finalizadaEm || 0);

const gasto = compras.reduce((total, compra) => total + totalCompra(compra), 0);
const economia = compras.reduce((total, compra) => total + Math.max(0, Number(compra.economia ?? -Number(compra.diferenca || 0))), 0);
document.getElementById("historicoTotalGasto").textContent = moeda(gasto);
document.getElementById("historicoTotalEconomizado").textContent = moeda(economia);
document.getElementById("historicoQuantidadeCompras").textContent = String(compras.length);
document.getElementById("historicoMediaCompra").textContent = moeda(compras.length ? gasto / compras.length : 0);

const categorias = new Map();
compras.forEach(compra => itensCompra(compra).forEach(item => {
    const categoria = item.categoria || "Outros";
    const registro = categorias.get(categoria) || { total: 0, itens: [] };
    registro.total += subtotalItem(item);
    registro.itens.push({ item, compra });
    categorias.set(categoria, registro);
}));
const categoriasOrdenadas = [...categorias.entries()].sort((a, b) => b[1].total - a[1].total);
const maximo = Math.max(1, ...categoriasOrdenadas.map(([, dados]) => dados.total));
document.getElementById("graficoCategoriasHistorico").innerHTML = categoriasOrdenadas.length
    ? categoriasOrdenadas.map(([nome, dados], indice) => `<button type="button" data-categoria="${escapar(nome)}" style="--largura:${Math.max(3, dados.total / maximo * 100)}%"><span><strong>${escapar(nome)}</strong><b>${moeda(dados.total)}</b></span><i></i><small>${dados.itens.length} item(ns)</small></button>`).join("")
    : '<p class="historico-vazio">Finalize uma compra para criar o gráfico.</p>';

document.getElementById("graficoCategoriasHistorico").addEventListener("click", evento => {
    const botao = evento.target.closest("[data-categoria]");
    if (!botao) return;
    document.querySelectorAll("[data-categoria]").forEach(item => item.classList.toggle("ativo", item === botao));
    mostrarCategoria(botao.dataset.categoria);
});

function mostrarCategoria(nome) {
    const registro = categorias.get(nome);
    if (!registro) return;
    document.getElementById("nomeCategoriaHistorico").textContent = nome;
    document.getElementById("totalCategoriaHistorico").textContent = moeda(registro.total);
    document.getElementById("itensCategoriaHistorico").innerHTML = registro.itens
        .sort((a, b) => dataCompra(b.compra) - dataCompra(a.compra))
        .map(({ item, compra }) => `<article><div><strong>${escapar(item.nome || "Item")}</strong><small>${escapar(compra.supermercado || compra.mercado || item.supermercado || "Mercado não informado")} · ${formatarData(dataCompra(compra))}</small></div><span>${quantidadeItem(item)}</span><b>${moeda(subtotalItem(item))}</b></article>`).join("");
    const detalhe = document.getElementById("detalheCategoriaHistorico");
    detalhe.hidden = false;
    detalhe.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function quantidadeItem(item) {
    if (Number(item.peso) > 0) return `${Number(item.peso).toLocaleString("pt-BR")} kg`;
    return `${Number(item.quantidade) || 1} un.`;
}
function formatarData(data) {
    return Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleDateString("pt-BR");
}

function renderizarCompras(termo = "") {
    const filtro = normalizar(termo);
    const filtradas = [...compras].sort((a, b) => dataCompra(b) - dataCompra(a)).filter(compra => {
        const texto = [compra.supermercado, compra.mercado, ...itensCompra(compra).map(item => item.nome)].join(" ");
        return !filtro || normalizar(texto).includes(filtro);
    });
    document.getElementById("listaHistorico").innerHTML = filtradas.length ? filtradas.map(compra => `<details><summary><span><strong>${formatarData(dataCompra(compra))}</strong><small>${escapar(compra.supermercado || compra.mercado || "Mercado não informado")}</small></span><b>${moeda(totalCompra(compra))}</b></summary><div>${itensCompra(compra).map(item => `<p><span>${escapar(item.nome || "Item")} · ${quantidadeItem(item)}</span><strong>${moeda(subtotalItem(item))}</strong></p>`).join("") || "<p>Sem itens detalhados.</p>"}</div></details>`).join("") : '<p class="historico-vazio">Nenhuma compra encontrada.</p>';
}

document.getElementById("buscarHistorico").addEventListener("input", evento => renderizarCompras(evento.target.value));
document.getElementById("btnLimparHistorico").addEventListener("click", () => {
    if (window.confirm("Zerar todo o histórico de compras deste aparelho?")) {
        localStorage.removeItem("historicoCompras"); localStorage.removeItem("ultimaCompra"); window.location.reload();
    }
});
document.getElementById("btnExportarHistorico").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(compras, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "historico-smart-list.json"; link.click(); URL.revokeObjectURL(url);
});

renderizarCompras();

