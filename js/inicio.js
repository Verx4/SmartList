import "./animations.js";
import { api } from "./api.js";
import { combinarHistoricos } from "./historico-sync.js";

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
});
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const ler = (chave, padrao = []) => {
    try {
        const valor = JSON.parse(localStorage.getItem(chave));
        return valor ?? padrao;
    } catch (_erro) {
        return padrao;
    }
};

const produtos = ler("produtos", []);
const usuario = ler("usuarioAtual", ler("usuarioLogado", {}));

const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const dataCompra = compra => new Date(compra.data || compra.realizadaEm || compra.finalizadoEm || compra.finalizadaEm || compra.criadoEm || 0);
const valorCompra = compra => Number(compra.total ?? compra.valorTotal ?? compra.totalCompra ?? 0);
const economiaCompra = compra => Number(compra.economia ?? compra.economiaEstimada ?? 0);
const itensCompra = compra => Array.isArray(compra.produtos) ? compra.produtos : Array.isArray(compra.itens) ? compra.itens : [];

function historicoLocalDoUsuario() {
    const historico = ler("historicoCompras", []);
    const usuarioId = String(usuario?.id || usuario?.usuarioId || "");
    const usuarioNome = normalizar(usuario?.nome || usuario?.name);
    if (!Array.isArray(historico) || (!usuarioId && !usuarioNome)) return [];

    return historico.filter(compra => {
        const compraUsuarioId = String(compra.usuarioId || "");
        if (usuarioId && compraUsuarioId) return compraUsuarioId === usuarioId;
        return usuarioNome && normalizar(compra.usuarioNome) === usuarioNome;
    });
}

async function carregarResumoInicio() {
    const locais = historicoLocalDoUsuario();
    let remotas = [];

    try {
        const dados = await api.get("/coleta-precos/compras/historico");
        remotas = Array.isArray(dados) ? dados : [];
    } catch (_erroColeta) {
        try {
            const dadosLegados = await api.get("/listas/historico");
            remotas = Array.isArray(dadosLegados) ? dadosLegados : [];
        } catch (_erroLista) {
            remotas = [];
        }
    }

    const compras = combinarHistoricos(remotas, locais);
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
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
    } else {
        variacao.textContent = "Sem compras registradas";
        variacao.className = "inicio-variacao neutra";
    }

    const categorias = {};
    comprasMes.forEach(compra => itensCompra(compra).forEach(item => {
        const nome = item.categoria || "Outros";
        const subtotal = Number(item.subtotal ?? (Number(item.precoUnitario ?? item.preco ?? 0) * Number(item.quantidade || 1)));
        categorias[nome] = (categorias[nome] || 0) + subtotal;
    }));
    const categoriasOrdenadas = Object.entries(categorias).sort((a, b) => b[1] - a[1]);
    const principal = categoriasOrdenadas[0];
    const maiorCategoria = Math.max(1, ...categoriasOrdenadas.map(([, valor]) => valor));
    document.getElementById("graficoGastos").innerHTML = categoriasOrdenadas.length
        ? categoriasOrdenadas.slice(0, 5).map(([nome, valor]) => `
            <div class="inicio-categoria-linha">
                <span>${escapar(nome)}</span><strong>${moeda(valor)}</strong>
                <i><b style="width:${Math.max(3, valor / maiorCategoria * 100)}%"></b></i>
            </div>
        `).join("")
        : '<p>Finalize uma compra para ver os gastos por categoria.</p>';
    document.getElementById("categoriaPrincipal").textContent = principal ? `${principal[0]} · ${moeda(principal[1])}` : "Sem dados no mês";

    const ultima = compras[0];
    document.getElementById("ultimaCompraInicio").textContent = ultima
        ? `${moeda(valorCompra(ultima))} · ${dataCompra(ultima).toLocaleDateString("pt-BR")}`
        : "Nenhuma compra";
}

carregarResumoInicio().catch(erro => {
    console.warn("Não foi possível carregar o resumo da tela inicial.", erro);
});

const CHAVES_DADOS = [
    "produtos", "historicoCompras", "ultimaCompra", "economiaAcumulada",
    "favoritos", "preferencias", "orcamentoCompra", "mercadoAtual",
    "mercadosFrequentes", "mercadosRecentes", "sugestoesLocais",
    "listasSalvas", "listaAtualId"
];
const overlay = document.getElementById("confirmarLimpeza");
document.getElementById("btnTemaInicio").addEventListener("click", evento => {
    evento.stopPropagation();
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
