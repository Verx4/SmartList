
const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
});

const ler = (chave, padrao = []) => {
    try {
        const valor = JSON.parse(localStorage.getItem(chave));
        return valor ?? padrao;
    } catch (_erro) {
        return padrao;
    }
};

const historico = ler("historicoCompras", []);
const produtos = ler("produtos", []);
const usuario = ler("usuarioAtual", ler("usuarioLogado", {}));
const compras = Array.isArray(historico) ? historico : [];
const agora = new Date();
const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);

const dataCompra = compra => new Date(compra.data || compra.criadoEm || compra.finalizadaEm || 0);
const valorCompra = compra => Number(compra.total ?? compra.valorTotal ?? compra.totalCompra ?? 0);
const economiaCompra = compra => Number(compra.economia ?? compra.economiaEstimada ?? 0);
const itensCompra = compra => Array.isArray(compra.produtos) ? compra.produtos : Array.isArray(compra.itens) ? compra.itens : [];
const comprasMes = compras.filter(compra => dataCompra(compra) >= inicioMes);
const comprasMesAnterior = compras.filter(compra => {
    const data = dataCompra(compra);
    return data >= inicioMesAnterior && data < inicioMes;
});
const gastoMes = comprasMes.reduce((total, compra) => total + valorCompra(compra), 0);
const gastoAnterior = comprasMesAnterior.reduce((total, compra) => total + valorCompra(compra), 0);
const economiaMes = comprasMes.reduce((total, compra) => total + economiaCompra(compra), 0);
const media = comprasMes.length ? gastoMes / comprasMes.length : 0;

document.getElementById("saudacaoInicio").textContent = `Olá, ${usuario?.nome || usuario?.name || "Usuário"}! 👋`;
document.getElementById("mesReferencia").textContent = agora.toLocaleDateString("pt-BR", { month: "long" });
document.getElementById("gastoMes").textContent = moeda(gastoMes);
document.getElementById("comprasMes").textContent = String(comprasMes.length);
document.getElementById("economiaMes").textContent = moeda(economiaMes);
document.getElementById("itensLista").textContent = String(Array.isArray(produtos) ? produtos.length : 0);
document.getElementById("mediaCompra").textContent = `Média ${moeda(media)}`;

const variacao = document.getElementById("variacaoMes");
if (gastoAnterior > 0) {
    const percentual = ((gastoMes - gastoAnterior) / gastoAnterior) * 100;
    const reduziu = percentual < 0;
    variacao.textContent = `${reduziu ? "↓" : "↑"} ${Math.abs(percentual).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% vs. mês anterior`;
    variacao.className = `inicio-variacao ${reduziu ? "positiva" : "alerta"}`;
} else if (comprasMes.length) {
    variacao.textContent = "Primeiras compras deste mês";
    variacao.className = "inicio-variacao neutra";
}

const ultimas = compras.slice(-6);
const maximo = Math.max(1, ...ultimas.map(valorCompra));
document.getElementById("graficoGastos").innerHTML = ultimas.length
    ? ultimas.map((compra, indice) => {
        const altura = Math.max(12, valorCompra(compra) / maximo * 100);
        const data = dataCompra(compra);
        const rotulo = Number.isNaN(data.getTime()) ? `Compra ${indice + 1}` : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return `<div title="${moeda(valorCompra(compra))}"><i style="height:${altura}%"></i><small>${rotulo}</small></div>`;
    }).join("")
    : '<p>Finalize uma compra para acompanhar sua evolução.</p>';

const categorias = {};
comprasMes.forEach(compra => itensCompra(compra).forEach(item => {
    const nome = item.categoria || "Outros";
    const subtotal = Number(item.subtotal ?? (Number(item.preco || 0) * Number(item.quantidade || 1)));
    categorias[nome] = (categorias[nome] || 0) + subtotal;
}));
const principal = Object.entries(categorias).sort((a, b) => b[1] - a[1])[0];
document.getElementById("categoriaPrincipal").textContent = principal ? `${principal[0]} · ${moeda(principal[1])}` : "Sem dados no mês";

const ultima = compras.at(-1);
document.getElementById("ultimaCompraInicio").textContent = ultima
    ? `${moeda(valorCompra(ultima))} · ${dataCompra(ultima).toLocaleDateString("pt-BR")}`
    : "Nenhuma compra";

const CHAVES_DADOS = [
    "produtos", "historicoCompras", "ultimaCompra", "economiaAcumulada",
    "favoritos", "preferencias", "orcamentoCompra", "mercadoAtual",
    "mercadosFrequentes", "mercadosRecentes", "sugestoesLocais"
];
const overlay = document.getElementById("confirmarLimpeza");
document.getElementById("btnTemaInicio").addEventListener("click", () => {
    document.getElementById("botaoTemaGlobal")?.click();
});
document.getElementById("btnLimparDados").addEventListener("click", () => {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
});
overlay.querySelector(".limpeza-cancelar").addEventListener("click", fecharConfirmacao);
overlay.addEventListener("click", evento => { if (evento.target === overlay) fecharConfirmacao(); });
overlay.querySelector(".limpeza-confirmar").addEventListener("click", () => {
    CHAVES_DADOS.forEach(chave => localStorage.removeItem(chave));
    window.location.reload();
});

function fecharConfirmacao() {
    overlay.hidden = true;
    document.body.style.overflow = "";
}

