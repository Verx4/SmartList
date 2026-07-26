import "./animations.js";
import { api, ApiError } from "./api.js";
import {
    cidadeMaisProvavel,
    consultarFiliaisProximas,
    encontrarFilialMaisProxima,
    normalizarTextoLocalizacao,
    obterLocalizacaoUsuario
} from "./localizacao-mercados.js";

const REDES_PADRAO = [
    ["Pão de Açúcar", true], ["Atacadão", true], ["Recife Atacarejo", true],
    ["Deskontão", true], ["Carrefour", true], ["Novo Atacarejo", false],
    ["Mix Mateus", false], ["Assaí Atacadista", false], ["Arco-Mix", false],
    ["Econômico Atacadão", false], ["Atacado dos Presentes", false], ["Makro", false],
    ["Extra Mercado", false], ["Rede Tem Supermercados", false], ["Veneza Supermercados", false],
    ["Bonanza Supermercados", false], ["Supermercado da Família", false], ["KarneKeijo", false],
    ["Rende Mais Supermercados", false], ["Recibom", false], ["Supermercados Melodia", false],
    ["Fênix Supermercados", false], ["Econômico Supermercados", false], ["Boas Compras", false],
    ["Mercadinho D. Helder", false], ["Trevo Supermercados", false],
    ["Supermercado Pernambucano", false], ["MP Supermercado", false],
    ["Supermercado Campeão", false], ["Supermercado La Roque", false],
    ["J&A Supermercado", false], ["Costa e Souza Supermercados", false],
    ["Lealdade Supermercados", false], ["O Supermercado da Carne", false],
    ["Verde Frut", false], ["GBarbosa", false]
].map(([nome, coletaPublica]) => ({
    nome,
    coletaPublica,
    situacao: coletaPublica ? "Preço público disponível" : "Endereço disponível; aguardando fonte pública"
}));

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const ler = (chave, padrao) => {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch (_erro) { return padrao; }
};

const produtos = ler("produtos", []);
const usuario = ler("usuarioAtual", ler("usuarioLogado", {}));
const localizacaoEstado = {
    tentada: false,
    posicao: null,
    filiais: [],
    carregando: null,
    erro: ""
};
const itens = (Array.isArray(produtos) ? produtos : []).slice(0, 80).map(produto => ({
    nome: String(produto.nome || "").trim(),
    quantidade: Math.max(0.01, Number(produto.peso) > 0 ? Number(produto.peso) : Number(produto.quantidade) || 1)
})).filter(item => item.nome);

document.getElementById("quantidadeItensComparacao").textContent = String(itens.length);
document.getElementById("cidadeComparacao").value = usuario?.cidade || "";

async function carregarRedes() {
    renderizarRedes(REDES_PADRAO);
    try {
        const resposta = await api.get("/comparacoes/redes");
        if (Array.isArray(resposta) && resposta.length) {
            const porNome = new Map(REDES_PADRAO.map(rede => [normalizarTextoLocalizacao(rede.nome), rede]));
            resposta.forEach(rede => porNome.set(normalizarTextoLocalizacao(rede.nome), rede));
            renderizarRedes(Array.from(porNome.values()));
        }
    } catch (_erro) {
        // A lista local mantém a tela utilizável enquanto o servidor inicia.
    }
}

function renderizarRedes(redes) {
    document.getElementById("redesComparacao").innerHTML = redes.map(rede => `
        <label class="rede-opcao ${rede.coletaPublica ? "disponivel" : "aguardando"}">
            <input type="checkbox" name="mercados" value="${escapar(rede.nome)}" checked>
            <span><strong>${escapar(rede.nome)}</strong><small>${escapar(rede.situacao)}</small></span>
        </label>
    `).join("");
}

function adicionarMercadosDescobertos(filiais) {
    const container = document.getElementById("redesComparacao");
    const existentes = new Set(
        Array.from(container.querySelectorAll('input[name="mercados"]'))
            .map(campo => normalizarTextoLocalizacao(campo.value))
    );
    const nomes = filiais
        .sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity))
        .map(filial => filial.nome.trim())
        .filter(nome => {
            const chave = normalizarTextoLocalizacao(nome);
            if (!chave || existentes.has(chave)) return false;
            existentes.add(chave);
            return true;
        })
        .slice(0, 30);
    container.insertAdjacentHTML("beforeend", nomes.map(nome => `
        <label class="rede-opcao aguardando descoberta-local">
            <input type="checkbox" name="mercados" value="${escapar(nome)}" checked>
            <span><strong>${escapar(nome)}</strong><small>Mercado próximo; aguardando preço público</small></span>
        </label>
    `).join(""));
}

function atualizarStatusLocalizacao(texto) {
    document.getElementById("statusLocalizacao").textContent = texto;
}

function renderizarEnderecos() {
    document.querySelectorAll("[data-endereco-mercado]").forEach(elemento => {
        if (localizacaoEstado.carregando) {
            elemento.className = "endereco-mercado carregando";
            elemento.textContent = "Localizando a filial mais próxima...";
            return;
        }
        if (!localizacaoEstado.posicao) {
            elemento.className = "endereco-mercado erro";
            elemento.textContent = localizacaoEstado.erro || "Ative sua localização para ver a filial mais próxima.";
            return;
        }
        const filial = encontrarFilialMaisProxima(elemento.dataset.enderecoMercado, localizacaoEstado.filiais);
        if (!filial) {
            elemento.className = "endereco-mercado erro";
            elemento.textContent = "Nenhuma filial correspondente foi localizada em até 25 km.";
            return;
        }
        elemento.className = "endereco-mercado";
        elemento.innerHTML = `
            <strong>📍 ${escapar(filial.nome)} · ${filial.distanciaKm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong>
            <span>${escapar(filial.endereco || [filial.cidade, filial.estado].filter(Boolean).join(" - ") || "Endereço incompleto no mapa")}</span>
            <small>Filial mais próxima. O preço pode variar por loja.</small>
            <a href="${escapar(filial.urlMapa)}" target="_blank" rel="noopener noreferrer">Abrir no mapa</a>
        `;
    });
}

async function ativarLocalizacao() {
    if (localizacaoEstado.carregando) return localizacaoEstado.carregando;
    if (localizacaoEstado.posicao && localizacaoEstado.filiais.length) return localizacaoEstado;
    const botao = document.getElementById("usarMinhaLocalizacao");
    localizacaoEstado.tentada = true;
    localizacaoEstado.erro = "";
    botao.disabled = true;
    botao.textContent = "Localizando...";
    atualizarStatusLocalizacao("Aguardando sua permissão...");
    localizacaoEstado.carregando = (async () => {
        try {
            localizacaoEstado.posicao = await obterLocalizacaoUsuario();
            atualizarStatusLocalizacao("Buscando mercados próximos...");
            localizacaoEstado.filiais = await consultarFiliaisProximas(localizacaoEstado.posicao);
            adicionarMercadosDescobertos(localizacaoEstado.filiais);
            const cidade = cidadeMaisProvavel(localizacaoEstado.filiais);
            const campoCidade = document.getElementById("cidadeComparacao");
            if (cidade && !campoCidade.value.trim()) campoCidade.value = cidade;
            atualizarStatusLocalizacao(`${localizacaoEstado.filiais.length} mercado(s) próximo(s) localizado(s).`);
            renderizarEnderecos();
            return localizacaoEstado;
        } catch (erro) {
            localizacaoEstado.erro = erro.message || "Não foi possível usar sua localização.";
            atualizarStatusLocalizacao(localizacaoEstado.erro);
            renderizarEnderecos();
            return localizacaoEstado;
        } finally {
            localizacaoEstado.carregando = null;
            botao.disabled = false;
            botao.textContent = localizacaoEstado.posicao ? "📍 Localização ativada" : "📍 Tentar novamente";
        }
    })();
    return localizacaoEstado.carregando;
}

document.getElementById("usarMinhaLocalizacao").addEventListener("click", ativarLocalizacao);

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
    if (!itens.length) return mensagem("Adicione itens à lista antes de comparar.", true);
    if (!localizacaoEstado.tentada) await ativarLocalizacao();
    const mercados = selecionados();
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
            <div class="endereco-mercado ${localizacaoEstado.carregando ? "carregando" : "erro"}" data-endereco-mercado="${escapar(mercado.mercado)}">
                ${localizacaoEstado.carregando ? "Localizando a filial mais próxima..." : "Ative sua localização para ver a filial mais próxima."}
            </div>
            <p>${escapar(mercado.situacao)}</p>
            ${detalhes ? `<details><summary>Ver ${mercado.itensEncontrados} preço(s) encontrado(s)</summary><div class="tabela-precos"><table><thead><tr><th>Item</th><th>Qtd.</th><th>Preço</th><th>Subtotal</th></tr></thead><tbody>${detalhes}</tbody></table></div></details>` : ""}
        </article>`;
    }).join("") || "<p>Nenhum preço foi encontrado.</p>";
    secao.hidden = false;
    renderizarEnderecos();
    secao.scrollIntoView({ behavior: "smooth", block: "start" });
}

carregarRedes();

