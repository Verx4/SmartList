const ALIASES = new Map([
    ["farofa", "farinha de mandioca"],
    ["farinha mandioca", "farinha de mandioca"],
    ["linguica calabresa", "calabresa"],
    ["linguica", "calabresa"],
    ["carne seca", "charque"],
    ["jabá", "charque"],
    ["jaba", "charque"],
    ["ovo", "ovos"],
    ["pao", "pão"],
    ["mussarela", "queijo"],
    ["muçarela", "queijo"],
    ["goma de tapioca", "tapioca"],
    ["flocos de milho", "flocão de milho"],
    ["oleo", "azeite"],
    ["macaxeira", "mandioca"],
    ["aipim", "mandioca"]
]);

const ROTULOS_CATEGORIA = Object.freeze({
    "cafe-da-manha": "Café da manhã",
    almoco: "Almoço",
    lanche: "Lanche",
    jantar: "Jantar"
});

function semAcentos(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function textoLimpo(valor) {
    return String(valor || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
        .replace(/[()]/g, " ")
        .replace(/\s+/g, " ");
}

export function normalizarIngrediente(valor) {
    const original = textoLimpo(valor);
    const comparavel = semAcentos(original);
    const aliasEncontrado = [...ALIASES.entries()].find(([alias]) => semAcentos(alias) === comparavel);
    const canonico = aliasEncontrado ? semAcentos(aliasEncontrado[1]) : comparavel;
    return canonico.replace(/\b(de|da|do)\b/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizarUnidade(valor) {
    const unidade = semAcentos(textoLimpo(valor)).replace(/\./g, "");
    if (["kg", "quilo", "quilos"].includes(unidade)) return { unidade: "g", fator: 1000 };
    if (["g", "grama", "gramas"].includes(unidade)) return { unidade: "g", fator: 1 };
    if (["l", "litro", "litros"].includes(unidade)) return { unidade: "ml", fator: 1000 };
    if (["ml", "mililitro", "mililitros"].includes(unidade)) return { unidade: "ml", fator: 1 };
    if (["un", "unidade", "unidades", "dente", "dentes", "fatia", "fatias", "maco", "macos"].includes(unidade)) {
        return { unidade: "unidade", fator: 1 };
    }
    return { unidade: unidade || "unidade", fator: 1 };
}

export function quantidadeCanonica(quantidade, unidade) {
    const numero = Math.max(0, Number(quantidade) || 0);
    const normalizada = normalizarUnidade(unidade);
    return { quantidade: numero * normalizada.fator, unidade: normalizada.unidade };
}

function chaveInventario(nome, unidade) {
    return `${normalizarIngrediente(nome)}::${normalizarUnidade(unidade).unidade}`;
}

export function criarInventario(itens = [], ingredientesManuais = []) {
    const inventario = new Map();
    for (const item of itens || []) {
        const nome = item?.nome || item?.produto || "";
        if (!nome) continue;
        const quantidadeConhecida = item.quantidadeConhecida !== false
            && item.quantidade !== null
            && item.quantidade !== undefined;
        const canonica = quantidadeCanonica(
            quantidadeConhecida ? item.quantidade ?? item.peso ?? 0 : 0,
            item.unidade || item.medida || "unidade"
        );
        const chave = chaveInventario(nome, canonica.unidade);
        const atual = inventario.get(chave);
        const ambasConhecidas = quantidadeConhecida && atual?.quantidadeConhecida !== false;
        inventario.set(chave, {
            nome,
            unidade: canonica.unidade,
            quantidade: ambasConhecidas ? (atual?.quantidade || 0) + canonica.quantidade : null,
            quantidadeConhecida: ambasConhecidas,
            presente: true,
            manual: false
        });
    }
    for (const nome of ingredientesManuais || []) {
        const ingrediente = textoLimpo(nome);
        if (!ingrediente) continue;
        const canonico = normalizarIngrediente(ingrediente);
        const existente = [...inventario.entries()].find(([chave]) => chave.startsWith(`${canonico}::`));
        if (existente) {
            existente[1].manual = true;
            existente[1].presente = true;
            continue;
        }
        inventario.set(`${canonico}::*`, {
            nome: ingrediente,
            unidade: "*",
            quantidade: null,
            quantidadeConhecida: false,
            presente: true,
            manual: true
        });
    }
    return inventario;
}

function localizarNoInventario(ingrediente, inventario) {
    const nome = normalizarIngrediente(ingrediente.nome);
    const necessario = quantidadeCanonica(ingrediente.quantidade, ingrediente.unidade);
    return inventario.get(`${nome}::${necessario.unidade}`)
        || inventario.get(`${nome}::*`)
        || [...inventario.entries()].find(([chave]) => chave.startsWith(`${nome}::`))?.[1]
        || null;
}

export function avaliarReceita(receita, inventario) {
    const obrigatorios = (receita.ingredientes || []).filter(item => item.obrigatorio && !item.basico);
    const itens = (receita.ingredientes || []).map(ingrediente => {
        const necessario = quantidadeCanonica(ingrediente.quantidade, ingrediente.unidade);
        const disponivel = ingrediente.basico
            ? { quantidade: Number.POSITIVE_INFINITY, unidade: necessario.unidade, quantidadeConhecida: true, presente: true }
            : localizarNoInventario(ingrediente, inventario);
        const unidadeCompativel = Boolean(disponivel)
            && (disponivel.quantidadeConhecida === false
                || disponivel.unidade === necessario.unidade
                || disponivel.unidade === "*"
                || disponivel.manual);
        const presente = unidadeCompativel && disponivel.presente !== false;
        const quantidadeConhecida = presente && disponivel.quantidadeConhecida !== false;
        const suficiente = !ingrediente.obrigatorio
            || ingrediente.basico
            || (quantidadeConhecida && disponivel.quantidade >= necessario.quantidade);
        const quantidadeDisponivel = quantidadeConhecida ? disponivel.quantidade : null;
        const falta = suficiente || (presente && !quantidadeConhecida)
            ? 0
            : Math.max(0, necessario.quantidade - (quantidadeDisponivel || 0));
        return {
            ...ingrediente,
            disponivel: quantidadeDisponivel,
            presente,
            quantidadeConhecida,
            quantidadeDesconhecida: presente && !quantidadeConhecida,
            unidadeCanonica: necessario.unidade,
            quantidadeCanonica: necessario.quantidade,
            falta,
            suficiente
        };
    });
    const tem = itens.filter(item => item.obrigatorio && !item.basico && item.presente).length;
    const faltantes = itens.filter(item => item.obrigatorio && !item.basico && (
        !item.presente || (item.quantidadeConhecida && !item.suficiente)
    ));
    const quantidadesDesconhecidas = itens.filter(item =>
        item.obrigatorio && !item.basico && item.quantidadeDesconhecida
    );
    const total = obrigatorios.length;
    return {
        receita,
        itens,
        tem,
        total,
        faltantes,
        quantidadesDesconhecidas,
        compatibilidade: total ? tem / total : 1,
        podeFazer: faltantes.length === 0 && quantidadesDesconhecidas.length === 0
    };
}

export function ingredientesDoTexto(valor) {
    return String(valor || "").split(",").map(textoLimpo).filter(Boolean);
}

export function tempoCompativel(minutos, filtro) {
    const tempo = Number(minutos) || 0;
    if (!filtro || filtro === "todos") return true;
    if (filtro === "ate-20") return tempo <= 20;
    if (filtro === "ate-30") return tempo <= 30;
    if (filtro === "20-30") return tempo >= 20 && tempo <= 30;
    if (filtro === "40-50") return tempo >= 40 && tempo <= 50;
    if (filtro === "60-mais") return tempo >= 60;
    return true;
}

function distanciaEdicao(a, b) {
    const anterior = Array.from({ length: b.length + 1 }, (_, indice) => indice);
    for (let i = 1; i <= a.length; i += 1) {
        const atual = [i];
        for (let j = 1; j <= b.length; j += 1) {
            atual[j] = Math.min(
                atual[j - 1] + 1,
                anterior[j] + 1,
                anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        anterior.splice(0, anterior.length, ...atual);
    }
    return anterior[b.length];
}

function correspondeBusca(receita, busca) {
    const campos = [receita.nome, ...(receita.ingredientes || []).map(item => item.nome)]
        .map(item => semAcentos(textoLimpo(item)));
    if (campos.some(campo => campo.includes(busca))) return true;
    return campos.some(campo => campo.split(" ").some(palavra =>
        busca.length >= 5
        && Math.abs(palavra.length - busca.length) <= 1
        && distanciaEdicao(palavra, busca) <= 1
    ));
}

export function filtrarEOrdenarReceitas(receitas, inventario, filtros = {}) {
    const busca = semAcentos(textoLimpo(filtros.busca));
    return (receitas || [])
        .filter(receita => !busca || correspondeBusca(receita, busca))
        .filter(receita => !filtros.categoria || filtros.categoria === "todas" || receita.categoria === filtros.categoria)
        .filter(receita => !filtros.tipo || filtros.tipo === "todas" || receita.tipo === filtros.tipo)
        .filter(receita => tempoCompativel(receita.tempoMinutos, filtros.tempo))
        .map(receita => avaliarReceita(receita, inventario))
        .filter(resultado => !filtros.somenteDisponiveis || resultado.podeFazer)
        .sort((a, b) => {
            const porFalta = a.faltantes.length - b.faltantes.length;
            if (porFalta) return porFalta;
            const porCompatibilidade = b.compatibilidade - a.compatibilidade;
            if (porCompatibilidade) return porCompatibilidade;
            return a.receita.tempoMinutos - b.receita.tempoMinutos;
        });
}

export function agruparSugestoes(receitas, inventario, limite = 3) {
    const ordenadas = filtrarEOrdenarReceitas(receitas, inventario);
    return Object.keys(ROTULOS_CATEGORIA).reduce((grupos, categoria) => {
        grupos[categoria] = ordenadas
            .filter(item => item.receita.categoria === categoria)
            .slice(0, Math.max(0, Number(limite) || 3));
        return grupos;
    }, {});
}

export function somarAoEstoque(estoque = [], itens = []) {
    const resultado = (estoque || []).map(item => ({ ...item }));
    for (const item of itens || []) {
        const quantidadeConhecida = item.quantidadeConhecida !== false
            && item.quantidade !== null
            && item.quantidade !== undefined;
        const canonica = quantidadeCanonica(
            quantidadeConhecida ? item.quantidade ?? item.peso ?? 0 : 0,
            item.unidade || item.medida || "unidade"
        );
        if (!item.nome || (quantidadeConhecida && canonica.quantidade <= 0)) continue;
        const existente = resultado.find(entrada =>
            normalizarIngrediente(entrada.nome) === normalizarIngrediente(item.nome)
        );
        if (existente) {
            if (existente.quantidadeConhecida !== false && quantidadeConhecida
                && normalizarUnidade(existente.unidade).unidade === canonica.unidade) {
                existente.quantidade = Math.max(0, Number(existente.quantidade) || 0) + canonica.quantidade;
            } else if (existente.quantidadeConhecida === false || !quantidadeConhecida) {
                existente.quantidade = null;
                existente.quantidadeConhecida = false;
            }
            existente.atualizadoEm = new Date().toISOString();
        } else {
            resultado.push({
                id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${resultado.length}`,
                nome: item.nome,
                chaveProduto: normalizarIngrediente(item.nome),
                quantidade: quantidadeConhecida ? canonica.quantidade : null,
                quantidadeConhecida,
                unidade: canonica.unidade,
                categoria: item.categoria || "Alimento",
                atualizadoEm: new Date().toISOString()
            });
        }
    }
    return resultado;
}

export function descontarDoEstoque(estoque = [], ingredientes = []) {
    return (estoque || []).map(item => {
        if (item.quantidadeConhecida === false || item.quantidade === null) return { ...item };
        const ingrediente = (ingredientes || []).find(candidato =>
            normalizarIngrediente(candidato.nome) === normalizarIngrediente(item.nome)
            && quantidadeCanonica(candidato.quantidade, candidato.unidade).unidade === normalizarUnidade(item.unidade).unidade
            && candidato.obrigatorio !== false
            && !candidato.basico
        );
        if (!ingrediente) return { ...item };
        const necessario = quantidadeCanonica(ingrediente.quantidade, ingrediente.unidade).quantidade;
        return {
            ...item,
            quantidade: Math.max(0, (Number(item.quantidade) || 0) - necessario),
            atualizadoEm: new Date().toISOString()
        };
    });
}

export function integrarFaltantesNaLista(lista = [], faltantes = []) {
    const resultado = (lista || []).map(item => ({ ...item }));
    for (const falta of faltantes || []) {
        const existente = resultado.find(item =>
            normalizarIngrediente(item.nome) === normalizarIngrediente(falta.nome)
        );
        const quantidade = Math.max(0, Number(falta.falta ?? falta.quantidade) || 0);
        const unidade = falta.unidadeCanonica || normalizarUnidade(falta.unidade).unidade;
        if (existente) {
            existente.quantidade = Math.max(0, Number(existente.quantidade) || 0) + quantidade;
            existente.unidade = unidade;
        } else {
            resultado.push({ nome: falta.nome, quantidade, unidade });
        }
    }
    return resultado;
}

export function formatarQuantidade(quantidade, unidade) {
    if (quantidade === null || quantidade === undefined) return "Quantidade não informada";
    const numero = Number(quantidade) || 0;
    const texto = Number.isInteger(numero)
        ? String(numero)
        : numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    const rotulos = {
        g: "g",
        ml: "ml",
        unidade: numero === 1 ? "unidade" : "unidades",
        dente: numero === 1 ? "dente" : "dentes",
        fatia: numero === 1 ? "fatia" : "fatias",
        "maço": numero === 1 ? "maço" : "maços",
        pitada: numero === 1 ? "pitada" : "pitadas"
    };
    return `${texto} ${rotulos[unidade] || unidade}`.trim();
}

export function rotuloCategoria(categoria) {
    return ROTULOS_CATEGORIA[categoria] || categoria;
}

export function proximoPasso(atual, total, direcao) {
    return Math.min(Math.max(0, Number(atual) + Number(direcao)), Math.max(0, Number(total) - 1));
}

export function modoResponsivo(largura) {
    return Number(largura) <= 640 ? "mobile" : "web";
}
