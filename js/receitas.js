import { api } from "./api.js";
import {
    agruparSugestoes,
    avaliarReceita,
    criarInventario,
    filtrarEOrdenarReceitas,
    formatarQuantidade,
    normalizarIngrediente,
    proximoPasso,
    rotuloCategoria
} from "./receitas-core.js?v=3";
import {
    adicionarItemDespensa,
    atualizarItemDespensa,
    carregarDespensaRemota,
    descontarReceitaDaDespensa,
    listarDespensa,
    removerItemDespensa
} from "./despensa.js?v=3";
import {
    adicionarProduto,
    atualizarProduto,
    listarProdutos
} from "./produtos.js";

const estado = {
    receitas: [],
    categoria: "todas",
    tipo: "todas",
    tempo: "todos",
    busca: "",
    somenteDisponiveis: false,
    exibirLista: false,
    limiteResultados: 12,
    buscaRemota: "",
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
    return criarInventario(listarDespensa());
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
    const desconhecidas = resultado.quantidadesDesconhecidas?.length || 0;
    return `<span class="possui">✓ Você tem ${resultado.tem} de ${resultado.total} ${rotuloIngredientes}</span>
        <span class="falta">⚠ ${resultado.faltantes.length
            ? `Faltam ${resultado.faltantes.length} ${rotuloFaltantes}`
            : `Confira ${desconhecidas} ${desconhecidas === 1 ? "quantidade" : "quantidades"}`}</span>`;
}

function rotuloOrigem(receita) {
    if (receita.origem === "IA") return "Criada por IA";
    if (receita.origem === "THEMEALDB") return "Catálogo TheMealDB";
    return "Smart List";
}

function textoTempoReceita(receita) {
    return Number(receita.tempoMinutos) > 0 ? `${receita.tempoMinutos} min` : "Tempo não informado";
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
        <div class="receita-card-meta"><span>◷ ${escapar(textoTempoReceita(receita))}</span><span>•</span><span>${escapar(rotuloCategoria(receita.categoria))}</span><span>•</span><span>${escapar(receita.tipo)}</span></div>
        <small class="receita-origem">${escapar(rotuloOrigem(receita))}</small>
        <div class="receita-compatibilidade">${textoCompatibilidade(resultado)}</div>
    </article>`;
}

function resultadosFiltrados() {
    return filtrarEOrdenarReceitas(estado.receitas, inventarioAtual(), filtrosAtuais());
}

function secaoCategoria(categoria, resultados) {
    if (!resultados.length) return "";
    return `<section class="vitrine-categoria" aria-labelledby="categoria-${escapar(categoria)}">
        <header><div><small>SUGESTÕES PARA VOCÊ</small><h3 id="categoria-${escapar(categoria)}">${escapar(rotuloCategoria(categoria))}</h3></div><button type="button" data-ver-mais-categoria="${escapar(categoria)}">Ver mais</button></header>
        <div class="receitas-grade">${resultados.map(cartaoReceita).join("")}</div>
    </section>`;
}

function renderizarVitrine() {
    const grupos = agruparSugestoes(estado.receitas, inventarioAtual(), 3);
    const categorias = ["cafe-da-manha", "almoco", "lanche", "jantar"];
    porId("vitrineCategorias").innerHTML = categorias
        .map(categoria => secaoCategoria(categoria, grupos[categoria] || []))
        .join("") || '<p class="estado-vazio">Adicione alimentos à despensa para receber sugestões.</p>';
    porId("vitrineCategorias").hidden = false;
    porId("listaReceitas").hidden = true;
    porId("carregarMaisReceitas").hidden = true;
    porId("buscarReceitaIa").hidden = true;
    porId("tituloResultados").textContent = "Receitas para você";
    const total = Object.values(grupos).reduce((soma, grupo) => soma + grupo.length, 0);
    porId("resumoResultados").textContent = total === 1 ? "1 sugestão" : `${total} sugestões`;
}

function renderizarListaResultados() {
    const resultados = filtrarEOrdenarReceitas(estado.receitas, inventarioAtual(), filtrosAtuais());
    const visiveis = resultados.slice(0, estado.limiteResultados);
    porId("listaReceitas").innerHTML = visiveis.map(cartaoReceita).join("")
        || '<p class="estado-vazio">Nenhuma receita corresponde a estes filtros.</p>';
    porId("vitrineCategorias").hidden = true;
    porId("listaReceitas").hidden = false;
    porId("carregarMaisReceitas").hidden = visiveis.length >= resultados.length;
    porId("buscarReceitaIa").hidden = !estado.busca || resultados.length > 0;
    porId("tituloResultados").textContent = estado.busca
        ? `Resultados para “${estado.busca}”`
        : estado.categoria === "todas" ? "Receitas para você" : rotuloCategoria(estado.categoria);
    porId("resumoResultados").textContent = resultados.length === 1
        ? "1 receita encontrada"
        : `${resultados.length} receitas encontradas`;
}

function renderizarResultados() {
    if (estado.exibirLista || estado.busca || estado.categoria !== "todas"
        || estado.tipo !== "todas" || estado.tempo !== "todos" || estado.somenteDisponiveis) {
        renderizarListaResultados();
    } else {
        renderizarVitrine();
    }
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
    const itens = listarDespensa();
    porId("quantidadeDespensa").textContent = itens.length === 1 ? "1 alimento" : `${itens.length} alimentos`;
    renderizarDespensaInline();
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
    porId("categoriaReceitaDetalhe").textContent = `${rotuloCategoria(receita.categoria).toUpperCase()} · ${receita.tipo.toUpperCase()} · ${rotuloOrigem(receita).toUpperCase()}`;
    porId("nomeReceitaDetalhe").textContent = receita.nome;
    porId("descricaoReceitaDetalhe").textContent = receita.descricao;
    porId("tempoReceitaDetalhe").textContent = Number(receita.tempoMinutos) > 0 ? `${receita.tempoMinutos} minutos` : "Não informado";
    porId("rendimentoReceitaDetalhe").textContent = receita.rendimento;
    porId("dificuldadeReceitaDetalhe").textContent = receita.dificuldade;
    porId("categoriaMetricaReceita").textContent = rotuloCategoria(receita.categoria);
    renderizarIngredientesDetalhe();
    renderizarUtensiliosDetalhe();
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
    if (item.presente && !item.quantidadeConhecida) return "Você tem este alimento · quantidade não informada";
    return item.presente
        ? `Disponível: ${formatarQuantidade(item.disponivel, item.unidadeCanonica)}`
        : "Não disponível";
}

function renderizarIngredientesDetalhe() {
    const avaliacao = avaliarReceita(estado.receitaAtual, inventarioAtual());
    estado.avaliacaoAtual = avaliacao;
    porId("compatibilidadeDetalhe").textContent = avaliacao.podeFazer
        ? "Você possui tudo"
        : `${avaliacao.tem} de ${avaliacao.total} disponíveis`;
    const disponiveis = avaliacao.itens.filter(item => item.basico || (item.presente && item.quantidadeConhecida));
    porId("itensNecessarios").innerHTML = disponiveis.map(item => `<div class="item-necessario disponivel">
        <span class="estado-ingrediente" aria-hidden="true">✓</span>
        <div><strong>${escapar(item.nome)}</strong><small>${item.basico ? "Item básico / opcional" : formatarDisponivel(item)}</small></div>
        <strong>${escapar(formatarQuantidade(item.quantidade, item.unidade))}</strong>
    </div>`).join("") || '<p class="estado-vazio compacto">Nenhum ingrediente confirmado na despensa.</p>';
    const desconhecidas = avaliacao.quantidadesDesconhecidas || [];
    porId("quantidadesDesconhecidasBloco").hidden = desconhecidas.length === 0;
    porId("itensQuantidadeDesconhecida").innerHTML = desconhecidas.map(item => `<div class="item-quantidade-desconhecida">
        <span class="estado-ingrediente" aria-hidden="true">?</span>
        <div><strong>${escapar(item.nome)}</strong><small>Você tem este alimento, mas não informou a quantidade.</small></div>
        <strong>Precisa de ${escapar(formatarQuantidade(item.quantidade, item.unidade))}</strong>
    </div>`).join("");
    porId("faltantesBloco").hidden = avaliacao.faltantes.length === 0;
    porId("itensFaltantes").innerHTML = avaliacao.faltantes.map(item => `<div class="item-faltante">
        <span class="estado-ingrediente" aria-hidden="true">○</span>
        <div><strong>${escapar(item.nome)}</strong><small>Necessário: ${escapar(formatarQuantidade(item.quantidadeCanonica, item.unidadeCanonica))} · Disponível: ${item.presente ? escapar(formatarQuantidade(item.disponivel, item.unidadeCanonica)) : "Não disponível"}</small></div>
        <strong>Faltam ${escapar(formatarQuantidade(item.falta, item.unidadeCanonica))}</strong>
    </div>`).join("");
    porId("adicionarFaltantes").hidden = avaliacao.faltantes.length === 0;
}

function lista(valor) {
    return Array.isArray(valor) ? valor : [];
}

function passoGuiado(passo = {}) {
    const acoes = lista(passo.acoes).filter(Boolean);
    return {
        ...passo,
        ingredientes: lista(passo.ingredientes),
        utensilios: lista(passo.utensilios),
        continueUsando: lista(passo.continueUsando),
        acoes: acoes.length ? acoes : passo.descricao ? [passo.descricao] : [],
        observacoes: lista(passo.observacoes)
    };
}

function renderizarUtensiliosDetalhe() {
    const utensilios = lista(estado.receitaAtual?.utensilios);
    porId("totalUtensilios").textContent = `${utensilios.length} ${utensilios.length === 1 ? "item" : "itens"}`;
    porId("listaUtensilios").innerHTML = utensilios.length
        ? utensilios.map(item => `<div class="utensilio-item"><span aria-hidden="true">▦</span><strong>${escapar(item)}</strong></div>`).join("")
        : '<p class="conteudo-indisponivel">A receita de origem não informou utensílios.</p>';
}

function itensUsoDoPasso(passo) {
    const guiado = passoGuiado(passo);
    return [
        ...guiado.continueUsando.map(item => ({ tipo: "continuar", texto: item })),
        ...guiado.utensilios.map(item => ({ tipo: "utensilio", texto: item })),
        ...guiado.ingredientes.map(item => ({
            tipo: "ingrediente",
            texto: `${formatarQuantidade(item.quantidade, item.unidade)} de ${item.nome}`
        }))
    ];
}

function renderizarUsoDoPasso(passo) {
    const itens = itensUsoDoPasso(passo);
    if (!itens.length) {
        return '<p class="conteudo-indisponivel">Consulte os ingredientes gerais desta receita.</p>';
    }
    return `<ul class="lista-uso-passo">${itens.map(item => `<li class="${item.tipo}"><span aria-hidden="true">${item.tipo === "ingrediente" ? "◇" : item.tipo === "continuar" ? "↻" : "▦"}</span><span>${item.tipo === "continuar" ? "<small>Continue usando</small>" : ""}${escapar(item.texto)}</span></li>`).join("")}</ul>`;
}

function renderizarMetadadosPasso(passo) {
    const metadados = [
        passo.tempoAproximado ? ["Tempo aproximado", passo.tempoAproximado] : null,
        passo.intensidadeFogo ? ["Fogo / temperatura", passo.intensidadeFogo] : null
    ].filter(Boolean);
    return metadados.length ? `<dl class="passo-metadados">${metadados.map(([titulo, valor]) => `<div><dt>${titulo}</dt><dd>${escapar(valor)}</dd></div>`).join("")}</dl>` : "";
}

function conteudoPassoDetalhe(passoOriginal) {
    const passo = passoGuiado(passoOriginal);
    return `<h3>${escapar(passo.titulo)}</h3>
        ${passo.descricao ? `<p class="passo-resumo">${escapar(passo.descricao)}</p>` : ""}
        <section class="passo-bloco"><h4>Você vai usar agora</h4>${renderizarUsoDoPasso(passo)}</section>
        <section class="passo-bloco passo-como-fazer"><h4>Como fazer</h4><ol>${passo.acoes.map(acao => `<li>${escapar(acao)}</li>`).join("")}</ol></section>
        ${renderizarMetadadosPasso(passo)}
        ${passo.pontoEsperado ? `<aside class="passo-como-saber"><h4>Como saber</h4><p>${escapar(passo.pontoEsperado)}</p></aside>` : ""}
        ${passo.observacoes.length ? `<aside class="passo-observacoes"><h4>Atenção</h4><ul>${passo.observacoes.map(item => `<li>${escapar(item)}</li>`).join("")}</ul></aside>` : ""}`;
}

function renderizarPasso() {
    const passos = estado.receitaAtual?.passos || [];
    if (!passos.length) return;
    const passo = passoGuiado(passos[estado.passoAtual]);
    porId("numeroPasso").textContent = `Passo ${estado.passoAtual + 1} de ${passos.length}`;
    porId("barraPasso").style.width = `${((estado.passoAtual + 1) / passos.length) * 100}%`;
    porId("passoAtual").innerHTML = conteudoPassoDetalhe(passo);
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
    const passo = passoGuiado(estado.receitaAtual.passos[estado.passoAtual]);
    const total = estado.receitaAtual.passos.length;
    porId("nomeModoCozinha").textContent = estado.receitaAtual.nome;
    porId("numeroModoCozinha").textContent = `Passo ${estado.passoAtual + 1} de ${total}`;
    porId("estadoPassoCozinha").textContent = estado.passoAtual
        ? `✓ ${estado.passoAtual} ${estado.passoAtual === 1 ? "etapa concluída" : "etapas concluídas"} · ● atual`
        : "● Etapa atual";
    porId("barraModoCozinha").style.width = `${((estado.passoAtual + 1) / total) * 100}%`;
    porId("tituloModoCozinha").textContent = passo.titulo;
    porId("descricaoModoCozinha").textContent = passo.descricao || "";
    porId("ingredientesModoCozinha").innerHTML = renderizarUsoDoPasso(passo);
    porId("acoesModoCozinha").innerHTML = passo.acoes.map(acao => `<li>${escapar(acao)}</li>`).join("");
    porId("tempoBlocoCozinha").hidden = !passo.tempoAproximado;
    porId("tempoModoCozinha").textContent = passo.tempoAproximado || "";
    porId("fogoBlocoCozinha").hidden = !passo.intensidadeFogo;
    porId("fogoModoCozinha").textContent = passo.intensidadeFogo || "";
    porId("comoSaberBlocoCozinha").hidden = !passo.pontoEsperado;
    porId("comoSaberModoCozinha").textContent = passo.pontoEsperado || "";
    porId("observacoesBlocoCozinha").hidden = passo.observacoes.length === 0;
    porId("observacoesModoCozinha").innerHTML = passo.observacoes.map(item => `<li>${escapar(item)}</li>`).join("");
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

function abrirConsultaCozinha(tipo) {
    const receita = estado.receitaAtual;
    if (!receita) return;
    const ingredientes = tipo === "ingredientes";
    porId("tituloConsultaCozinha").textContent = ingredientes ? "Todos os ingredientes" : "Utensílios";
    porId("conteudoConsultaCozinha").innerHTML = ingredientes
        ? `<div class="consulta-lista">${receita.ingredientes.map(item => `<div><span>◇</span><strong>${escapar(item.nome)}</strong><small>${escapar(formatarQuantidade(item.quantidade, item.unidade))}</small></div>`).join("")}</div>`
        : `<div class="consulta-lista">${lista(receita.utensilios).map(item => `<div><span>▦</span><strong>${escapar(item)}</strong></div>`).join("") || '<p class="conteudo-indisponivel">A receita de origem não informou utensílios.</p>'}</div>`;
    porId("consultaCozinhaDialog").showModal();
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

function textoQuantidadeDespensa(item) {
    return item.quantidadeConhecida === false || item.quantidade === null
        ? "Quantidade não informada"
        : formatarQuantidade(item.quantidade, item.unidade);
}

function renderizarDespensaInline() {
    const destino = porId("listaAlimentosCasa");
    if (!destino) return;
    const itens = listarDespensa();
    destino.innerHTML = itens.length
        ? itens.map(item => `<article class="alimento-casa-card">
            <span aria-hidden="true">◇</span>
            <div><strong>${escapar(item.nome)}</strong><small>${escapar(textoQuantidadeDespensa(item))}</small></div>
            <button type="button" data-editar-despensa="${escapar(item.id)}" aria-label="Editar ${escapar(item.nome)}">Editar</button>
        </article>`).join("")
        : '<p class="estado-vazio compacto">Sua despensa ainda está vazia.</p>';
}

function campoQuantidade(item) {
    return item.quantidadeConhecida === false || item.quantidade === null ? "" : Number(item.quantidade);
}

function renderizarDespensa() {
    const itens = listarDespensa();
    porId("listaDespensa").innerHTML = itens.length
        ? itens.map(item => `<div class="item-despensa" data-despensa-id="${escapar(item.id)}">
            <span aria-hidden="true">✓</span>
            <div class="item-despensa-campos">
                <label>Alimento<input data-nome-despensa="${escapar(item.id)}" maxlength="160" value="${escapar(item.nome)}"></label>
                <label>Quantidade (opcional)<input data-quantidade-despensa="${escapar(item.id)}" type="number" min="0.001" step="0.001" inputmode="decimal" value="${campoQuantidade(item)}" placeholder="Não informada"></label>
                <label>Unidade<select data-unidade-despensa="${escapar(item.id)}">
                    ${["unidade", "g", "kg", "ml", "l"].map(unidade => `<option value="${unidade}" ${item.unidade === unidade ? "selected" : ""}>${unidade === "unidade" ? "Unidade" : unidade === "l" ? "L" : unidade}</option>`).join("")}
                </select></label>
            </div>
            <div class="item-despensa-controles"><button type="button" data-salvar-despensa="${escapar(item.id)}">Salvar</button><button type="button" data-remover-despensa="${escapar(item.id)}" aria-label="Remover ${escapar(item.nome)}">Remover</button></div>
        </div>`).join("")
        : '<p class="estado-vazio">Sua despensa está vazia. Finalize uma compra ou adicione um item.</p>';
    atualizarResumoDespensa();
}

function quantidadeOpcional(id) {
    const valor = porId(id).value.trim();
    return valor === "" ? null : Number(valor);
}

function adicionarAlimentoDoFormulario(nomeId, quantidadeId, unidadeId, formulario) {
    try {
        adicionarItemDespensa({
            nome: porId(nomeId).value.trim(),
            quantidade: quantidadeOpcional(quantidadeId),
            unidade: porId(unidadeId).value
        });
        formulario.reset();
        mensagem("Alimento adicionado à sua despensa.");
        porId("mensagemDespensa").textContent = "";
        renderizarDespensa();
        renderizarResultados();
    } catch (erro) {
        const texto = erro.message || "Não foi possível adicionar este item.";
        mensagem(texto, true);
        porId("mensagemDespensa").textContent = texto;
    }
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

function adaptarReceitaCatalogo(receita = {}) {
    return {
        id: receita.id,
        nome: receita.nome,
        descricao: receita.descricao || "Receita estruturada para o Smart List.",
        icone: receita.icone || "◇",
        categoria: receita.categoria || "almoco",
        tipo: receita.tipo || "salgada",
        tempoMinutos: Number(receita.tempoMinutos) || 30,
        dificuldade: receita.dificuldade || "Não informada",
        rendimento: receita.rendimento || "Não informado",
        origem: receita.origem || "SMART_LIST",
        fonte: receita.fonte || "Smart List",
        referenciaExterna: receita.referenciaExterna || "",
        utensilios: lista(receita.utensilios),
        ingredientes: lista(receita.ingredientes).map(item => ({
            nome: item.nome,
            quantidade: Number(item.quantidade) || 0,
            unidade: item.unidade || "unidade",
            obrigatorio: item.obrigatorio !== false,
            basico: Boolean(item.basico)
        })),
        passos: lista(receita.passos).map((passo, indice) => ({
            numero: passo.numero || indice + 1,
            titulo: passo.titulo || `Etapa ${indice + 1}`,
            descricao: passo.descricao || "",
            ingredientes: lista(passo.ingredientes),
            utensilios: lista(passo.utensilios),
            continueUsando: lista(passo.continueUsando),
            acoes: lista(passo.acoes).length ? passo.acoes : [passo.descricao].filter(Boolean),
            tempoAproximado: passo.tempoAproximado || "",
            intensidadeFogo: passo.intensidadeFogo || "",
            pontoEsperado: passo.pontoEsperado || "",
            observacoes: lista(passo.observacoes)
        }))
    };
}

function mesclarReceitas(novas = []) {
    const porIdReceita = new Map(estado.receitas.map(receita => [receita.id, receita]));
    novas.map(adaptarReceitaCatalogo).filter(receita => receita.id && receita.nome)
        .forEach(receita => porIdReceita.set(receita.id, receita));
    estado.receitas = [...porIdReceita.values()];
}

async function buscarCatalogoAmplo(busca) {
    if (!busca || estado.buscaRemota === busca) return;
    estado.buscaRemota = busca;
    mensagem("Buscando também no catálogo ampliado de receitas...");
    try {
        const resposta = await api.get(`/receitas/catalogo?busca=${encodeURIComponent(busca)}`);
        mesclarReceitas(Array.isArray(resposta) ? resposta : resposta?.receitas);
        const total = resultadosFiltrados().length;
        mensagem(total ? "Busca concluída no catálogo local e ampliado." : "Nenhuma receita encontrada. Você pode solicitar uma opção criada por IA.");
    } catch {
        mensagem("A busca local foi concluída. O catálogo ampliado está temporariamente indisponível.");
    }
    renderizarResultados();
}

async function solicitarReceitaIa() {
    if (!estado.busca) return;
    const botao = porId("buscarReceitaIa");
    botao.disabled = true;
    botao.textContent = "Criando receita estruturada...";
    try {
        const receita = await api.post("/receitas/gerar", {
            busca: estado.busca,
            despensa: listarDespensa().map(item => ({ nome: item.nome, quantidade: item.quantidade, unidade: item.unidade }))
        });
        mesclarReceitas([receita]);
        mensagem("Receita criada por IA e identificada no catálogo.");
        renderizarResultados();
    } catch (erro) {
        mensagem(erro.message || "A criação por IA não está disponível agora.", true);
    } finally {
        botao.disabled = false;
        botao.textContent = "Não encontrou? Criar uma receita com IA";
    }
}

function configurarEventos() {
    porId("formBuscaReceitas").addEventListener("submit", async evento => {
        evento.preventDefault();
        estado.busca = porId("buscaReceitas").value.trim();
        estado.exibirLista = Boolean(estado.busca);
        estado.limiteResultados = 12;
        renderizarResultados();
        await buscarCatalogoAmplo(estado.busca);
    });
    porId("buscaReceitas").addEventListener("input", evento => {
        estado.busca = evento.target.value.trim();
        estado.exibirLista = Boolean(estado.busca);
        estado.limiteResultados = 12;
        renderizarResultados();
    });
    document.querySelectorAll("[data-categoria]").forEach(botao => botao.addEventListener("click", () => {
        document.querySelectorAll("[data-categoria]").forEach(item => item.classList.remove("ativo"));
        botao.classList.add("ativo");
        estado.categoria = botao.dataset.categoria;
        estado.exibirLista = true;
        estado.limiteResultados = 12;
        renderizarResultados();
    }));
    document.querySelectorAll("[data-tipo]").forEach(botao => botao.addEventListener("click", () => {
        document.querySelectorAll("[data-tipo]").forEach(item => item.classList.remove("ativo"));
        botao.classList.add("ativo");
        estado.tipo = botao.dataset.tipo;
        estado.exibirLista = true;
        estado.limiteResultados = 12;
        renderizarResultados();
    }));
    porId("filtroTempo").addEventListener("change", evento => { estado.tempo = evento.target.value; estado.exibirLista = true; renderizarResultados(); });
    porId("somenteDisponiveis").addEventListener("change", evento => { estado.somenteDisponiveis = evento.target.checked; estado.exibirLista = true; renderizarResultados(); });
    porId("limparFiltros").addEventListener("click", () => {
        estado.categoria = "todas";
        estado.tipo = "todas";
        estado.tempo = "todos";
        estado.busca = "";
        estado.somenteDisponiveis = false;
        estado.exibirLista = false;
        estado.limiteResultados = 12;
        porId("buscaReceitas").value = "";
        porId("filtroTempo").value = "todos";
        porId("somenteDisponiveis").checked = false;
        document.querySelectorAll("[data-categoria], [data-tipo]").forEach(botao => botao.classList.toggle("ativo", botao.dataset.categoria === "todas" || botao.dataset.tipo === "todas"));
        renderizarResultados();
    });

    document.addEventListener("click", evento => {
        const verMais = evento.target.closest("[data-ver-mais-categoria]");
        if (verMais) {
            estado.categoria = verMais.dataset.verMaisCategoria;
            estado.exibirLista = true;
            estado.limiteResultados = 12;
            document.querySelectorAll("[data-categoria]").forEach(botao => botao.classList.toggle("ativo", botao.dataset.categoria === estado.categoria));
            renderizarResultados();
            porId("tituloResultados").scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        const editarDespensa = evento.target.closest("[data-editar-despensa]");
        if (editarDespensa) {
            abrirDespensa();
            window.setTimeout(() => porId("listaDespensa").querySelector(`[data-nome-despensa="${CSS.escape(editarDespensa.dataset.editarDespensa)}"]`)?.focus(), 0);
            return;
        }
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
    porId("verIngredientesCozinha").addEventListener("click", () => abrirConsultaCozinha("ingredientes"));
    porId("verUtensiliosCozinha").addEventListener("click", () => abrirConsultaCozinha("utensilios"));
    porId("cozinhaAnterior").addEventListener("click", () => moverPasso(-1));
    porId("cozinhaProximo").addEventListener("click", () => moverPasso(1));
    porId("adicionarFaltantes").addEventListener("click", adicionarFaltantesALista);
    porId("finalizarReceita").addEventListener("click", () => porId("finalizarDialog").showModal());
    porId("confirmarAtualizarDespensa").addEventListener("click", () => concluirReceita(true));
    porId("naoAtualizarDespensa").addEventListener("click", () => concluirReceita(false));

    porId("abrirDespensa").addEventListener("click", abrirDespensa);
    porId("abrirDespensaTopo").addEventListener("click", abrirDespensa);
    porId("formAlimentoCasa").addEventListener("submit", evento => {
        evento.preventDefault();
        adicionarAlimentoDoFormulario("nomeAlimentoCasa", "quantidadeAlimentoCasa", "unidadeAlimentoCasa", evento.target);
    });
    porId("encontrarReceitasDespensa").addEventListener("click", () => {
        estado.exibirLista = true;
        estado.busca = "";
        estado.categoria = "todas";
        estado.limiteResultados = 12;
        porId("buscaReceitas").value = "";
        renderizarResultados();
        porId("tituloResultados").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    porId("formNovoItemDespensa").addEventListener("submit", evento => {
        evento.preventDefault();
        adicionarAlimentoDoFormulario("nomeItemDespensa", "quantidadeItemDespensa", "unidadeItemDespensa", evento.target);
    });
    porId("listaDespensa").addEventListener("click", evento => {
        const salvar = evento.target.closest("[data-salvar-despensa]");
        if (salvar) {
            const id = salvar.dataset.salvarDespensa;
            const raiz = salvar.closest("[data-despensa-id]");
            const quantidade = raiz.querySelector("[data-quantidade-despensa]").value.trim();
            try {
                atualizarItemDespensa(id, {
                    nome: raiz.querySelector("[data-nome-despensa]").value.trim(),
                    quantidade: quantidade === "" ? null : Number(quantidade),
                    quantidadeConhecida: quantidade !== "",
                    unidade: raiz.querySelector("[data-unidade-despensa]").value
                });
                porId("mensagemDespensa").textContent = "Alimento atualizado.";
                renderizarDespensa();
                renderizarResultados();
            } catch (erro) {
                porId("mensagemDespensa").textContent = erro.message;
            }
            return;
        }
        const remover = evento.target.closest("[data-remover-despensa]");
        if (!remover) return;
        removerItemDespensa(remover.dataset.removerDespensa);
        porId("mensagemDespensa").textContent = "Alimento removido.";
        renderizarDespensa();
        renderizarResultados();
    });
    porId("carregarMaisReceitas").addEventListener("click", () => { estado.limiteResultados += 12; renderizarResultados(); });
    porId("buscarReceitaIa").addEventListener("click", solicitarReceitaIa);
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
