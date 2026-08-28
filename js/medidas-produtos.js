export const MEDIDA_UNIDADE = "unidade";
export const MEDIDA_KG = "kg";

const MARCADORES_UNIDADE = /\((?:unidade|ma[cç]o|bandeja)\)/i;
const MARCADOR_KG = /\(kg\)/i;
const MARCADOR_FLEXIVEL = /\(kg\s*ou\s*unidade\)/i;
const MARCADORES_MEDIDA = /\s*\((?:kg\s*ou\s*unidade|kg|unidade|ma[cç]o|bandeja)\)\s*/gi;

const PRODUTOS_UNIDADE_FIXA = new Set([
    "acelga",
    "abacaxi",
    "agriao",
    "alface",
    "brocolis",
    "coco",
    "couve",
    "couve flor",
    "espinafre",
    "morango",
    "rucula"
]);

const PRODUTOS_KG_FIXO = new Set([
    "abobora",
    "acerola",
    "abobrinha",
    "alho",
    "banana",
    "batata",
    "batata doce",
    "batata inglesa",
    "berinjela",
    "beterraba",
    "caju",
    "cebola",
    "cenoura",
    "chuchu",
    "goiaba",
    "inhame",
    "jilo",
    "kiwi",
    "laranja",
    "limao",
    "macaxeira",
    "mandioca",
    "mandioquinha",
    "maracuja",
    "maca",
    "pera",
    "pepino",
    "pimentao",
    "quiabo",
    "tomate",
    "uva"
]);

const PRODUTOS_MEDIDA_FLEXIVEL = new Set([
    "abacate",
    "acem",
    "alcatra",
    "asa",
    "atum fresco",
    "bacalhau",
    "bacon",
    "bisteca suina",
    "bolo",
    "bolo de aniversario",
    "camarao",
    "calabresa",
    "caranguejo",
    "carne bovina",
    "carne moida",
    "carne suina",
    "coracao de frango",
    "contra file",
    "costela bovina",
    "costela suina",
    "coxa",
    "coxa e sobrecoxa",
    "coxao duro",
    "coxao mole",
    "cuca",
    "cupim",
    "dourado",
    "drumette",
    "figado de frango",
    "file de peixe",
    "file de peito",
    "file mignon",
    "fraldinha",
    "frango inteiro",
    "gorgonzola",
    "lagarto",
    "linguica",
    "lombo suino",
    "lula",
    "maminha",
    "mamao",
    "manga",
    "meio da asa",
    "melao",
    "melancia",
    "merluza",
    "mexilhao",
    "moela",
    "mortadela",
    "mussarela",
    "musculo",
    "ossobuco",
    "paleta",
    "parmesao",
    "patinho",
    "peito de frango",
    "peito de peru",
    "peixe",
    "pernil",
    "pescada",
    "picanha",
    "polvo",
    "presunto",
    "provolone",
    "pao de queijo",
    "pao frances",
    "queijo",
    "queijo coalho",
    "queijo minas",
    "queijo prato",
    "repolho",
    "repolho roxo",
    "rosca",
    "salame",
    "salmao",
    "sardinha fresca",
    "siri",
    "sobrecoxa",
    "tilapia",
    "tulipa"
]);

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function categoriaEhHortifruti(categoria) {
    return /(hortifruti|verdura|legume|fruta)/i.test(
        String(categoria || "")
    );
}

export function limparMarcadorMedida(nome) {
    return String(nome || "")
        .replace(MARCADORES_MEDIDA, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function obterRegraMedida(nome) {
    const textoOriginal = String(nome || "");

    if (MARCADOR_FLEXIVEL.test(textoOriginal)) {
        return {
            tipo: "flexivel",
            medida: null,
            motivo: "Escolha se este item será comprado por kg ou por unidade."
        };
    }

    if (MARCADORES_UNIDADE.test(textoOriginal)) {
        return {
            tipo: "fixa",
            medida: MEDIDA_UNIDADE,
            motivo: "Itens por maço ou bandeja são registrados como unidade."
        };
    }

    if (MARCADOR_KG.test(textoOriginal)) {
        return {
            tipo: "fixa",
            medida: MEDIDA_KG,
            motivo: "Este item é registrado por kg."
        };
    }

    const nomeNormalizado = normalizarTexto(
        limparMarcadorMedida(textoOriginal)
    );

    if (PRODUTOS_UNIDADE_FIXA.has(nomeNormalizado)) {
        return {
            tipo: "fixa",
            medida: MEDIDA_UNIDADE,
            motivo: "Este item é registrado como unidade."
        };
    }

    if (PRODUTOS_KG_FIXO.has(nomeNormalizado)) {
        return {
            tipo: "fixa",
            medida: MEDIDA_KG,
            motivo: "Este item é registrado por kg."
        };
    }

    if (PRODUTOS_MEDIDA_FLEXIVEL.has(nomeNormalizado)) {
        return {
            tipo: "flexivel",
            medida: null,
            motivo: "Escolha se este item será comprado por kg ou por unidade."
        };
    }

    return {
        tipo: "livre",
        medida: null,
        motivo: "Escolha a forma usada nesta compra."
    };
}

export function normalizarMedidaProduto(produto = {}) {
    const medidaInformada = String(
        typeof produto === "string"
            ? produto
            : produto.medida || produto.unitType || produto.unit || produto.tipoMedida || ""
    ).toLocaleLowerCase("pt-BR");

    if (medidaInformada === MEDIDA_KG) {
        return MEDIDA_KG;
    }

    if (
        medidaInformada === MEDIDA_UNIDADE
        || medidaInformada === "un"
    ) {
        return MEDIDA_UNIDADE;
    }

    /*
     * Compatibilidade: produtos antigos não possuem o campo "medida".
     * Mantemos o comportamento anterior sem migrar ou apagar os dados.
     */
    if (
        Number(produto.peso) > 0
        || categoriaEhHortifruti(produto.categoria)
    ) {
        return MEDIDA_KG;
    }

    return MEDIDA_UNIDADE;
}

export function produtoEhPorPeso(produto = {}) {
    return normalizarMedidaProduto(produto) === MEDIDA_KG;
}

export function medidaPadraoParaNovoProduto(
    nome,
    categoria,
    medidaAtual = ""
) {
    const regra = obterRegraMedida(nome);

    if (regra.medida) {
        return regra.medida;
    }

    if ([MEDIDA_KG, MEDIDA_UNIDADE].includes(medidaAtual)) {
        return medidaAtual;
    }

    return categoriaEhHortifruti(categoria)
        ? MEDIDA_KG
        : MEDIDA_UNIDADE;
}

export function rotuloMedida(medida) {
    return medida === MEDIDA_KG
        ? "Kg"
        : "Unidade";
}
