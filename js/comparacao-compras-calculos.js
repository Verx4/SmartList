import {
    dataDaCompra,
    itensDaCompra,
    precoUnitarioDoItem,
    quantidadeCompradaDoItem,
    subtotalDoItem,
    totalDaCompra
} from "./historico-calculos.js";

const UNIDADES = Object.freeze({
    g: { grupo: "massa", fator: 0.001, referencia: "kg" },
    kg: { grupo: "massa", fator: 1, referencia: "kg" },
    ml: { grupo: "volume", fator: 0.001, referencia: "L" },
    l: { grupo: "volume", fator: 1, referencia: "L" },
    unidade: { grupo: "unidade", fator: 1, referencia: "un" }
});

const ALIASES_UNIDADE = new Map([
    ["g", "g"], ["gr", "g"], ["grama", "g"], ["gramas", "g"],
    ["kg", "kg"], ["quilo", "kg"], ["quilos", "kg"],
    ["ml", "ml"], ["mililitro", "ml"], ["mililitros", "ml"],
    ["l", "l"], ["lt", "l"], ["litro", "l"], ["litros", "l"],
    ["un", "unidade"], ["und", "unidade"], ["unid", "unidade"],
    ["unidade", "unidade"], ["unidades", "unidade"]
]);

const CAMPOS_QUANTIDADE_EMBALAGEM = [
    "quantidadeEmbalagem",
    "conteudoEmbalagem",
    "tamanhoEmbalagem",
    "pesoEmbalagem"
];
const CAMPOS_UNIDADE_EMBALAGEM = [
    "unidadeEmbalagem",
    "unidadeMedida",
    "unidadeDaEmbalagem"
];
const PADRAO_EMBALAGEM = /(\d+(?:[.,]\d+)?)\s*(kg|quilos?|g|gr|gramas?|ml|mililitros?|l|lt|litros?|un|und|unid|unidades?)(?=\b|$)/i;
const LIMIAR_EMPATE = 0.005;

const numeroPositivo = valor => {
    const numero = Number(String(valor ?? "").replace(",", "."));
    return Number.isFinite(numero) && numero > 0 ? numero : 0;
};

const normalizarTexto = valor => String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizarUnidade = valor => ALIASES_UNIDADE.get(
    normalizarTexto(valor)
) || "";

function embalagemExplicita(item) {
    const quantidade = CAMPOS_QUANTIDADE_EMBALAGEM
        .map(campo => numeroPositivo(item?.[campo]))
        .find(Boolean);
    const unidade = CAMPOS_UNIDADE_EMBALAGEM
        .map(campo => normalizarUnidade(item?.[campo]))
        .find(Boolean);

    return quantidade && unidade ? { quantidade, unidade } : null;
}

function embalagemNoNome(nome) {
    const texto = String(nome || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    const correspondencia = texto.match(PADRAO_EMBALAGEM);

    if (!correspondencia) return null;

    const quantidade = numeroPositivo(correspondencia[1]);
    const unidade = normalizarUnidade(correspondencia[2]);

    if (!quantidade || !unidade) return null;

    return {
        quantidade,
        unidade,
        nomeBase: normalizarTexto(texto.replace(PADRAO_EMBALAGEM, " "))
    };
}

function apresentacaoDoItem(item = {}) {
    const nomeNormalizado = normalizarTexto(item.nome);
    const encontradaNoNome = embalagemNoNome(item.nome);
    const embalagem = embalagemExplicita(item) || encontradaNoNome;
    const medida = normalizarUnidade(item.medida || item.tipoMedida);
    const unidade = embalagem?.unidade || medida || "unidade";
    const meta = UNIDADES[unidade];
    const quantidadeApresentacao = embalagem?.quantidade || 1;
    const nomeBase = encontradaNoNome?.nomeBase || nomeNormalizado;
    const embalagemDetectada = Boolean(embalagem);

    if (!nomeBase || !meta) return null;

    const quantidadeComprada = quantidadeCompradaDoItem(item);
    const pesoComprado = numeroPositivo(item.peso);
    const pacotesComprados = quantidadeComprada > 0 ? quantidadeComprada : 1;
    const quantidadeBase = embalagemDetectada
        ? quantidadeApresentacao * meta.fator * pacotesComprados
        : meta.grupo === "massa" && pesoComprado > 0
            ? pesoComprado * meta.fator
            : quantidadeApresentacao * meta.fator * pacotesComprados;
    const subtotal = subtotalDoItem(item);
    const precoNormalizado = quantidadeBase > 0 && subtotal > 0
        ? subtotal / quantidadeBase
        : precoUnitarioDoItem(item) / (quantidadeApresentacao * meta.fator);

    if (!Number.isFinite(precoNormalizado) || precoNormalizado <= 0) {
        return null;
    }

    return {
        chave: nomeBase,
        nome: item.nome || "Item",
        grupo: meta.grupo,
        referencia: meta.referencia,
        precoNormalizado,
        custo: subtotal > 0 ? subtotal : precoNormalizado * quantidadeBase,
        quantidadeBase,
        apresentacao: embalagemDetectada
            ? `${quantidadeApresentacao.toLocaleString("pt-BR")} ${unidade === "unidade" ? "un" : unidade}`
            : meta.grupo === "massa"
                ? "Preço por kg"
                : meta.grupo === "volume"
                    ? "Preço por L"
                    : "Preço por unidade"
    };
}

function itensNormalizados(compra = {}) {
    const itens = new Map();

    itensDaCompra(compra).forEach(item => {
        const atual = apresentacaoDoItem(item);

        if (!atual) return;

        const existente = itens.get(atual.chave);

        if (!existente) {
            itens.set(atual.chave, atual);
            return;
        }

        if (existente.grupo !== atual.grupo) {
            existente.incompativel = true;
            return;
        }

        existente.custo += atual.custo;
        existente.quantidadeBase += atual.quantidadeBase;
        existente.precoNormalizado = existente.quantidadeBase > 0
            ? existente.custo / existente.quantidadeBase
            : existente.precoNormalizado;
    });

    return itens;
}

function resumoCompra(compra = {}) {
    const data = dataDaCompra(compra);

    return {
        id: compra.id || "",
        data: Number.isNaN(data.getTime()) ? null : data,
        mercado: compra.supermercado || compra.mercado || compra.estabelecimento || "Mercado não informado",
        total: totalDaCompra(compra)
    };
}

export function compararCompras(compra1 = {}, compra2 = {}) {
    const itens1 = itensNormalizados(compra1);
    const itens2 = itensNormalizados(compra2);
    const chaves = new Set([...itens1.keys(), ...itens2.keys()]);
    const comparaveis = [];
    const exclusivosCompra1 = [];
    const exclusivosCompra2 = [];
    const naoComparaveis = [];

    chaves.forEach(chave => {
        const item1 = itens1.get(chave);
        const item2 = itens2.get(chave);

        if (!item1) {
            exclusivosCompra2.push(item2);
            return;
        }

        if (!item2) {
            exclusivosCompra1.push(item1);
            return;
        }

        if (item1.incompativel || item2.incompativel || item1.grupo !== item2.grupo) {
            naoComparaveis.push({
                nome: item1.nome || item2.nome,
                motivo: "Medidas ou embalagens incompatíveis"
            });
            return;
        }

        const saldo = item2.precoNormalizado - item1.precoNormalizado;
        const empate = Math.abs(saldo) < LIMIAR_EMPATE;

        comparaveis.push({
            chave,
            nome: item1.nome || item2.nome,
            precoCompra1: item1.precoNormalizado,
            precoCompra2: item2.precoNormalizado,
            apresentacaoCompra1: item1.apresentacao,
            apresentacaoCompra2: item2.apresentacao,
            unidadeBase: item1.referencia,
            diferenca: empate ? 0 : Math.abs(saldo),
            melhor: empate ? "empate" : saldo < 0 ? "compra-2" : "compra-1"
        });
    });

    comparaveis.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    exclusivosCompra1.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    exclusivosCompra2.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const valorComparavel1 = comparaveis.reduce((total, item) => total + item.precoCompra1, 0);
    const valorComparavel2 = comparaveis.reduce((total, item) => total + item.precoCompra2, 0);
    const saldoReal = valorComparavel2 - valorComparavel1;
    const compra1Resumo = resumoCompra(compra1);
    const compra2Resumo = resumoCompra(compra2);

    return {
        compra1: compra1Resumo,
        compra2: compra2Resumo,
        diferencaTotal: compra2Resumo.total - compra1Resumo.total,
        comparaveis,
        exclusivosCompra1,
        exclusivosCompra2,
        naoComparaveis,
        valorComparavel1,
        valorComparavel2,
        saldoReal: Math.abs(saldoReal) < LIMIAR_EMPATE ? 0 : saldoReal,
        economiaReal: saldoReal < -LIMIAR_EMPATE ? Math.abs(saldoReal) : 0,
        gastoExtraReal: saldoReal > LIMIAR_EMPATE ? saldoReal : 0,
        quantidadeComparada: comparaveis.length,
        maisBaratosCompra1: comparaveis.filter(item => item.melhor === "compra-1").length,
        maisBaratosCompra2: comparaveis.filter(item => item.melhor === "compra-2").length,
        empates: comparaveis.filter(item => item.melhor === "empate").length
    };
}
