import { api, ApiError } from "./api.js";
import { estaAutenticado, usuarioAtual } from "./auth.js";

const porId = id => document.getElementById(id);
const estado = { paginaProdutos: 0, paginaObservacoes: 0, categorias: [], produtoAberto: null };
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const moeda = valor => valor == null ? "—" : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const data = valor => valor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor)) : "—";
const origem = valor => ({ COMPRA_USUARIO: "Compra de usuário", SCRAPING: "Scraping", API: "API", IMPORTACAO: "Importação" }[valor] || valor || "—");

function garantirAdmin() {
    if (!estaAutenticado()) {
        location.replace("../login.html");
        return false;
    }
    const usuario = usuarioAtual();
    if (usuario && String(usuario.perfil || usuario.role || "").toUpperCase() !== "ADMIN") {
        location.replace("../inicio.html");
        return false;
    }
    return true;
}

function montarConsulta(pagina) {
    const params = new URLSearchParams({ pagina: String(pagina), tamanho: "20" });
    const campos = {
        busca: porId("filtroBusca").value.trim(),
        categoria: porId("filtroCategoria").value,
        estado: porId("filtroEstado").value,
        cidade: porId("filtroCidade").value,
        mercado: porId("filtroMercado").value,
        origem: porId("filtroOrigem").value
    };
    Object.entries(campos).forEach(([chave, valor]) => { if (valor) params.set(chave, valor); });
    const inicio = porId("filtroInicio").value;
    const fim = porId("filtroFim").value;
    if (inicio) params.set("inicio", new Date(`${inicio}T00:00:00`).toISOString());
    if (fim) params.set("fim", new Date(`${fim}T23:59:59.999`).toISOString());
    return params.toString();
}

function preencherSelect(id, valores, rotulos = {}) {
    const seletor = porId(id);
    const primeira = seletor.options[0]?.outerHTML || '<option value="">Todos</option>';
    seletor.innerHTML = primeira + valores.map(valor => `<option value="${escapar(valor)}">${escapar(rotulos[valor] || valor)}</option>`).join("");
}

async function carregarFiltros() {
    const filtros = await api.get("/admin/coleta-precos/filtros");
    estado.categorias = filtros.categorias || [];
    preencherSelect("filtroCategoria", estado.categorias);
    preencherSelect("filtroEstado", filtros.estados || []);
    preencherSelect("filtroCidade", filtros.cidades || []);
    preencherSelect("filtroMercado", filtros.mercados || []);
    preencherSelect("filtroOrigem", filtros.origens || [], { COMPRA_USUARIO: "Compra de usuário", SCRAPING: "Scraping", API: "API", IMPORTACAO: "Importação" });
    preencherSelect("detalheCategoria", estado.categorias);
}

async function carregarResumo() {
    const resumo = await api.get("/admin/coleta-precos/resumo");
    porId("totalProdutos").textContent = resumo.totalProdutos || 0;
    porId("totalObservacoes").textContent = resumo.totalObservacoes || 0;
    porId("totalMercados").textContent = resumo.totalMercados || 0;
    porId("totalEstados").textContent = resumo.totalEstados || 0;
}

async function carregarProdutos() {
    const resposta = await api.get(`/admin/coleta-precos/produtos?${montarConsulta(estado.paginaProdutos)}`);
    porId("resumoProdutos").textContent = `${resposta.totalElementos || 0} produto(s) encontrado(s)`;
    porId("paginaProdutos").textContent = `Página ${(resposta.pagina || 0) + 1} de ${Math.max(1, resposta.totalPaginas || 0)}`;
    porId("produtosAnterior").disabled = !resposta.temAnterior;
    porId("produtosProxima").disabled = !resposta.temProxima;
    porId("tabelaProdutos").innerHTML = (resposta.conteudo || []).map(item => `
        <tr>
            <td><strong>${escapar(item.nome)}</strong><small>${escapar(item.nomeNormalizado)}</small></td>
            <td>${escapar(item.categoria)}</td><td>${item.totalObservacoes}</td><td>${moeda(item.precoMedio)}</td>
            <td>${moeda(item.precoMinimo)} – ${moeda(item.precoMaximo)}</td><td>${data(item.ultimaCompraEm)}</td>
            <td><button class="btn btn-secondary" type="button" data-detalhar-produto="${escapar(item.id)}">Detalhes</button></td>
        </tr>`).join("") || '<tr><td colspan="7" class="coleta-vazio">Nenhum produto para os filtros selecionados.</td></tr>';
}

async function carregarObservacoes() {
    const resposta = await api.get(`/admin/coleta-precos/observacoes?${montarConsulta(estado.paginaObservacoes)}`);
    porId("resumoObservacoes").textContent = `${resposta.totalElementos || 0} registro(s) histórico(s)`;
    porId("paginaObservacoes").textContent = `Página ${(resposta.pagina || 0) + 1} de ${Math.max(1, resposta.totalPaginas || 0)}`;
    porId("observacoesAnterior").disabled = !resposta.temAnterior;
    porId("observacoesProxima").disabled = !resposta.temProxima;
    porId("tabelaObservacoes").innerHTML = (resposta.conteudo || []).map(item => `
        <tr><td>${data(item.realizadaEm)}</td><td><strong>${escapar(item.produto)}</strong><small>${escapar(item.categoria)}</small></td>
        <td>${Number(item.quantidade).toLocaleString("pt-BR")} ${escapar(item.unidade)}</td><td>${moeda(item.precoUnitario)}</td><td>${moeda(item.subtotal)}</td>
        <td>${escapar(item.mercado || "Não informado")}</td><td>${escapar([item.cidade, item.estado].filter(Boolean).join("/ ") || "Não informada")}</td><td><span class="coleta-origem">${escapar(origem(item.origem))}</span></td></tr>`).join("") || '<tr><td colspan="8" class="coleta-vazio">Nenhuma observação para os filtros selecionados.</td></tr>';
}

function renderizarAnalise(id, dados) {
    porId(id).innerHTML = dados.slice(0, 20).map(item => `<tr><td>${escapar(item.nome)}</td><td>${item.totalObservacoes}</td><td>${moeda(item.precoMedio)}</td></tr>`).join("") || '<tr><td colspan="3" class="coleta-vazio">Sem dados.</td></tr>';
}

async function carregarAnalises() {
    const [estados, mercados] = await Promise.all([
        api.get("/admin/coleta-precos/analises/estados"),
        api.get("/admin/coleta-precos/analises/mercados")
    ]);
    renderizarAnalise("analiseEstados", estados || []);
    renderizarAnalise("analiseMercados", mercados || []);
}

function renderizarGrafico(observacoes) {
    const dados = [...observacoes].reverse().slice(-30);
    const maximo = Math.max(...dados.map(item => Number(item.precoUnitario) || 0), 1);
    porId("graficoEvolucao").innerHTML = dados.map(item => {
        const altura = Math.max(3, Math.round((Number(item.precoUnitario) / maximo) * 85));
        return `<div class="coleta-grafico-barra" style="--altura:${altura}%" title="${escapar(data(item.realizadaEm))}: ${escapar(moeda(item.precoUnitario))}"><span>${escapar(moeda(item.precoUnitario))}</span></div>`;
    }).join("") || '<p class="coleta-vazio">Ainda não há evolução suficiente.</p>';
}

async function abrirDetalhe(id) {
    const resposta = await api.get(`/admin/coleta-precos/produtos/${id}`);
    estado.produtoAberto = resposta.produto;
    porId("detalheNome").textContent = resposta.produto.nome;
    porId("detalheResumo").textContent = `${resposta.produto.totalObservacoes} coleta(s) · média ${moeda(resposta.produto.precoMedio)}`;
    porId("detalheCategoria").value = resposta.produto.categoria;
    renderizarGrafico(resposta.observacoesRecentes || []);
    porId("detalheObservacoes").innerHTML = (resposta.observacoesRecentes || []).slice(0, 30).map(item => `<tr><td>${data(item.realizadaEm)}</td><td>${moeda(item.precoUnitario)}</td><td>${escapar(item.mercado || "Não informado")}</td><td>${escapar([item.cidade, item.estado].filter(Boolean).join("/ ") || "Não informada")}</td><td>${escapar(origem(item.origem))}</td></tr>`).join("");
    porId("detalheProduto").hidden = false;
    porId("detalheProduto").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function corrigirCategoria() {
    if (!estado.produtoAberto) return;
    const produto = await api.patch(`/admin/coleta-precos/produtos/${estado.produtoAberto.id}/categoria`, { categoria: porId("detalheCategoria").value });
    estado.produtoAberto = produto;
    await carregarProdutos();
}

function exibirErro(erro) {
    const mensagem = erro instanceof ApiError ? erro.message : "Não foi possível carregar a coleta de preços.";
    porId("tabelaProdutos").innerHTML = `<tr><td colspan="7" class="coleta-vazio">${escapar(mensagem)}</td></tr>`;
    porId("tabelaObservacoes").innerHTML = `<tr><td colspan="8" class="coleta-vazio">${escapar(mensagem)}</td></tr>`;
}

async function carregarTudo() {
    const botao = porId("atualizarPrecos");
    botao.disabled = true;
    try {
        await Promise.all([carregarResumo(), carregarProdutos(), carregarObservacoes(), carregarAnalises()]);
    } catch (erro) {
        exibirErro(erro);
    } finally {
        botao.disabled = false;
    }
}

porId("formFiltros").addEventListener("submit", evento => { evento.preventDefault(); estado.paginaProdutos = 0; estado.paginaObservacoes = 0; carregarTudo(); });
porId("limparFiltros").addEventListener("click", () => { porId("formFiltros").reset(); estado.paginaProdutos = 0; estado.paginaObservacoes = 0; carregarTudo(); });
porId("atualizarPrecos").addEventListener("click", carregarTudo);
porId("produtosAnterior").addEventListener("click", () => { estado.paginaProdutos -= 1; carregarProdutos(); });
porId("produtosProxima").addEventListener("click", () => { estado.paginaProdutos += 1; carregarProdutos(); });
porId("observacoesAnterior").addEventListener("click", () => { estado.paginaObservacoes -= 1; carregarObservacoes(); });
porId("observacoesProxima").addEventListener("click", () => { estado.paginaObservacoes += 1; carregarObservacoes(); });
porId("tabelaProdutos").addEventListener("click", evento => { const botao = evento.target.closest("[data-detalhar-produto]"); if (botao) abrirDetalhe(botao.dataset.detalharProduto); });
porId("fecharDetalhe").addEventListener("click", () => { porId("detalheProduto").hidden = true; estado.produtoAberto = null; });
porId("detalheCategoria").addEventListener("change", corrigirCategoria);

if (garantirAdmin()) {
    carregarFiltros().then(carregarTudo).catch(exibirErro);
}
