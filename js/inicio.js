import "./animations.js";
import { api } from "./api.js";
import { combinarHistoricos } from "./historico-sync.js";
import { listarDespensa, produtosAcabando } from "./despensa-store.js";

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

function renderizarProdutosAcabando() {
    const container = document.getElementById("produtosAcabandoInicio");
    if (!container) return;
    const baixos = produtosAcabando(listarDespensa());
    container.innerHTML = baixos.length
        ? baixos.slice(0, 5).map(item => `<a href="./despensa.html"><span><strong>${escapar(item.nome)}</strong><small>${escapar(item.categoria)}</small></span><b>${Number(item.quantidade || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${escapar(item.unidade)}</b></a>`).join("")
        : '<p>Todos os produtos estão abastecidos.</p>';
}

const normalizar = valor => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const dataCompra = compra => new Date(compra.data || compra.realizadaEm || compra.finalizadoEm || compra.finalizadaEm || compra.criadoEm || 0);
const valorCompra = compra => Number(compra.total ?? compra.valorTotal ?? compra.totalCompra ?? 0);
const economiaCompra = compra => Number(compra.economia ?? compra.economiaEstimada ?? 0);
const itensCompra = compra => Array.isArray(compra.produtos) ? compra.produtos : Array.isArray(compra.itens) ? compra.itens : [];

function subtotalProdutoMantido(produto = {}) {
    const peso = Number(produto.peso || 0);
    const precos = Array.isArray(produto.precos) ? produto.precos : [];
    const subtotalAtual = peso > 0
        ? Number(precos[0]?.valor ?? produto.preco ?? 0) * peso
        : precos.length
            ? precos.reduce(
                (total, preco) => total + (Number(preco.valor || 0) * Number(preco.quantidade || 0)),
                0
            )
            : Number(produto.preco || 0) * Number(produto.quantidade || 0);

    if (subtotalAtual > 0) return subtotalAtual;

    return Number(produto.ultimoPreco || 0)
        * Number(produto.ultimaQuantidade || 0);
}

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
    const valorUltimaCompraMantida = Number(localStorage.getItem("ultimaCompra") || 0);
    const mostrarListaMantida = !comprasMes.length
        && produtos.length > 0
        && valorUltimaCompraMantida > 0;
    const gastoExibido = mostrarListaMantida ? valorUltimaCompraMantida : gastoMes;
    const media = comprasMes.length ? gastoMes / comprasMes.length : gastoExibido;

    document.getElementById("saudacaoInicio").textContent = `Olá, ${usuario?.nome || usuario?.name || "Usuário"}! 👋`;
    document.getElementById("mesReferencia").textContent = mostrarListaMantida
        ? "Lista mantida"
        : agora.toLocaleDateString("pt-BR", { month: "long" });
    document.querySelector(".inicio-destaque-topo > span").textContent = mostrarListaMantida
        ? "Valor da última compra"
        : "Gasto neste mês";
    document.getElementById("gastoMes").textContent = moeda(gastoExibido);
    document.getElementById("comprasMes").textContent = String(
        mostrarListaMantida ? 1 : comprasMes.length
    );
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
    } else if (mostrarListaMantida) {
        variacao.textContent = "Compra finalizada mantendo a lista";
        variacao.className = "inicio-variacao positiva";
    } else {
        variacao.textContent = "Sem compras registradas";
        variacao.className = "inicio-variacao neutra";
    }

    const categorias = {};
    if (comprasMes.length) {
        comprasMes.forEach(compra => itensCompra(compra).forEach(item => {
            const nome = item.categoria || "Outros";
            const subtotal = Number(item.subtotal ?? (Number(item.precoUnitario ?? item.preco ?? 0) * Number(item.quantidade || 1)));
            categorias[nome] = (categorias[nome] || 0) + subtotal;
        }));
    } else if (mostrarListaMantida) {
        produtos.forEach(item => {
            const nome = item.categoria || "Outros";
            const subtotal = subtotalProdutoMantido(item);
            if (subtotal > 0) categorias[nome] = (categorias[nome] || 0) + subtotal;
        });
    }
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
    document.getElementById("ultimaCompraInicio").textContent = mostrarListaMantida
        ? `${moeda(valorUltimaCompraMantida)} · lista mantida`
        : ultima
            ? `${moeda(valorCompra(ultima))} · ${dataCompra(ultima).toLocaleDateString("pt-BR")}`
            : "Nenhuma compra";
}

async function carregarGestaoPlanosInicio() {
    try {
        const [planos, configuracao] = await Promise.all([
            api.get("/assinaturas/planos"),
            api.get("/assinaturas/configuracao-planos")
        ]);

        const porCiclo = Object.fromEntries(
            (Array.isArray(planos) ? planos : []).map(plano => [String(plano.ciclo || "").toUpperCase(), plano])
        );
        const mensal = Number(porCiclo.MENSAL?.valor || 9.97);
        const trimestral = Number(porCiclo.TRIMESTRAL?.valor || 26.91);
        const anual = Number(porCiclo.ANUAL?.valor || 95.64);

        const cardMensal = document.querySelector(".inicio-plano-mensal");
        const cardTrimestral = document.querySelector(".inicio-plano-trimestral");
        const cardAnual = document.querySelector(".inicio-plano-anual");

        cardMensal?.querySelector(":scope > strong")?.replaceChildren(document.createTextNode(moeda(mensal)));
        cardTrimestral?.querySelector(":scope > strong")?.replaceChildren(document.createTextNode(moeda(trimestral)));
        cardAnual?.querySelector(":scope > strong")?.replaceChildren(document.createTextNode(moeda(anual)));

        cardTrimestral?.querySelector("del")?.replaceChildren(document.createTextNode(moeda(mensal * 3)));
        cardAnual?.querySelector("del")?.replaceChildren(document.createTextNode(moeda(mensal * 12)));

        const cupons = document.querySelector(".inicio-cupons");
        if (cupons) cupons.hidden = configuracao?.exibirCupons === false;
    } catch (erro) {
        console.warn("Não foi possível sincronizar a Gestão de Planos na tela inicial.", erro);
    }
}

carregarResumoInicio().catch(erro => {
    console.warn("Não foi possível carregar o resumo da tela inicial.", erro);
});
carregarGestaoPlanosInicio();
renderizarProdutosAcabando();

document.getElementById("btnTemaInicio")?.addEventListener("click", evento => {
    evento.stopPropagation();
    document.getElementById("botaoTemaGlobal")?.click();
});
