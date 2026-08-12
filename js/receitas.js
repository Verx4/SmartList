import { api } from "./api.js";
import {
    avaliarReceita,
    criarInventario,
    filtrarEOrdenarReceitas,
    formatarQuantidade,
    ingredientesDoTexto,
    normalizarIngrediente,
    proximoPasso,
    rotuloCategoria
} from "./receitas-core.js?v=2";
import {
    adicionarItemDespensa,
    atualizarItemDespensa,
    carregarDespensaRemota,
    descontarReceitaDaDespensa,
    listarDespensa,
    removerItemDespensa
} from "./despensa.js?v=2";
import {
    adicionarProduto,
    atualizarProduto,
    listarProdutos
} from "./produtos.js";

const estado = {
    receitas: [],
    ingredientesManuais: [],
    categoria: "todas",
    tipo: "todas",
    tempo: "todos",
    busca: "",
    somenteDisponiveis: false,
    receitaAtual: null,
    avaliacaoAtual: null,
    passoAtual: 0,
    favoritos: new Set()
};

const porId = id => document.getElementById(id);
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function usuarioAtual() {
    for (const chave of ["usuarioAtual", "usuarioLogado"]) {
        try {
            const usuario = JSON.parse(localStorage.getItem(chave));
            if (usuario) return usuario;
        } catch {
            // Usa uma sessão local anônima.
        }
    }
    return null;
}

function sufixoUsuario() {
    const usuario = usuarioAtual();
    return String(usuario?.id || usuario?.email || "anonimo").toLocaleLowerCase("pt-BR");
}

function chaveFavoritos() {
    return `smartListReceitasFavoritas:${sufixoUsuario()}`;
}

function chaveHistorico() {
    return `smartListReceitasPreparadas:${sufixoUsuario()}`;
}

function lerFavoritos() {
    try {
        const dados = JSON.parse(localStorage.getItem(chaveFavoritos()));
        return new Set(Array.isArray(dados) ? dados : []);
    } catch {
        return new Set();
    }
}

function inventarioAtual() {
    return criarInventario(listarDespensa(), estado.ingredientesManuais);
}

function mensagem(texto, erro = false) {
    const elemento = porId("mensagemReceitas");
    elemento.textContent = texto || "";
    elemento.classList.toggle("erro", erro);
}

function filtrosAtuais() {
    return {
        busca: estado.busca,
        categoria: estado.categoria,
        tipo: estado.tipo,
        tempo: estado.tempo,
        somenteDisponiveis: estado.somenteDisponiveis
    };
}

function textoCompatibilidade(resultado) {
    if (resultado.podeFazer) {
        return '<span class="completa">✓ Você possui tudo</span>';
    }
    const rotuloIngredientes = resultado.tem === 1 ? "ingrediente" : "ingredientes";
    const rotuloFaltantes = resultado.faltantes.length === 1 ? "ingrediente" : "ingredientes";
    return `<span class="possui">✓ Você tem ${resultado.tem} de ${resultado.total} ${rotuloIngredientes}</span>
        <span class="falta">⚠ Faltam ${resultado.faltantes.length} ${rotuloFaltantes}</span>`;
}

function cartaoReceita(resultado) {
    const receita = resultado.receita;
    const favorita = estado.favoritos.has(receita.id);
    return `<article class="receita-card" data-receita-id="${escapar(receita.id)}" tabindex="0" role="button" aria-label="Abrir receita ${escapar(receita.nome)}">
        <div class="receita-card-topo">
            <span class="receita-card-icone" aria-hidden="true">${escapar(receita.icone || "◇")}</span>
            <button class="favoritar-card ${favorita ? "ativo" : ""}" type="button" data-favoritar="${escapar(receita.id)}" aria-label="${favorita ? "Remover dos favoritos" : "Favoritar receita"}" aria-pressed="${favorita}">${favorita ? "♥" : "♡"}</button>
        </div>
        <h3>${escapar(receita.nome)}</h3>
        <div class="receita-card-meta"><span>◷ ${receita.tempoMinutos} min</span><span>•</span><span>${escapar(rotuloCategoria(receita.categoria))}</span><span>•</span><span>${escapar(receita.tipo)}</span></div>
        <div class="receita-compatibilidade">${textoCompatibilidade(resultado)}</div>
    </article>`;
}

function renderizarResultados() {
    const resultados = filtrarEOrdenarReceitas(estado.receitas, inventarioAtual(), filtrosAtuais());
    porId("listaReceitas").innerHTML = resultados.map(cartaoReceita).join("")
        || '<p class="estado-vazio">Nenhuma receita corresponde a estes filtros.</p>';
    porId("resumoResultados").textContent = resultados.length === 1
        ? "1 receita encontrada"
        : `${resultados.length} receitas encontradas`;
    renderizarFavoritas();
    atualizarResumoDespensa();
}

function renderizarFavoritas() {
    const favoritas = estado.receitas
        .filter(receita => estado.favoritos.has(receita.id))
        .map(receita => avaliarReceita(receita, inventarioAtual()));
    porId("favoritasSecao").hidden = favoritas.length === 0;
    porId("listaFavoritas").innerHTML = favoritas.map(cartaoReceita).join("");
    porId("totalFavoritas").textContent = favoritas.length === 1 ? "1 favorita" : `${favoritas.length} favoritas`;
}

function atualizarResumoDespensa() {
    const itens = listarDespensa().filter(item => item.quantidade > 0);
    porId("quantidadeDespensa").textContent = itens.length === 1 ? "1 item" : `${itens.length} itens`;
}

async function alternarFavorito(id) {
    const adicionar = !estado.favoritos.has(id);
    if (adicionar) estado.favoritos.add(id);
    else estado.favoritos.delete(id);
    localStorage.setItem(chaveFavoritos(), JSON.stringify([...estado.favoritos]));
    try {
        if (adicionar) await api.post(`/receitas/${id}/favorito`, {});
        else await api.delete(`/receitas/${id}/favorito`);
    } catch {
        // O favorito local permanece disponível sem conexão.
    }
    renderizarResultados();
    if (estado.receitaAtual?.id === id) atualizarBotaoFavoritoDetalhe();
}

function atualizarBotaoFavoritoDetalhe() {
    const favorita = estado.favoritos.has(estado.receitaAtual?.id);
    porId("favoritarDetalhe").textContent = favorita ? "♥" : "♡";
    porId("favoritarDetalhe").setAttribute("aria-pressed", String(favorita));
    porId("favoritarDetalhe").setAttribute("aria-label", favorita ? "Remover dos favoritos" : "Favoritar receita");
}

function abrirDetalhe(id) {
    const receita = estado.receitas.find(item => item.id === id);
    if (!receita) return;
    estado.receitaAtual = receita;
    estado.avaliacaoAtual = avaliarReceita(receita, inventarioAtual());
    estado.passoAtual = 0;

    porId("iconeReceitaDetalhe").textContent = receita.icone || "◇";
    porId("categoriaReceitaDetalhe").textContent = `${rotuloCategoria(receita.categoria).toUpperCase()} • ${receita.tipo.toUpperCase()}`;
    porId("nomeReceitaDetalhe").textContent = receita.nome;
    porId("descricaoReceitaDetalhe").textContent = receita.descricao;
    porId("tempoReceitaDetalhe").textContent = `${receita.tempoMinutos} minutos`;
    porId("rendimentoReceitaDetalhe").textContent = receita.rendimento;
    porId("dificuldadeReceitaDetalhe").textContent = receita.dificuldade;
    porId("categoriaMetricaReceita").textContent = rotuloCategoria(receita.categoria);
    renderizarIngredientesDetalhe();
    renderizarPasso();
    atualizarBotaoFavoritoDetalhe();

    porId("receitasConteudo").hidden = true;
    porId("receitaDetalhe").hidden = false;
    document.body.classList.add("detalhe-aberto");
    history.replaceState(null, "", `#receita=${encodeURIComponent(receita.id)}`);
    porId("receitaDetalhe").scrollTop = 0;
}

function fecharDetalhe() {
    porId("receitaDetalhe").hidden = true;
    porId("receitasConteudo").hidden = false;
    document.body.classList.remove("detalhe-aberto");
    history.replaceState(null, "", location.pathname + location.search);
    estado.receitaAtual = null;
    estado.avaliacaoAtual = null;
}

function formatarDisponivel(item) {
    if (estado.ingredientesManuais.some(nome => normalizarIngrediente(nome) === normalizarIngrediente(item.nome))) {
        return "Informado por você";
    }
    return item.disponivel > 0
        ? `Disponível: ${formatarQuantidade(item.disponivel, item.unidadeCanonica)}`
        : "Não disponível";
}

function renderizarIngredientesDetalhe() {
    const avaliacao = avaliarReceita(estado.receitaAtual, inventarioAtual());
    estado.avaliacaoAtual = avaliacao;
    porId("compatibilidadeDetalhe").textContent = avaliacao.podeFazer
        ? "Você possui tudo"
        : `${avaliacao.tem} de ${avaliacao.total} disponíveis`;
    porId("itensNecessarios").innerHTML = avaliacao.itens.map(item => `<div class="item-necessario ${item.suficiente ? "disponivel" : ""}">
        <span class="estado-ingrediente" aria-hidden="true">${item.suficiente ? "✓" : "○"}</span>
        <div><strong>${escapar(item.nome)}</strong><small>${item.basico ? "Item básico / opcional" : formatarDisponivel(item)}</small></div>
        <strong>${escapar(formatarQuantidade(item.quantidade, item.unidade))}</strong>
    </div>`).join("");
    porId("faltantesBloco").hidden = avaliacao.faltantes.length === 0;
    porId("itensFaltantes").innerHTML = avaliacao.faltantes.map(item => `<div class="item-faltante">
        <span class="estado-ingrediente" aria-hidden="true">○</span>
        <div><strong>${escapar(item.nome)}</strong><small>Necessário: ${escapar(formatarQuantidade(item.quantidadeCanonica, item.unidadeCanonica))} · Disponível: ${escapar(formatarQuantidade(item.disponivel, item.unidadeCanonica))}</small></div>
        <strong>Faltam ${escapar(formatarQuantidade(item.falta, item.unidadeCanonica))}</strong>
    </div>`).join("");
    porId("adicionarFaltantes").hidden = avaliacao.faltantes.length === 0;
}

function renderizarPasso() {
    const passos = estado.receitaAtual?.passos || [];
    if (!passos.length) return;
    const passo = passos[estado.passoAtual];
    porId("numeroPasso").textContent = `Passo ${estado.passoAtual + 1} de ${passos.length}`;
    porId("barraPasso").style.width = `${((estado.passoAtual + 1) / passos.length) * 100}%`;
    porId("passoAtual").innerHTML = `<h3>${escapar(passo.titulo)}</h3><p>${escapar(passo.descricao)}</p>`;
    porId("indicadoresPassos").innerHTML = passos.map((_, indice) => `<button type="button" data-passo="${indice}" class="${indice < estado.passoAtual ? "concluido" : ""} ${indice === estado.passoAtual ? "ativo" : ""}" aria-label="Ir para o passo ${indice + 1}"></button>`).join("");
    porId("passoAnterior").disabled = estado.passoAtual === 0;
    porId("cozinhaAnterior").disabled = estado.passoAtual === 0;
    const ultimo = estado.passoAtual === passos.length - 1;
    porId("proximoPasso").textContent = ultimo ? "Passo concluído" : "Próximo passo";
    porId("cozinhaProximo").textContent = ultimo ? "Passo concluído" : "Próximo passo";
    atualizarModoCozinha();
}

function moverPasso(direcao) {
    const total = estado.receitaAtual?.passos?.length || 0;
    estado.passoAtual = proximoPasso(estado.passoAtual, total, direcao);
    renderizarPasso();
}

function atualizarModoCozinha() {
    if (!estado.receitaAtual) return;
    const passo = estado.receitaAtual.passos[estado.passoAtual];
    porId("nomeModoCozinha").textContent = estado.receitaAtual.nome;
    porId("numeroModoCozinha").textContent = `Passo ${estado.passoAtual + 1} de ${estado.receitaAtual.passos.length}`;
    porId("tituloModoCozinha").textContent = passo.titulo;
    porId("descricaoModoCozinha").textContent = passo.descricao;
    porId("ingredientesModoCozinha").textContent = estado.receitaAtual.ingredientes
        .filter(item => item.obrigatorio && !item.basico)
        .map(item => `${item.nome} — ${formatarQuantidade(item.quantidade, item.unidade)}`)
        .join(" · ");
}

function abrirModoCozinha() {
    atualizarModoCozinha();
    porId("modoCozinha").hidden = false;
    document.body.style.overflow = "hidden";
}

function fecharModoCozinha() {
    porId("modoCozinha").hidden = true;
    document.body.style.removeProperty("overflow");
}

function produtoParaFalta(falta) {
    if (falta.unidadeCanonica === "g") {
        return { medida: "kg", peso: falta.falta / 1000, quantidade: 0 };
    }
    return { medida: "unidade", peso: 0, quantidade: Math.max(1, Math.ceil(falta.falta)) };
}

async function adicionarFaltantesALista() {
    const faltantes = estado.avaliacaoAtual?.faltantes || [];
    if (!faltantes.length) return;
    for (const falta of faltantes) {
        const produtos = listarProdutos();
        const existente = produtos.find(produto => normalizarIngrediente(produto.nome) === normalizarIngrediente(falta.nome));
        const dados = produtoParaFalta(falta);
        if (existente) {
            if (dados.medida === "kg") {
                atualizarProduto(existente.id, { peso: Math.max(0, Number(existente.peso) || 0) + dados.peso });
            } else {
                const precos = [...existente.precos];
                precos[0] = { ...precos[0], quantidade: (Number(precos[0]?.quantidade) || 0) + dados.quantidade };
                atualizarProduto(existente.id, { precos });
            }
        } else {
            adicionarProduto({
                nome: falta.nome,
                categoria: "📦 Outros",
                medida: dados.medida,
                peso: dados.peso,
                precos: [{ valor: 0, quantidade: dados.quantidade }],
                favorito: false
            });
        }
    }
    try {
        await api.post(`/receitas/${estado.receitaAtual.id}/faltantes/lista`, {});
    } catch {
        // A lista local já recebeu os ingredientes.
    }
    mensagem(`${faltantes.length} ${faltantes.length === 1 ? "item foi adicionado" : "itens foram adicionados"} à sua lista.`);
    porId("adicionarFaltantes").textContent = "Itens adicionados à lista ✓";
    window.setTimeout(() => { porId("adicionarFaltantes").textContent = "Adicionar itens que faltam à lista"; }, 2500);
}

function abrirDespensa() {
    renderizarDespensa();
    porId("despensaDialog").showModal();
}

function renderizarDespensa() {
    const itens = listarDespensa();
    porId("listaDespensa").innerHTML = itens.length
        ? itens.map(item => `<div class="item-despensa" data-despensa-id="${escapar(item.id)}">
            <span aria-hidden="true">✓</span>
            <div><strong>${escapar(item.nome)}</strong><small>${escapar(item.unidade)}</small></div>
            <div class="item-despensa-controles"><input data-quantidade-despensa="${escapar(item.id)}" type="number" min="0" step="0.001" value="${Number(item.quantidade)}" aria-label="Quantidade de ${escapar(item.nome)}"><button type="button" data-remover-despensa="${escapar(item.id)}" aria-label="Remover ${escapar(item.nome)}">×</button></div>
        </div>`).join("")
        : '<p class="estado-vazio">Sua despensa está vazia. Finalize uma compra ou adicione um item.</p>';
    atualizarResumoDespensa();
}

function registrarHistoricoReceita(atualizouDespensa) {
    let historico = [];
    try {
        historico = JSON.parse(localStorage.getItem(chaveHistorico())) || [];
    } catch {
        historico = [];
    }
    historico.unshift({
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
        receitaId: estado.receitaAtual.id,
        nome: estado.receitaAtual.nome,
        preparadaEm: new Date().toISOString(),
        despensaAtualizada: atualizouDespensa
    });
    localStorage.setItem(chaveHistorico(), JSON.stringify(historico));
}

async function concluirReceita(atualizarDespensa) {
    if (atualizarDespensa) {
        descontarReceitaDaDespensa(estado.receitaAtual.ingredientes);
    }
    registrarHistoricoReceita(atualizarDespensa);
    try {
        await api.post(`/receitas/${estado.receitaAtual.id}/finalizar`, { atualizarDespensa });
    } catch {
        // O histórico e a despensa locais já foram atualizados.
    }
    porId("finalizarDialog").close();
    renderizarIngredientesDetalhe();
    renderizarResultados();
    mensagem(atualizarDespensa ? "Receita finalizada e despensa atualizada." : "Receita finalizada sem alterar a despensa.");
}

function configurarEventos() {
    porId("formBuscaReceitas").addEventListener("submit", evento => {
        evento.preventDefault();
        estado.busca = porId("buscaReceitas").value.trim();
        renderizarResultados();
    });
    porId("buscaReceitas").addEventListener("input", evento => {
        estado.busca = evento.target.value.trim();
        renderizarResultados();
    });
    porId("formIngredientes").addEventListener("submit", evento => {
        evento.preventDefault();
        estado.ingredientesManuais = ingredientesDoTexto(porId("ingredientesManuais").value);
        mensagem(estado.ingredientesManuais.length ? "Receitas reordenadas com os ingredientes informados." : "Digite pelo menos um ingrediente.");
        renderizarResultados();
        porId("tituloResultados").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    document.querySelectorAll("[data-categoria]").forEach(botao => botao.addEventListener("click", () => {
        document.querySelectorAll("[data-categoria]").forEach(item => item.classList.remove("ativo"));
        botao.classList.add("ativo");
        estado.categoria = botao.dataset.categoria;
        renderizarResultados();
    }));
    document.querySelectorAll("[data-tipo]").forEach(botao => botao.addEventListener("click", () => {
        document.querySelectorAll("[data-tipo]").forEach(item => item.classList.remove("ativo"));
        botao.classList.add("ativo");
        estado.tipo = botao.dataset.tipo;
        renderizarResultados();
    }));
    porId("filtroTempo").addEventListener("change", evento => { estado.tempo = evento.target.value; renderizarResultados(); });
    porId("somenteDisponiveis").addEventListener("change", evento => { estado.somenteDisponiveis = evento.target.checked; renderizarResultados(); });
    porId("limparFiltros").addEventListener("click", () => {
        estado.categoria = "todas";
        estado.tipo = "todas";
        estado.tempo = "todos";
        estado.busca = "";
        estado.somenteDisponiveis = false;
        porId("buscaReceitas").value = "";
        porId("filtroTempo").value = "todos";
        porId("somenteDisponiveis").checked = false;
        document.querySelectorAll("[data-categoria], [data-tipo]").forEach(botao => botao.classList.toggle("ativo", botao.dataset.categoria === "todas" || botao.dataset.tipo === "todas"));
        renderizarResultados();
    });

    document.addEventListener("click", evento => {
        const favoritar = evento.target.closest("[data-favoritar]");
        if (favoritar) {
            evento.stopPropagation();
            alternarFavorito(favoritar.dataset.favoritar);
            return;
        }
        const card = evento.target.closest("[data-receita-id]");
        if (card) abrirDetalhe(card.dataset.receitaId);
    });
    document.addEventListener("keydown", evento => {
        if ((evento.key === "Enter" || evento.key === " ") && evento.target.matches("[data-receita-id]")) {
            evento.preventDefault();
            abrirDetalhe(evento.target.dataset.receitaId);
        }
    });

    porId("fecharDetalhe").addEventListener("click", fecharDetalhe);
    porId("favoritarDetalhe").addEventListener("click", () => alternarFavorito(estado.receitaAtual.id));
    porId("passoAnterior").addEventListener("click", () => moverPasso(-1));
    porId("proximoPasso").addEventListener("click", () => moverPasso(1));
    porId("indicadoresPassos").addEventListener("click", evento => {
        const botao = evento.target.closest("[data-passo]");
        if (!botao) return;
        estado.passoAtual = Number(botao.dataset.passo);
        renderizarPasso();
    });
    porId("iniciarModoCozinha").addEventListener("click", abrirModoCozinha);
    porId("fecharModoCozinha").addEventListener("click", fecharModoCozinha);
    porId("cozinhaAnterior").addEventListener("click", () => moverPasso(-1));
    porId("cozinhaProximo").addEventListener("click", () => moverPasso(1));
    porId("adicionarFaltantes").addEventListener("click", adicionarFaltantesALista);
    porId("finalizarReceita").addEventListener("click", () => porId("finalizarDialog").showModal());
    porId("confirmarAtualizarDespensa").addEventListener("click", () => concluirReceita(true));
    porId("naoAtualizarDespensa").addEventListener("click", () => concluirReceita(false));

    porId("abrirDespensa").addEventListener("click", abrirDespensa);
    porId("abrirDespensaTopo").addEventListener("click", abrirDespensa);
    porId("formNovoItemDespensa").addEventListener("submit", evento => {
        evento.preventDefault();
        adicionarItemDespensa({
            nome: porId("nomeItemDespensa").value.trim(),
            quantidade: Number(porId("quantidadeItemDespensa").value),
            unidade: porId("unidadeItemDespensa").value
        });
        evento.target.reset();
        porId("quantidadeItemDespensa").value = "1";
        renderizarDespensa();
        renderizarResultados();
    });
    porId("listaDespensa").addEventListener("change", evento => {
        const input = evento.target.closest("[data-quantidade-despensa]");
        if (!input) return;
        atualizarItemDespensa(input.dataset.quantidadeDespensa, { quantidade: Number(input.value) });
        renderizarResultados();
    });
    porId("listaDespensa").addEventListener("click", evento => {
        const botao = evento.target.closest("[data-remover-despensa]");
        if (!botao) return;
        removerItemDespensa(botao.dataset.removerDespensa);
        renderizarDespensa();
        renderizarResultados();
    });
    window.addEventListener("despensaalterada", () => {
        atualizarResumoDespensa();
        if (estado.receitaAtual) renderizarIngredientesDetalhe();
    });
}

async function iniciar() {
    configurarEventos();
    estado.favoritos = lerFavoritos();
    try {
        const resposta = await fetch("./data/receitas.json", { cache: "no-store" });
        if (!resposta.ok) throw new Error("Base de receitas indisponível.");
        estado.receitas = await resposta.json();
    } catch (erro) {
        mensagem(erro.message || "Não foi possível carregar as receitas.", true);
        porId("resumoResultados").textContent = "Sem dados";
        return;
    }
    renderizarResultados();
    await carregarDespensaRemota();
    renderizarResultados();

    const receitaNaUrl = new URLSearchParams(location.hash.replace(/^#/, "")).get("receita");
    if (receitaNaUrl) abrirDetalhe(receitaNaUrl);
}

iniciar();
