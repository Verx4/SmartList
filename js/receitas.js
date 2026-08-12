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
            // Usa uma sessÃ£o local anÃ´nima.
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
        return '<span class="completa">âœ“ VocÃª possui tudo</span>';
    }
    const rotuloIngredientes = resultado.tem === 1 ? "ingrediente" : "ingredientes";
    const rotuloFaltantes = resultado.faltantes.length === 1 ? "ingrediente" : "ingredientes";
    const desconhecidas = resultado.quantidadesDesconhecidas?.length || 0;
    return `<span class="possui">âœ“ VocÃª tem ${resultado.tem} de ${resultado.total} ${rotuloIngredientes}</span>
        <span class="falta">âš  ${resultado.faltantes.length
            ? `Faltam ${resultado.faltantes.length} ${rotuloFaltantes}`
            : `Confira ${desconhecidas} ${desconhecidas === 1 ? "quantidade" : "quantidades"}`}</span>`;
}

function rotuloOrigem(receita) {
    if (receita.origem === "IA") return "Criada por IA";
    if (receita.origem === "THEMEALDB") return "CatÃ¡logo TheMealDB";
    return "Smart List";
}

function textoTempoReceita(receita) {
    return Number(receita.tempoMinutos) > 0 ? `${receita.tempoMinutos} min` : "Tempo nÃ£o informado";
}

function cartaoReceita(resultado) {
    const receita = resultado.receita;
    const favorita = estado.favoritos.has(receita.id);
    return `<article class="receita-card" data-receita-id="${escapar(receita.id)}" tabindex="0" role="button" aria-label="Abrir receita ${escapar(receita.nome)}">
        <div class="receita-card-topo">
            <span class="receita-card-icone" aria-hidden="true">${escapar(receita.icone || "â—‡")}</span>
            <button class="favoritar-card ${favorita ? "ativo" : ""}" type="button" data-favoritar="${escapar(receita.id)}" aria-label="${favorita ? "Remover dos favoritos" : "Favoritar receita"}" aria-pressed="${favorita}">${favorita ? "â™¥" : "â™¡"}</button>
        </div>
        <h3>${escapar(receita.nome)}</h3>
        <div class="receita-card-meta"><span>â—· ${escapar(textoTempoReceita(receita))}</span><span>â€¢</span><span>${escapar(rotuloCategoria(receita.categoria))}</span><span>â€¢</span><span>${escapar(receita.tipo)}</span></div>
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
        <header><div><small>SUGESTÃ•ES PARA VOCÃŠ</small><h3 id="categoria-${escapar(categoria)}">${escapar(rotuloCategoria(categoria))}</h3></div><button type="button" data-ver-mais-categoria="${escapar(categoria)}">Ver mais</button></header>
        <div class="receitas-grade">${resultados.map(cartaoReceita).join("")}</div>
    </section>`;
}

function renderizarVitrine() {
    const grupos = agruparSugestoes(estado.receitas, inventarioAtual(), 3);
    const categorias = ["cafe-da-manha", "almoco", "lanche", "jantar"];
    porId("vitrineCategorias").innerHTML = categorias
        .map(categoria => secaoCategoria(categoria, grupos[categoria] || []))
        .join("") || '<p class="estado-vazio">Adicione alimentos Ã  despensa para receber sugestÃµes.</p>';
    porId("vitrineCategorias").hidden = false;
    porId("listaReceitas").hidden = true;
    porId("carregarMaisReceitas").hidden = true;
    porId("buscarReceitaIa").hidden = true;
    porId("tituloResultados").textContent = "Receitas para vocÃª";
    const total = Object.values(grupos).reduce((soma, grupo) => soma + grupo.length, 0);
    porId("resumoResultados").textContent = total === 1 ? "1 sugestÃ£o" : `${total} sugestÃµes`;
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
        ? `Resultados para â€œ${estado.busca}â€`
        : estado.categoria === "todas" ? "Receitas para vocÃª" : rotuloCategoria(estado.categoria);
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
        // O favorito local permanece disponÃ­vel sem conexÃ£o.
    }
    renderizarResultados();
    if (estado.receitaAtual?.id === id) atualizarBotaoFavoritoDetalhe();
}

function atualizarBotaoFavoritoDetalhe() {
    const favorita = estado.favoritos.has(estado.receitaAtual?.id);
    porId("favoritarDetalhe").textContent = favorita ? "â™¥" : "â™¡";
    porId("favoritarDetalhe").setAttribute("aria-pressed", String(favorita));
    porId("favoritarDetalhe").setAttribute("aria-label", favorita ? "Remover dos favoritos" : "Favoritar receita");
}

function abrirDetalhe(id) {
    const receita = estado.receitas.find(item => item.id === id);
    if (!receita) return;
    estado.receitaAtual = receita;
    estado.avaliacaoAtual = avaliarReceita(receita, inventarioAtual());
    estado.passoAtual = 0;

    porId("iconeReceitaDetalhe").textContent = receita.icone || "â—‡";
    porId("categoriaReceitaDetalhe").textContent = `${rotuloCategoria(receita.categoria).toUpperCase()} Â· ${receita.tipo.toUpperCase()} Â· ${rotuloOrigem(receita).toUpperCase()}`;
    porId("nomeReceitaDetalhe").textContent = receita.nome;
    porId("descricaoReceitaDetalhe").textContent = receita.descricao;
    porId("tempoReceitaDetalhe").textContent = Number(receita.tempoMinutos) > 0 ? `${receita.tempoMinutos} minutos` : "NÃ£o informado";
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
    if (item.presente && !item.quantidadeConhecida) return "VocÃª tem este alimento Â· quantidade nÃ£o informada";
    return item.presente
        ? `DisponÃ­vel: ${formatarQuantidade(item.disponivel, item.unidadeCanonica)}`
        : "NÃ£o disponÃ­vel";
}

function renderizarIngredientesDetalhe() {
    const avaliacao = avaliarReceita(estado.receitaAtual, inventarioAtual());
    estado.avaliacaoAtual = avaliacao;
    porId("compatibilidadeDetalhe").textContent = avaliacao.podeFazer
        ? "VocÃª possui tudo"
        : `${avaliacao.tem} de ${avaliacao.total} disponÃ­veis`;
    const disponiveis = avaliacao.itens.filter(item => item.basico || (item.presente && item.quantidadeConhecida));
    porId("itensNecessarios").innerHTML = disponiveis.map(item => `<div class="item-necessario disponivel">
        <span class="estado-ingrediente" aria-hidden="true">âœ“</span>
        <div><strong>${escapar(item.nome)}</strong><small>${item.basico ? "Item bÃ¡sico / opcional" : formatarDisponivel(item)}</small></div>
        <strong>${escapar(formatarQuantidade(item.quantidade, item.unidade))}</strong>
    </div>`).join("") || '<p class="estado-vazio compacto">Nenhum ingrediente confirmado na despensa.</p>';
    const desconhecidas = avaliacao.quantidadesDesconhecidas || [];
    porId("quantidadesDesconhecidasBloco").hidden = desconhecidas.length === 0;
    porId("itensQuantidadeDesconhecida").innerHTML = desconhecidas.map(item => `<div class="item-quantidade-desconhecida">
        <span class="estado-ingrediente" aria-hidden="true">?</span>
        <div><strong>${escapar(item.nome)}</strong><small>VocÃª tem este alimento, mas nÃ£o informou a quantidade.</small></div>
        <strong>Precisa de ${escapar(formatarQuantidade(item.quantidade, item.unidade))}</strong>
    </div>`).join("");
    porId("faltantesBloco").hidden = avaliacao.faltantes.length === 0;
    porId("itensFaltantes").innerHTML = avaliacao.faltantes.map(item => `<div class="item-faltante">
        <span class="estado-ingrediente" aria-hidden="true">â—‹</span>
        <div><strong>${escapar(item.nome)}</strong><small>NecessÃ¡rio: ${escapar(formatarQuantidade(item.quantidadeCanonica, item.unidadeCanonica))} Â· DisponÃ­vel: ${item.presente ? escapar(formatarQuantidade(item.disponivel, item.unidadeCanonica)) : "NÃ£o disponÃ­vel"}</small></div>
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
        ? utensilios.map(item => `<div class="utensilio-item"><span aria-hidden="true">â–¦</span><strong>${escapar(item)}</strong></div>`).join("")
        : '<p class="conteudo-indisponivel">A receita de origem nÃ£o informou utensÃ­lios.</p>';
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
    const itens = itensUsß}=¶‰ËkºwµçA•¹Í„µ½¹ÑÉ½±•Ìˆøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÍ…±Ù…Èµ‘•ÍÁ•¹Í„ôˆ‘í•Í…Á…È¡¥Ñ•´¹¥¥ôˆùM…±Ù…Èğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ‘…Ñ„µÉ•µ½Ù•Èµ‘•ÍÁ•¹Í„ôˆ‘í•Í…Á…È¡¥Ñ•´¹¥¥ôˆ…É¥„µ±…‰•°ô‰I•µ½Ù•È€‘í•Í…Á…È¡¥Ñ•´¹¹½µ”¥ôˆùI•µ½Ù•Èğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€€€ğ½‘¥Øù€¤¹©½¥¸ ˆˆ¤(€€€€€€€€è€œñÀ±…ÍÌô‰•ÍÑ…‘¼µÙ…é¥¼ˆùMÕ„‘•ÍÁ•¹Í„•ÍÓ„Ù…é¥„¸¥¹…±¥é”Õµ„½µÁÉ„½Ô…‘¥¥½¹”Õ´¥Ñ•´¸ğ½Àøœì(€€€…ÑÕ…±¥é…ÉI•ÍÕµ½•ÍÁ•¹Í„ ¤ì)ô()™Õ¹Ñ¥½¸ÅÕ…¹Ñ¥‘…‘•=Á¥½¹…°¡¥¤ì(€€€½¹ÍĞÙ…±½È€ôÁ½É%¡¥¤¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€É•ÑÕÉ¸Ù…±½È€ôôô€ˆˆ€ü¹Õ±°€è9Õµ‰•È¡Ù…±½È¤ì)ô()™Õ¹Ñ¥½¸…‘¥¥½¹…É±¥µ•¹Ñ½½½ÉµÕ±…É¥¼¡¹½µ•%°ÅÕ…¹Ñ¥‘…‘•%°Õ¹¥‘…‘•%°™½ÉµÕ±…É¥¼¤ì(€€€ÑÉäì(€€€€€€€…‘¥¥½¹…É%Ñ•µ•ÍÁ•¹Í„¡ì(€€€€€€€€€€€¹½µ”èÁ½É%¡¹½µ•%¤¹Ù…±Õ”¹ÑÉ¥´ ¤°(€€€€€€€€€€€ÅÕ…¹Ñ¥‘…‘”èÅÕ…¹Ñ¥‘…‘•=Á¥½¹…°¡ÅÕ…¹Ñ¥‘…‘•%¤°(€€€€€€€€€€€Õ¹¥‘…‘”èÁ½É%¡Õ¹¥‘…‘•%¤¹Ù…±Õ”(€€€€€€€ô¤ì(€€€€€€€™½ÉµÕ±…É¥¼¹É•Í•Ğ ¤ì(€€€€€€€µ•¹Í…•´ ‰±¥µ•¹Ñ¼…‘¥¥½¹…‘¼ƒ€ÍÕ„‘•ÍÁ•¹Í„¸ˆ¤ì(€€€€€€€Á½É% ‰µ•¹Í…•µ•ÍÁ•¹Í„ˆ¤¹Ñ•áÑ½¹Ñ•¹Ğ€ô€ˆˆì(€€€€€€€É•¹‘•É¥é…É•ÍÁ•¹Í„ ¤ì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô…Ñ €¡•ÉÉ¼¤ì(€€€€€€€½¹ÍĞÑ•áÑ¼€ô•ÉÉ¼¹µ•ÍÍ…”ñğ€‰;¼™½¤Á½ÍÏµÙ•°…‘¥¥½¹…È•ÍÑ”¥Ñ•´¸ˆì(€€€€€€€µ•¹Í…•´¡Ñ•áÑ¼°ÑÉÕ”¤ì(€€€€€€€Á½É% ‰µ•¹Í…•µ•ÍÁ•¹Í„ˆ¤¹Ñ•áÑ½¹Ñ•¹Ğ€ôÑ•áÑ¼ì(€€€ô)ô()™Õ¹Ñ¥½¸É•¥ÍÑÉ…É!¥ÍÑ½É¥½I••¥Ñ„¡…ÑÕ…±¥é½Õ•ÍÁ•¹Í„¤ì(€€€±•Ğ¡¥ÍÑ½É¥¼€ômtì(€€€ÑÉäì(€€€€€€€¡¥ÍÑ½É¥¼€ô)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´¡¡…Ù•!¥ÍÑ½É¥¼ ¤¤¤ñğmtì(€€€ô…Ñ ì(€€€€€€€¡¥ÍÑ½É¥¼€ômtì(€€€ô(€€€¡¥ÍÑ½É¥¼¹Õ¹Í¡¥™Ğ¡ì(€€€€€€€¥è±½‰…±Q¡¥Ì¹ÉåÁÑ¼ü¹É…¹‘½µUU%ü¸ ¤ñğ€‘í…Ñ”¹¹½Ü ¥õ€°(€€€€€€€É••¥Ñ…%è•ÍÑ…‘¼¹É••¥Ñ…ÑÕ…°¹¥°(€€€€€€€¹½µ”è•ÍÑ…‘¼¹É••¥Ñ…ÑÕ…°¹¹½µ”°(€€€€€€€ÁÉ•Á…É…‘…´è¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€‘•ÍÁ•¹Í…ÑÕ…±¥é…‘„è…ÑÕ…±¥é½Õ•ÍÁ•¹Í„(€€€ô¤ì(€€€±½…±MÑ½É…”¹Í•Ñ%Ñ•´¡¡…Ù•!¥ÍÑ½É¥¼ ¤°)M=8¹ÍÑÉ¥¹¥™ä¡¡¥ÍÑ½É¥¼¤¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸½¹±Õ¥ÉI••¥Ñ„¡…ÑÕ…±¥é…É•ÍÁ•¹Í„¤ì(€€€¥˜€¡…ÑÕ…±¥é…É•ÍÁ•¹Í„¤ì(€€€€€€€‘•Í½¹Ñ…ÉI••¥Ñ……•ÍÁ•¹Í„¡•ÍÑ…‘¼¹É••¥Ñ…ÑÕ…°¹¥¹É•‘¥•¹Ñ•Ì¤ì(€€€ô(€€€É•¥ÍÑÉ…É!¥ÍÑ½É¥½I••¥Ñ„¡…ÑÕ…±¥é…É•ÍÁ•¹Í„¤ì(€€€ÑÉäì(€€€€€€€…İ…¥Ğ…Á¤¹Á½ÍĞ¡€½É••¥Ñ…Ì¼‘í•ÍÑ…‘¼¹É••¥Ñ…ÑÕ…°¹¥‘ô½™¥¹…±¥é…É€°ì…ÑÕ…±¥é…É•ÍÁ•¹Í„ô¤ì(€€€ô…Ñ ì(€€€€€€€€¼¼<¡¥ÍÓÍÉ¥¼”„‘•ÍÁ•¹Í„±½…¥Ì«„™½É…´…ÑÕ…±¥é…‘½Ì¸(€€€ô(€€€Á½É% ‰™¥¹…±¥é…É¥…±½œˆ¤¹±½Í” ¤ì(€€€É•¹‘•É¥é…É%¹É•‘¥•¹Ñ•Í•Ñ…±¡” ¤ì(€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€µ•¹Í…•´¡…ÑÕ…±¥é…É•ÍÁ•¹Í„€ü€‰I••¥Ñ„™¥¹…±¥é…‘„”‘•ÍÁ•¹Í„…ÑÕ…±¥é…‘„¸ˆ€è€‰I••¥Ñ„™¥¹…±¥é…‘„Í•´…±Ñ•É…È„‘•ÍÁ•¹Í„¸ˆ¤ì)ô()™Õ¹Ñ¥½¸…‘…ÁÑ…ÉI••¥Ñ……Ñ…±½¼¡É••¥Ñ„€ôíô¤ì(€€€É•ÑÕÉ¸ì(€€€€€€€¥èÉ••¥Ñ„¹¥°(€€€€€€€¹½µ”èÉ••¥Ñ„¹¹½µ”°(€€€€€€€‘•ÍÉ¥…¼èÉ••¥Ñ„¹‘•ÍÉ¥…¼ñğ€‰I••¥Ñ„•ÍÑÉÕÑÕÉ…‘„Á…É„¼Mµ…ÉĞ1¥ÍĞ¸ˆ°(€€€€€€€¥½¹”èÉ••¥Ñ„¹¥½¹”ñğ€‹Š^ˆ°(€€€€€€€…Ñ•½É¥„èÉ••¥Ñ„¹…Ñ•½É¥„ñğ€‰…±µ½¼ˆ°(€€€€€€€Ñ¥Á¼èÉ••¥Ñ„¹Ñ¥Á¼ñğ€‰Í…±…‘„ˆ°(€€€€€€€Ñ•µÁ½5¥¹ÕÑ½Ìè9Õµ‰•È¡É••¥Ñ„¹Ñ•µÁ½5¥¹ÕÑ½Ì¤ñğ€ÌÀ°(€€€€€€€‘¥™¥Õ±‘…‘”èÉ••¥Ñ„¹‘¥™¥Õ±‘…‘”ñğ€‰;¼¥¹™½Éµ…‘„ˆ°(€€€€€€€É•¹‘¥µ•¹Ñ¼èÉ••¥Ñ„¹É•¹‘¥µ•¹Ñ¼ñğ€‰;¼¥¹™½Éµ…‘¼ˆ°(€€€€€€€½É¥•´èÉ••¥Ñ„¹½É¥•´ñğ€‰M5IQ}1%MPˆ°(€€€€€€€™½¹Ñ”èÉ••¥Ñ„¹™½¹Ñ”ñğ€‰Mµ…ÉĞ1¥ÍĞˆ°(€€€€€€€É•™•É•¹¥…áÑ•É¹„èÉ••¥Ñ„¹É•™•É•¹¥…áÑ•É¹„ñğ€ˆˆ°(€€€€€€€ÕÑ•¹Í¥±¥½Ìè±¥ÍÑ„¡É••¥Ñ„¹ÕÑ•¹Í¥±¥½Ì¤°(€€€€€€€¥¹É•‘¥•¹Ñ•Ìè±¥ÍÑ„¡É••¥Ñ„¹¥¹É•‘¥•¹Ñ•Ì¤¹µ…À¡¥Ñ•´€ôø€¡ì(€€€€€€€€€€€¹½µ”è¥Ñ•´¹¹½µ”°(€€€€€€€€€€€ÅÕ…¹Ñ¥‘…‘”è9Õµ‰•È¡¥Ñ•´¹ÅÕ…¹Ñ¥‘…‘”¤ñğ€À°(€€€€€€€€€€€Õ¹¥‘…‘”è¥Ñ•´¹Õ¹¥‘…‘”ñğ€‰Õ¹¥‘…‘”ˆ°(€€€€€€€€€€€½‰É¥…Ñ½É¥¼è¥Ñ•´¹½‰É¥…Ñ½É¥¼€„ôô™…±Í”°(€€€€€€€€€€€‰…Í¥¼è	½½±•…¸¡¥Ñ•´¹‰…Í¥¼¤(€€€€€€€ô¤¤°(€€€€€€€Á…ÍÍ½Ìè±¥ÍÑ„¡É••¥Ñ„¹Á…ÍÍ½Ì¤¹µ…À ¡Á…ÍÍ¼°¥¹‘¥”¤€ôø€¡ì(€€€€€€€€€€€¹Õµ•É¼èÁ…ÍÍ¼¹¹Õµ•É¼ñğ¥¹‘¥”€¬€Ä°(€€€€€€€€€€€Ñ¥ÑÕ±¼èÁ…ÍÍ¼¹Ñ¥ÑÕ±¼ñğÑ…Á„€‘í¥¹‘¥”€¬€Åõ€°(€€€€€€€€€€€‘•ÍÉ¥…¼èÁ…ÍÍ¼¹‘•ÍÉ¥…¼ñğ€ˆˆ°(€€€€€€€€€€€¥¹É•‘¥•¹Ñ•Ìè±¥ÍÑ„¡Á…ÍÍ¼¹¥¹É•‘¥•¹Ñ•Ì¤°(€€€€€€€€€€€ÕÑ•¹Í¥±¥½Ìè±¥ÍÑ„¡Á…ÍÍ¼¹ÕÑ•¹Í¥±¥½Ì¤°(€€€€€€€€€€€½¹Ñ¥¹Õ•UÍ…¹‘¼è±¥ÍÑ„¡Á…ÍÍ¼¹½¹Ñ¥¹Õ•UÍ…¹‘¼¤°(€€€€€€€€€€€…½•Ìè±¥ÍÑ„¡Á…ÍÍ¼¹…½•Ì¤¹±•¹Ñ €üÁ…ÍÍ¼¹…½•Ì€èmÁ…ÍÍ¼¹‘•ÍÉ¥…½t¹™¥±Ñ•È¡	½½±•…¸¤°(€€€€€€€€€€€Ñ•µÁ½ÁÉ½á¥µ…‘¼èÁ…ÍÍ¼¹Ñ•µÁ½ÁÉ½á¥µ…‘¼ñğ€ˆˆ°(€€€€€€€€€€€¥¹Ñ•¹Í¥‘…‘•½¼èÁ…ÍÍ¼¹¥¹Ñ•¹Í¥‘…‘•½¼ñğ€ˆˆ°(€€€€€€€€€€€Á½¹Ñ½ÍÁ•É…‘¼èÁ…ÍÍ¼¹Á½¹Ñ½ÍÁ•É…‘¼ñğ€ˆˆ°(€€€€€€€€€€€½‰Í•ÉÙ…½•Ìè±¥ÍÑ„¡Á…ÍÍ¼¹½‰Í•ÉÙ…½•Ì¤(€€€€€€€ô¤¤(€€€ôì)ô()™Õ¹Ñ¥½¸µ•Í±…ÉI••¥Ñ…Ì¡¹½Ù…Ì€ômt¤ì(€€€½¹ÍĞÁ½É%‘I••¥Ñ„€ô¹•Ü5…À¡•ÍÑ…‘¼¹É••¥Ñ…Ì¹µ…À¡É••¥Ñ„€ôømÉ••¥Ñ„¹¥°É••¥Ñ…t¤¤ì(€€€¹½Ù…Ì¹µ…À¡…‘…ÁÑ…ÉI••¥Ñ……Ñ…±½¼¤¹™¥±Ñ•È¡É••¥Ñ„€ôøÉ••¥Ñ„¹¥€˜˜É••¥Ñ„¹¹½µ”¤(€€€€€€€€¹™½É… ¡É••¥Ñ„€ôøÁ½É%‘I••¥Ñ„¹Í•Ğ¡É••¥Ñ„¹¥°É••¥Ñ„¤¤ì(€€€•ÍÑ…‘¼¹É••¥Ñ…Ì€ôl¸¸¹Á½É%‘I••¥Ñ„¹Ù…±Õ•Ì ¥tì)ô()…Íå¹Œ™Õ¹Ñ¥½¸‰ÕÍ…É…Ñ…±½½µÁ±¼¡‰ÕÍ„¤ì(€€€¥˜€ …‰ÕÍ„ñğ•ÍÑ…‘¼¹‰ÕÍ…I•µ½Ñ„€ôôô‰ÕÍ„¤É•ÑÕÉ¸ì(€€€•ÍÑ…‘¼¹‰ÕÍ…I•µ½Ñ„€ô‰ÕÍ„ì(€€€µ•¹Í…•´ ‰	ÕÍ…¹‘¼Ñ…µ‹¥´¹¼…Ó…±½¼…µÁ±¥…‘¼‘”É••¥Ñ…Ì¸¸¸ˆ¤ì(€€€ÑÉäì(€€€€€€€½¹ÍĞÉ•ÍÁ½ÍÑ„€ô…İ…¥Ğ…Á¤¹•Ğ¡€½É••¥Ñ…Ì½…Ñ…±½¼ı‰ÕÍ„ô‘í•¹½‘•UI%½µÁ½¹•¹Ğ¡‰ÕÍ„¥õ€¤ì(€€€€€€€µ•Í±…ÉI••¥Ñ…Ì¡ÉÉ…ä¹¥ÍÉÉ…ä¡É•ÍÁ½ÍÑ„¤€üÉ•ÍÁ½ÍÑ„€èÉ•ÍÁ½ÍÑ„ü¹É••¥Ñ…Ì¤ì(€€€€€€€½¹ÍĞÑ½Ñ…°€ôÉ•ÍÕ±Ñ…‘½Í¥±ÑÉ…‘½Ì ¤¹±•¹Ñ ì(€€€€€€€µ•¹Í…•´¡Ñ½Ñ…°€ü€‰	ÕÍ„½¹±×µ‘„¹¼…Ó…±½¼±½…°”…µÁ±¥…‘¼¸ˆ€è€‰9•¹¡Õµ„É••¥Ñ„•¹½¹ÑÉ…‘„¸Y½¨Á½‘”Í½±¥¥Ñ…ÈÕµ„½ÃŸ¼É¥…‘„Á½È%¸ˆ¤ì(€€€ô…Ñ ì(€€€€€€€µ•¹Í…•´ ‰‰ÕÍ„±½…°™½¤½¹±×µ‘„¸<…Ó…±½¼…µÁ±¥…‘¼•ÍÓ„Ñ•µÁ½É…É¥…µ•¹Ñ”¥¹‘¥ÍÁ½»µÙ•°¸ˆ¤ì(€€€ô(€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸Í½±¥¥Ñ…ÉI••¥Ñ…%„ ¤ì(€€€¥˜€ …•ÍÑ…‘¼¹‰ÕÍ„¤É•ÑÕÉ¸ì(€€€½¹ÍĞ‰½Ñ…¼€ôÁ½É% ‰‰ÕÍ…ÉI••¥Ñ…%„ˆ¤ì(€€€‰½Ñ…¼¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€‰½Ñ…¼¹Ñ•áÑ½¹Ñ•¹Ğ€ô€‰É¥…¹‘¼É••¥Ñ„•ÍÑÉÕÑÕÉ…‘„¸¸¸ˆì(€€€ÑÉäì(€€€€€€€½¹ÍĞÉ••¥Ñ„€ô…İ…¥Ğ…Á¤¹Á½ÍĞ ˆ½É••¥Ñ…Ì½•É…Èˆ°ì(€€€€€€€€€€€‰ÕÍ„è•ÍÑ…‘¼¹‰ÕÍ„°(€€€€€€€€€€€‘•ÍÁ•¹Í„è±¥ÍÑ…É•ÍÁ•¹Í„ ¤¹µ…À¡¥Ñ•´€ôø€¡ì¹½µ”è¥Ñ•´¹¹½µ”°ÅÕ…¹Ñ¥‘…‘”è¥Ñ•´¹ÅÕ…¹Ñ¥‘…‘”°Õ¹¥‘…‘”è¥Ñ•´¹Õ¹¥‘…‘”ô¤¤(€€€€€€€ô¤ì(€€€€€€€µ•Í±…ÉI••¥Ñ…Ì¡mÉ••¥Ñ…t¤ì(€€€€€€€µ•¹Í…•´ ‰I••¥Ñ„É¥…‘„Á½È%”¥‘•¹Ñ¥™¥…‘„¹¼…Ó…±½¼¸ˆ¤ì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô…Ñ €¡•ÉÉ¼¤ì(€€€€€€€µ•¹Í…•´¡•ÉÉ¼¹µ•ÍÍ…”ñğ€‰É¥‡Ÿ¼Á½È%»¼•ÍÓ„‘¥ÍÁ½»µÙ•°…½É„¸ˆ°ÑÉÕ”¤ì(€€€ô™¥¹…±±äì(€€€€€€€‰½Ñ…¼¹‘¥Í…‰±•€ô™…±Í”ì(€€€€€€€‰½Ñ…¼¹Ñ•áÑ½¹Ñ•¹Ğ€ô€‰;¼•¹½¹ÑÉ½ÔüÉ¥…ÈÕµ„É••¥Ñ„½´%ˆì(€€€ô)ô()™Õ¹Ñ¥½¸½¹™¥ÕÉ…ÉÙ•¹Ñ½Ì ¤ì(€€€Á½É% ‰™½Éµ	ÕÍ…I••¥Ñ…Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰ÍÕ‰µ¥Ğˆ°…Íå¹Œ•Ù•¹Ñ¼€ôøì(€€€€€€€•Ù•¹Ñ¼¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì(€€€€€€€•ÍÑ…‘¼¹‰ÕÍ„€ôÁ½É% ‰‰ÕÍ…I••¥Ñ…Ìˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ô	½½±•…¸¡•ÍÑ…‘¼¹‰ÕÍ„¤ì(€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€€€€€…İ…¥Ğ‰ÕÍ…É…Ñ…±½½µÁ±¼¡•ÍÑ…‘¼¹‰ÕÍ„¤ì(€€€ô¤ì(€€€Á½É% ‰‰ÕÍ…I••¥Ñ…Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¥¹ÁÕĞˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€•ÍÑ…‘¼¹‰ÕÍ„€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ô	½½±•…¸¡•ÍÑ…‘¼¹‰ÕÍ„¤ì(€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô¤ì(€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ…Ñ•½É¥…tˆ¤¹™½É… ¡‰½Ñ…¼€ôø‰½Ñ…¼¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ…Ñ•½É¥…tˆ¤¹™½É… ¡¥Ñ•´€ôø¥Ñ•´¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ‰…Ñ¥Ù¼ˆ¤¤ì(€€€€€€€‰½Ñ…¼¹±…ÍÍ1¥ÍĞ¹…‘ ‰…Ñ¥Ù¼ˆ¤ì(€€€€€€€•ÍÑ…‘¼¹…Ñ•½É¥„€ô‰½Ñ…¼¹‘…Ñ…Í•Ğ¹…Ñ•½É¥„ì(€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ôÑÉÕ”ì(€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô¤¤ì(€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µÑ¥Á½tˆ¤¹™½É… ¡‰½Ñ…¼€ôø‰½Ñ…¼¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µÑ¥Á½tˆ¤¹™½É… ¡¥Ñ•´€ôø¥Ñ•´¹±…ÍÍ1¥ÍĞ¹É•µ½Ù” ‰…Ñ¥Ù¼ˆ¤¤ì(€€€€€€€‰½Ñ…¼¹±…ÍÍ1¥ÍĞ¹…‘ ‰…Ñ¥Ù¼ˆ¤ì(€€€€€€€•ÍÑ…‘¼¹Ñ¥Á¼€ô‰½Ñ…¼¹‘…Ñ…Í•Ğ¹Ñ¥Á¼ì(€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ôÑÉÕ”ì(€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô¤¤ì(€€€Á½É% ‰™¥±ÑÉ½Q•µÁ¼ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°•Ù•¹Ñ¼€ôøì•ÍÑ…‘¼¹Ñ•µÁ¼€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹Ù…±Õ”ì•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ôÑÉÕ”ìÉ•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ìô¤ì(€€€Á½É% ‰Í½µ•¹Ñ•¥ÍÁ½¹¥Ù•¥Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°•Ù•¹Ñ¼€ôøì•ÍÑ…‘¼¹Í½µ•¹Ñ•¥ÍÁ½¹¥Ù•¥Ì€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹¡•­•ì•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ôÑÉÕ”ìÉ•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ìô¤ì(€€€Á½É% ‰±¥µÁ…É¥±ÑÉ½Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€€€•ÍÑ…‘¼¹…Ñ•½É¥„€ô€‰Ñ½‘…Ìˆì(€€€€€€€•ÍÑ…‘¼¹Ñ¥Á¼€ô€‰Ñ½‘…Ìˆì(€€€€€€€•ÍÑ…‘¼¹Ñ•µÁ¼€ô€‰Ñ½‘½Ìˆì(€€€€€€€•ÍÑ…‘¼¹‰ÕÍ„€ô€ˆˆì(€€€€€€€•ÍÑ…‘¼¹Í½µ•¹Ñ•¥ÍÁ½¹¥Ù•¥Ì€ô™…±Í”ì(€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ô™…±Í”ì(€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€Á½É% ‰‰ÕÍ…I••¥Ñ…Ìˆ¤¹Ù…±Õ”€ô€ˆˆì(€€€€€€€Á½É% ‰™¥±ÑÉ½Q•µÁ¼ˆ¤¹Ù…±Õ”€ô€‰Ñ½‘½Ìˆì(€€€€€€€Á½É% ‰Í½µ•¹Ñ•¥ÍÁ½¹¥Ù•¥Ìˆ¤¹¡•­•€ô™…±Í”ì(€€€€€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ…Ñ•½É¥…t°m‘…Ñ„µÑ¥Á½tˆ¤¹™½É… ¡‰½Ñ…¼€ôø‰½Ñ…¼¹±…ÍÍ1¥ÍĞ¹Ñ½±” ‰…Ñ¥Ù¼ˆ°‰½Ñ…¼¹‘…Ñ…Í•Ğ¹…Ñ•½É¥„€ôôô€‰Ñ½‘…Ìˆñğ‰½Ñ…¼¹‘…Ñ…Í•Ğ¹Ñ¥Á¼€ôôô€‰Ñ½‘…Ìˆ¤¤ì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô¤ì((€€€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€½¹ÍĞÙ•É5…¥Ì€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µÙ•Èµµ…¥Ìµ…Ñ•½É¥…tˆ¤ì(€€€€€€€¥˜€¡Ù•É5…¥Ì¤ì(€€€€€€€€€€€•ÍÑ…‘¼¹…Ñ•½É¥„€ôÙ•É5…¥Ì¹‘…Ñ…Í•Ğ¹Ù•É5…¥Í…Ñ•½É¥„ì(€€€€€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ôÑÉÕ”ì(€€€€€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€€€€€‘½Õµ•¹Ğ¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ…Ñ•½É¥…tˆ¤¹™½É… ¡‰½Ñ…¼€ôø‰½Ñ…¼¹±…ÍÍ1¥ÍĞ¹Ñ½±” ‰…Ñ¥Ù¼ˆ°‰½Ñ…¼¹‘…Ñ…Í•Ğ¹…Ñ•½É¥„€ôôô•ÍÑ…‘¼¹…Ñ•½É¥„¤¤ì(€€€€€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€€€€€€€€€Á½É% ‰Ñ¥ÑÕ±½I•ÍÕ±Ñ…‘½Ìˆ¤¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆ°‰±½¬è€‰ÍÑ…ÉĞˆô¤ì(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€ô(€€€€€€€½¹ÍĞ•‘¥Ñ…É•ÍÁ•¹Í„€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µ•‘¥Ñ…Èµ‘•ÍÁ•¹Í…tˆ¤ì(€€€€€€€¥˜€¡•‘¥Ñ…É•ÍÁ•¹Í„¤ì(€€€€€€€€€€€…‰É¥É•ÍÁ•¹Í„ ¤ì(€€€€€€€€€€€İ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕĞ  ¤€ôøÁ½É% ‰±¥ÍÑ…•ÍÁ•¹Í„ˆ¤¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µ¹½µ”µ‘•ÍÁ•¹Í„ôˆ‘íML¹•Í…Á”¡•‘¥Ñ…É•ÍÁ•¹Í„¹‘…Ñ…Í•Ğ¹•‘¥Ñ…É•ÍÁ•¹Í„¥ô‰u€¤ü¹™½ÕÌ ¤°€À¤ì(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€ô(€€€€€€€½¹ÍĞ™…Ù½É¥Ñ…È€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µ™…Ù½É¥Ñ…Étˆ¤ì(€€€€€€€¥˜€¡™…Ù½É¥Ñ…È¤ì(€€€€€€€€€€€•Ù•¹Ñ¼¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤ì(€€€€€€€€€€€…±Ñ•É¹…É…Ù½É¥Ñ¼¡™…Ù½É¥Ñ…È¹‘…Ñ…Í•Ğ¹™…Ù½É¥Ñ…È¤ì(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€ô(€€€€€€€½¹ÍĞ…É€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µÉ••¥Ñ„µ¥‘tˆ¤ì(€€€€€€€¥˜€¡…É¤…‰É¥É•Ñ…±¡”¡…É¹‘…Ñ…Í•Ğ¹É••¥Ñ…%¤ì(€€€ô¤ì(€€€‘½Õµ•¹Ğ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰­•å‘½İ¸ˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€¥˜€ ¡•Ù•¹Ñ¼¹­•ä€ôôô€‰¹Ñ•Èˆñğ•Ù•¹Ñ¼¹­•ä€ôôô€ˆ€ˆ¤€˜˜•Ù•¹Ñ¼¹Ñ…É•Ğ¹µ…Ñ¡•Ì ‰m‘…Ñ„µÉ••¥Ñ„µ¥‘tˆ¤¤ì(€€€€€€€€€€€•Ù•¹Ñ¼¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì(€€€€€€€€€€€…‰É¥É•Ñ…±¡”¡•Ù•¹Ñ¼¹Ñ…É•Ğ¹‘…Ñ…Í•Ğ¹É••¥Ñ…%¤ì(€€€€€€€ô(€€€ô¤ì((€€€Á½É% ‰™•¡…É•Ñ…±¡”ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°™•¡…É•Ñ…±¡”¤ì(€€€Á½É% ‰™…Ù½É¥Ñ…É•Ñ…±¡”ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø…±Ñ•É¹…É…Ù½É¥Ñ¼¡•ÍÑ…‘¼¹É••¥Ñ…ÑÕ…°¹¥¤¤ì(€€€Á½É% ‰Á…ÍÍ½¹Ñ•É¥½Èˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøµ½Ù•ÉA…ÍÍ¼ ´Ä¤¤ì(€€€Á½É% ‰ÁÉ½á¥µ½A…ÍÍ¼ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøµ½Ù•ÉA…ÍÍ¼ Ä¤¤ì(€€€Á½É% ‰¥¹‘¥…‘½É•ÍA…ÍÍ½Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€½¹ÍĞ‰½Ñ…¼€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µÁ…ÍÍ½tˆ¤ì(€€€€€€€¥˜€ …‰½Ñ…¼¤É•ÑÕÉ¸ì(€€€€€€€•ÍÑ…‘¼¹Á…ÍÍ½ÑÕ…°€ô9Õµ‰•È¡‰½Ñ…¼¹‘…Ñ…Í•Ğ¹Á…ÍÍ¼¤ì(€€€€€€€É•¹‘•É¥é…ÉA…ÍÍ¼ ¤ì(€€€ô¤ì(€€€Á½É% ‰¥¹¥¥…É5½‘½½é¥¹¡„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…‰É¥É5½‘½½é¥¹¡„¤ì(€€€Á½É% ‰™•¡…É5½‘½½é¥¹¡„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°™•¡…É5½‘½½é¥¹¡„¤ì(€€€Á½É% ‰Ù•É%¹É•‘¥•¹Ñ•Í½é¥¹¡„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø…‰É¥É½¹ÍÕ±Ñ…½é¥¹¡„ ‰¥¹É•‘¥•¹Ñ•Ìˆ¤¤ì(€€€Á½É% ‰Ù•ÉUÑ•¹Í¥±¥½Í½é¥¹¡„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø…‰É¥É½¹ÍÕ±Ñ…½é¥¹¡„ ‰ÕÑ•¹Í¥±¥½Ìˆ¤¤ì(€€€Á½É% ‰½é¥¹¡…¹Ñ•É¥½Èˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøµ½Ù•ÉA…ÍÍ¼ ´Ä¤¤ì(€€€Á½É% ‰½é¥¹¡…AÉ½á¥µ¼ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøµ½Ù•ÉA…ÍÍ¼ Ä¤¤ì(€€€Á½É% ‰…‘¥¥½¹…É…±Ñ…¹Ñ•Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…‘¥¥½¹…É…±Ñ…¹Ñ•Í1¥ÍÑ„¤ì(€€€Á½É% ‰™¥¹…±¥é…ÉI••¥Ñ„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøÁ½É% ‰™¥¹…±¥é…É¥…±½œˆ¤¹Í¡½İ5½‘…° ¤¤ì(€€€Á½É% ‰½¹™¥Éµ…ÉÑÕ…±¥é…É•ÍÁ•¹Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø½¹±Õ¥ÉI••¥Ñ„¡ÑÉÕ”¤¤ì(€€€Á½É% ‰¹…½ÑÕ…±¥é…É•ÍÁ•¹Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø½¹±Õ¥ÉI••¥Ñ„¡™…±Í”¤¤ì((€€€Á½É% ‰…‰É¥É•ÍÁ•¹Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…‰É¥É•ÍÁ•¹Í„¤ì(€€€Á½É% ‰…‰É¥É•ÍÁ•¹Í…Q½Á¼ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…‰É¥É•ÍÁ•¹Í„¤ì(€€€Á½É% ‰™½Éµ±¥µ•¹Ñ½…Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰ÍÕ‰µ¥Ğˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€•Ù•¹Ñ¼¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì(€€€€€€€…‘¥¥½¹…É±¥µ•¹Ñ½½½ÉµÕ±…É¥¼ ‰¹½µ•±¥µ•¹Ñ½…Í„ˆ°€‰ÅÕ…¹Ñ¥‘…‘•±¥µ•¹Ñ½…Í„ˆ°€‰Õ¹¥‘…‘•±¥µ•¹Ñ½…Í„ˆ°•Ù•¹Ñ¼¹Ñ…É•Ğ¤ì(€€€ô¤ì(€€€Á½É% ‰•¹½¹ÑÉ…ÉI••¥Ñ…Í•ÍÁ•¹Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€€€•ÍÑ…‘¼¹•á¥‰¥É1¥ÍÑ„€ôÑÉÕ”ì(€€€€€€€•ÍÑ…‘¼¹‰ÕÍ„€ô€ˆˆì(€€€€€€€•ÍÑ…‘¼¹…Ñ•½É¥„€ô€‰Ñ½‘…Ìˆì(€€€€€€€•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€ô€ÄÈì(€€€€€€€Á½É% ‰‰ÕÍ…I••¥Ñ…Ìˆ¤¹Ù…±Õ”€ô€ˆˆì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€€€€€Á½É% ‰Ñ¥ÑÕ±½I•ÍÕ±Ñ…‘½Ìˆ¤¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆ°‰±½¬è€‰ÍÑ…ÉĞˆô¤ì(€€€ô¤ì(€€€Á½É% ‰™½Éµ9½Ù½%Ñ•µ•ÍÁ•¹Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰ÍÕ‰µ¥Ğˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€•Ù•¹Ñ¼¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ì(€€€€€€€…‘¥¥½¹…É±¥µ•¹Ñ½½½ÉµÕ±…É¥¼ ‰¹½µ•%Ñ•µ•ÍÁ•¹Í„ˆ°€‰ÅÕ…¹Ñ¥‘…‘•%Ñ•µ•ÍÁ•¹Í„ˆ°€‰Õ¹¥‘…‘•%Ñ•µ•ÍÁ•¹Í„ˆ°•Ù•¹Ñ¼¹Ñ…É•Ğ¤ì(€€€ô¤ì(€€€Á½É% ‰±¥ÍÑ…•ÍÁ•¹Í„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°•Ù•¹Ñ¼€ôøì(€€€€€€€½¹ÍĞÍ…±Ù…È€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µÍ…±Ù…Èµ‘•ÍÁ•¹Í…tˆ¤ì(€€€€€€€¥˜€¡Í…±Ù…È¤ì(€€€€€€€€€€€½¹ÍĞ¥€ôÍ…±Ù…È¹‘…Ñ…Í•Ğ¹Í…±Ù…É•ÍÁ•¹Í„ì(€€€€€€€€€€€½¹ÍĞÉ…¥è€ôÍ…±Ù…È¹±½Í•ÍĞ ‰m‘…Ñ„µ‘•ÍÁ•¹Í„µ¥‘tˆ¤ì(€€€€€€€€€€€½¹ÍĞÅÕ…¹Ñ¥‘…‘”€ôÉ…¥è¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÅÕ…¹Ñ¥‘…‘”µ‘•ÍÁ•¹Í…tˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤ì(€€€€€€€€€€€ÑÉäì(€€€€€€€€€€€€€€€…ÑÕ…±¥é…É%Ñ•µ•ÍÁ•¹Í„¡¥°ì(€€€€€€€€€€€€€€€€€€€¹½µ”èÉ…¥è¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ¹½µ”µ‘•ÍÁ•¹Í…tˆ¤¹Ù…±Õ”¹ÑÉ¥´ ¤°(€€€€€€€€€€€€€€€€€€€ÅÕ…¹Ñ¥‘…‘”èÅÕ…¹Ñ¥‘…‘”€ôôô€ˆˆ€ü¹Õ±°€è9Õµ‰•È¡ÅÕ…¹Ñ¥‘…‘”¤°(€€€€€€€€€€€€€€€€€€€ÅÕ…¹Ñ¥‘…‘•½¹¡•¥‘„èÅÕ…¹Ñ¥‘…‘”€„ôô€ˆˆ°(€€€€€€€€€€€€€€€€€€€Õ¹¥‘…‘”èÉ…¥è¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÕ¹¥‘…‘”µ‘•ÍÁ•¹Í…tˆ¤¹Ù…±Õ”(€€€€€€€€€€€€€€€ô¤ì(€€€€€€€€€€€€€€€Á½É% ‰µ•¹Í…•µ•ÍÁ•¹Í„ˆ¤¹Ñ•áÑ½¹Ñ•¹Ğ€ô€‰±¥µ•¹Ñ¼…ÑÕ…±¥é…‘¼¸ˆì(€€€€€€€€€€€€€€€É•¹‘•É¥é…É•ÍÁ•¹Í„ ¤ì(€€€€€€€€€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€€€€€€€€€ô…Ñ €¡•ÉÉ¼¤ì(€€€€€€€€€€€€€€€Á½É% ‰µ•¹Í…•µ•ÍÁ•¹Í„ˆ¤¹Ñ•áÑ½¹Ñ•¹Ğ€ô•ÉÉ¼¹µ•ÍÍ…”ì(€€€€€€€€€€€ô(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€ô(€€€€€€€½¹ÍĞÉ•µ½Ù•È€ô•Ù•¹Ñ¼¹Ñ…É•Ğ¹±½Í•ÍĞ ‰m‘…Ñ„µÉ•µ½Ù•Èµ‘•ÍÁ•¹Í…tˆ¤ì(€€€€€€€¥˜€ …É•µ½Ù•È¤É•ÑÕÉ¸ì(€€€€€€€É•µ½Ù•É%Ñ•µ•ÍÁ•¹Í„¡É•µ½Ù•È¹‘…Ñ…Í•Ğ¹É•µ½Ù•É•ÍÁ•¹Í„¤ì(€€€€€€€Á½É% ‰µ•¹Í…•µ•ÍÁ•¹Í„ˆ¤¹Ñ•áÑ½¹Ñ•¹Ğ€ô€‰±¥µ•¹Ñ¼É•µ½Ù¥‘¼¸ˆì(€€€€€€€É•¹‘•É¥é…É•ÍÁ•¹Í„ ¤ì(€€€€€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€ô¤ì(€€€Á½É% ‰…ÉÉ•…É5…¥ÍI••¥Ñ…Ìˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì•ÍÑ…‘¼¹±¥µ¥Ñ•I•ÍÕ±Ñ…‘½Ì€¬ô€ÄÈìÉ•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ìô¤ì(€€€Á½É% ‰‰ÕÍ…ÉI••¥Ñ…%„ˆ¤¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°Í½±¥¥Ñ…ÉI••¥Ñ…%„¤ì(€€€İ¥¹‘½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰‘•ÍÁ•¹Í……±Ñ•É…‘„ˆ°€ ¤€ôøì(€€€€€€€…ÑÕ…±¥é…ÉI•ÍÕµ½•ÍÁ•¹Í„ ¤ì(€€€€€€€¥˜€¡•ÍÑ…‘¼¹É••¥Ñ…ÑÕ…°¤É•¹‘•É¥é…É%¹É•‘¥•¹Ñ•Í•Ñ…±¡” ¤ì(€€€ô¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸¥¹¥¥…È ¤ì(€€€½¹™¥ÕÉ…ÉÙ•¹Ñ½Ì ¤ì(€€€•ÍÑ…‘¼¹™…Ù½É¥Ñ½Ì€ô±•É…Ù½É¥Ñ½Ì ¤ì(€€€ÑÉäì(€€€€€€€½¹ÍĞÉ•ÍÁ½ÍÑ„€ô…İ…¥Ğ™•Ñ  ˆ¸½‘…Ñ„½É••¥Ñ…Ì¹©Í½¸ˆ°ì…¡”è€‰¹¼µÍÑ½É”ˆô¤ì(€€€€€€€¥˜€ …É•ÍÁ½ÍÑ„¹½¬¤Ñ¡É½Ü¹•ÜÉÉ½È ‰	…Í”‘”É••¥Ñ…Ì¥¹‘¥ÍÁ½»µÙ•°¸ˆ¤ì(€€€€€€€•ÍÑ…‘¼¹É••¥Ñ…Ì€ô…İ…¥ĞÉ•ÍÁ½ÍÑ„¹©Í½¸ ¤ì(€€€ô…Ñ €¡•ÉÉ¼¤ì(€€€€€€€µ•¹Í…•´¡•ÉÉ¼¹µ•ÍÍ…”ñğ€‰;¼™½¤Á½ÍÏµÙ•°…ÉÉ•…È…ÌÉ••¥Ñ…Ì¸ˆ°ÑÉÕ”¤ì(€€€€€€€Á½É% ‰É•ÍÕµ½I•ÍÕ±Ñ…‘½Ìˆ¤¹Ñ•áÑ½¹Ñ•¹Ğ€ô€‰M•´‘…‘½Ìˆì(€€€€€€€É•ÑÕÉ¸ì(€€€ô(€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì(€€€…İ…¥Ğ…ÉÉ•…É•ÍÁ•¹Í…I•µ½Ñ„ ¤ì(€€€É•¹‘•É¥é…ÉI•ÍÕ±Ñ…‘½Ì ¤ì((€€€½¹ÍĞÉ••¥Ñ…9…UÉ°€ô¹•ÜUI1M•…É¡A…É…µÌ¡±½…Ñ¥½¸¹¡…Í ¹É•Á±…” ½xŒ¼°€ˆˆ¤¤¹•Ğ ‰É••¥Ñ„ˆ¤ì(€€€¥˜€¡É••¥Ñ…9…UÉ°¤…‰É¥É•Ñ…±¡”¡É••¥Ñ…9…UÉ°¤ì)ô()¥¹¥¥…È ¤ì(