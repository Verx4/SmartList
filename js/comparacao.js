
import { api, ApiError } from "./api.js";

const REDES_PADRAO = [
    ["Pão de Açúcar", true], ["Atacadão", true], ["Recife Atacarejo", true],
    ["Assaí", false], ["Novo Atacarejo", false], ["Mix Mateus", false],
    ["Verde Frut", false], ["Deskontão", false], ["Carrefour", false], ["GBarbosa", false]
].map(([nome, coletaPublica]) => ({ nome, coletaPublica, situacao: coletaPublica ? "Coleta pública" : "Preço pode vir de nota fiscal" }));

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const ler = (chave, padrao) => {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch (_erro) { return padrao; }
};

const produtos = ler("produtos", []);
const usuario = ler("usuarioAtual", ler("usuarioLogado", {}));
const itens = (Array.isArray(produtos) ? produtos : []).slice(0, 80).map(produto => ({
    nome: String(produto.nome || "").trim(),
    quantidade: Math.max(0.01, Number(produto.peso) > 0 ? Number(produto.peso) : Number(produto.quantidade) || 1)
})).filter(item => item.nome);

document.getElementById("quantidadeItensComparacao").textContent = String(itens.length);
document.getElementById("cidadeComparacao").value = usuario?.cidade || "";

async function carregarRedes() {
    let redes = REDES_PADRAO;
    try {
        const resposta = await api.get("/comparacoes/redes");
        if (Array.isArray(resposta) && resposta.length) redes = resposta;
    } catch (_erro) {
        // A lista local mantém a tela utilizável enquanto o servidor inicia.
    }
    renderizarRedes(redes);
}

function renderizarRedes(redes) {
    document.getElementById("redesComparacao").innerHTML = redes.map(rede => `
        <label class="rede-opcao ${rede.coletaPublica ? "disponivel" : "aguardando"}">
            <input type="checkbox" name="mercados" value="${escapar(rede.nome)}" ${rede.coletaPublica ? "checked" : ""}>
            <span><strong>${escapar(rede.nome)}</strong><small>${escapar(rede.situacao)}</small></span>
        </label>
    `).join("");
}

function selecionados() {
    return Array.from(document.querySelectorAll('input[name="mercados"]:checked')).map(campo => campo.value);
}

function mensagem(texto, erro = false) {
    const elemento = document.getElementById("mensagemComparacao");
    elemento.textContent = texto;
    elemento.className = `mensagem-comparacao ${erro ? "erro" : ""}`;
}

document.getElementById("selecionarRedes").addEventListener("click", () => {
    document.querySelectorAll('input[name="mercados"]').forEach(campo => { campo.checked = true; });
});
document.getElementById("limparRedes").addEventListener("click", () => {
    document.querySelectorAll('input[name="mercados"]').forEach(campo => { campo.checked = false; });
});

document.getElementById("formComparacaoLista").addEventListener("submit", async evento => {
    evento.preventDefault();
    const mercados = selecionados();
    if (!itens.length) return mensagem("Adicione itens à lista antes de comparar.", true);
    if (!mercados.length) return mensagem("Selecione pelo menos um mercado.", true);

    const botao = document.getElementById("btnCompararLista");
    botao.disabled = true;
    botao.textContent = "Coletando preços...";
    mensagem("A primeira consulta pode levar alguns segundos.");
    try {
        const resposta = await api.post("/comparacoes/lista", {
            itens,
            mercados,
            cidade: document.getElementById("cidadeComparacao").value.trim()
        });
        renderizarResultado(resposta);
        mensagem(resposta.aviso || "Comparação concluída.");
    } catch (erro) {
        mensagem(erro instanceof ApiError ? erro.message : "Não foi possível comparar agora.", true);
    } finally {
        botao.disabled = false;
        botao.textContent = "Comparar minha lista";
    }
});

function renderizarResultado(resposta) {
    const secao = document.getElementById("resultadoComparacaoLista");
    const mercados = Array.isArray(resposta?.mercados) ? resposta.mercados : [];
    document.getElementById("tituloMelhorMercado").textContent = resposta?.melhorMercado
        ? `${resposta.melhorMercado} tem o menor total completo`
        : "Ainda não há cobertura completa da lista";
    document.getElementById("atualizacaoComparacao").textContent = new Date(resposta?.atualizadoEm || Date.now()).toLocaleString("pt-BR");
    document.getElementById("cardsMercadosComparacao").innerHTML = mercados.map(mercado => {
        const melhor = mercado.mercado === resposta?.melhorMercado;
        const detalhes = (mercado.itens || []).map(item => `
            <tr><td><strong>${escapar(item.itemLista)}</strong><small>${escapar(item.produtoEncontrado)}</small></td><td>${item.quantidade}</td><td>${moeda(item.precoUnitario)}</td><td>${moeda(item.subtotal)}</td></tr>
        `).join("");
        return `<article class="mercado-resultado ${melhor ? "melhor" : ""}">
            <header><div><span>${melhor ? "Melhor compra" : `${mercado.coberturaPercentual}% da lista`}</span><h3>${escapar(mercado.mercado)}</h3></div><strong>${mercado.itensEncontrados ? moeda(mercado.total) : "Indisponível"}</strong></header>
            <div class="faixa-mercado"><span>Faixa com margem</span><strong>${mercado.itensEncontrados ? `${moeda(mercado.totalMinimo)} a ${moeda(mercado.totalMaximo)}` : "—"}</strong></div>
            <p>${escapar(mercado.situacao)}</p>
            ${detalhes ? `<details><summary>Ver ${mercado.itensEncontrados} preço(s) encontrado(s)</summary><div class="tabela-precos"><table><thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th><th>Subtotal</th></tr></thead><tbody>${detalhes}</tbody></table></div></details>` : ""}
        </article>`;
    }).join("") || "<p>Nenhum preço foi encontrado.</p>";
    secao.hidden = false;
    secao.scrollIntoView({ behavior: "smooth", block: "start" });
}

carregarRedes();

