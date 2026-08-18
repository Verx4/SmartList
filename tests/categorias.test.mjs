import test from "node:test";
import assert from "node:assert/strict";

import {
    CATEGORIA_OUTROS,
    identificarCategoria,
    resolverCategoriaSelecionada
} from "../js/categorias.js";

const casosObrigatorios = [
    ["Milho", "", "🥫 Enlatados e Conservas"],
    ["Ervilha", "", "🥫 Enlatados e Conservas"],
    ["Ervilha seca", "", "🌾 Grãos"],
    ["Pimentão", "", "🍎 Hortifruti"],
    ["Pimenta", "", "🌶️ Temperos"],
    ["Coentro", "", "🍎 Hortifruti"],
    ["Coentro fresco", "", "🍎 Hortifruti"],
    ["Pão de queijo", "", "❄️ Congelados"],
    ["Pão francês", "", "🍞 Padaria"],
    ["Nugget", "", "❄️ Congelados"],
    ["Atum em lata", "", "🥫 Enlatados e Conservas"],
    ["Sardinha em lata", "", "🥫 Enlatados e Conservas"],
    ["Cream cheese", "", "🥛 Laticínios"],
    ["Requeijão", "", "🥛 Laticínios"],
    ["Margarina", "", "🍚 Mercearia"],
    ["Manteiga", "", "🍚 Mercearia"],
    ["Manteiga com sal", "", "🍚 Mercearia"],
    ["Manteiga sem sal", "", "🍚 Mercearia"],
    ["Manteiga de garrafa", "", "🍚 Mercearia"],
    ["Ketchup", "", "🍚 Mercearia"],
    ["Catchup", "", "🍚 Mercearia"],
    ["Papel filme", "", "🍚 Mercearia"],
    ["Filme plástico", "", "🍚 Mercearia"],
    ["Cacau", "", "🍚 Mercearia"],
    ["Cacau 100%", "", "🍚 Mercearia"],
    ["Cacau em pó", "", "🍚 Mercearia"],
    ["Chocolate em pó", "", "🍚 Mercearia"],
    ["Achocolatado", "", "🍚 Mercearia"],
    ["Chocolate", "", "🍪 Doces e Snacks"],
    ["Frango", "KG", "🍗 Frango"],
    ["Frango", "UNIDADES", "❄️ Congelados"],
    ["Carne", "KG", "🥩 Carnes"],
    ["Carne", "UNIDADES", "❄️ Congelados"],
    ["Picanha", "KG", "🥩 Carnes"],
    ["Picanha", "UNIDADES", "❄️ Congelados"],
    ["Tilápia", "KG", "🐟 Peixes e Frutos do Mar"],
    ["Tilápia", "UNIDADES", "❄️ Congelados"],
    ["Camarão", "KG", "🐟 Peixes e Frutos do Mar"],
    ["Camarão", "UNIDADES", "❄️ Congelados"],
    ["Banana", "UNIDADES", "🍎 Hortifruti"]
];

test("classifica todos os cenários obrigatórios da nova lista", () => {
    casosObrigatorios.forEach(([nome, medida, esperado]) => {
        assert.equal(
            identificarCategoria(nome, medida),
            esperado,
            `${nome} (${medida || "sem medida"})`
        );
    });
});

test("mantém cobertura representativa de todas as categorias", () => {
    const casos = [
        ["Iogurte grego", "🥛 Laticínios"],
        ["Filé mignon", "🥩 Carnes"],
        ["Coxa e sobrecoxa", "🍗 Frango"],
        ["Lagosta", "🐟 Peixes e Frutos do Mar"],
        ["Rúcula", "🍎 Hortifruti"],
        ["Bisnaguinha", "🍞 Padaria"],
        ["Água de coco", "🥤 Bebidas"],
        ["Red Bull", "⚡ Energéticos"],
        ["Cerveja sem álcool", "🍺 Bebidas Alcoólicas"],
        ["Arroz parboilizado", "🌾 Grãos"],
        ["Farinha de mandioca", "🍚 Mercearia"],
        ["Barra de proteína", "🍪 Doces e Snacks"],
        ["Limpador multiuso", "🧼 Limpeza"],
        ["Enxaguante bucal", "🪥 Higiene"],
        ["Sachê para gato", "🐶 Pet"],
        ["Água oxigenada", "💊 Farmácia"],
        ["Cogumelo em conserva", "🥫 Enlatados e Conservas"],
        ["Refeição congelada", "❄️ Congelados"],
        ["Noz-moscada", "🌶️ Temperos"],
        ["Garfo descartável", "🍽️ Descartáveis"],
        ["Filtro de linha", "🔌 Utilidades"],
        ["Produto sem regra", "📦 Outros"]
    ];

    casos.forEach(([nome, esperado]) => {
        assert.equal(identificarCategoria(nome), esperado, nome);
    });
});

test("normaliza caixa, acentos, hífens e espaços extras", () => {
    assert.equal(identificarCategoria("  PIMENTÃO  "), "🍎 Hortifruti");
    assert.equal(identificarCategoria("cream-cheese"), "🥛 Laticínios");
    assert.equal(identificarCategoria("SABAO-EM-PO"), "🧼 Limpeza");
    assert.equal(identificarCategoria("nuggets"), "❄️ Congelados");
});

test("não usa correspondência parcial insegura", () => {
    assert.equal(identificarCategoria("Pimentão"), "🍎 Hortifruti");
    assert.equal(identificarCategoria("Pimenta"), "🌶️ Temperos");
    assert.equal(identificarCategoria("Colaborador"), CATEGORIA_OUTROS);
});

test("expressões completas vencem palavras genéricas", () => {
    assert.equal(identificarCategoria("Água sanitária"), "🧼 Limpeza");
    assert.equal(identificarCategoria("Água oxigenada"), "💊 Farmácia");
    assert.equal(identificarCategoria("Leite de coco"), "🍚 Mercearia");
    assert.equal(identificarCategoria("Caldo de carne"), "🌶️ Temperos");
    assert.equal(identificarCategoria("Óleo de milho"), "🍚 Mercearia");
    assert.equal(identificarCategoria("Pimenta calabresa"), "🌶️ Temperos");
});

test("categoria manual não é substituída pelo Automático", () => {
    assert.equal(
        resolverCategoriaSelecionada("Nugget", "🥩 Carnes", "unidade"),
        "🥩 Carnes"
    );
    assert.equal(
        resolverCategoriaSelecionada("Nugget", "automatico", "unidade"),
        "❄️ Congelados"
    );
});

test("produto desconhecido continua em Outros", () => {
    assert.equal(
        identificarCategoria("Produto experimental sem cadastro"),
        CATEGORIA_OUTROS
    );
});
