import test from "node:test";
import assert from "node:assert/strict";

import {
    analisarMinhaEconomia,
    categoriaComMaiorGasto,
    compararMeses,
    produtoComMaiorAumento,
    serieDeGastos
} from "../js/minha-economia-calculos.js";

const referencia = new Date(2026, 7, 17, 12);
const compra = (data, total, itens, mercado = "Mercado") => ({
    data,
    total,
    supermercado: mercado,
    itens
});
const item = (nome, categoria, quantidade, preco) => ({
    nome,
    categoria,
    quantidade,
    precoUnitario: preco,
    subtotal: quantidade * preco
});

test("usuário sem histórico recebe métricas zeradas e nenhuma economia atribuída", () => {
    const analise = analisarMinhaEconomia([], referencia);
    assert.equal(analise.atual.totalGasto, 0);
    assert.equal(analise.itensComprados, 0);
    assert.equal(analise.economiaConfiavel, false);
    assert.equal(analise.categoriaPrincipal, null);
    assert.equal(analise.maiorAumento, null);
});

test("uma única compra não é suficiente para atribuir economia", () => {
    const analise = analisarMinhaEconomia([
        compra("2026-08-05T12:00:00", 30, [item("Arroz", "Alimentos", 3, 10)])
    ], referencia);
    assert.equal(analise.atual.quantidadeCompras, 1);
    assert.equal(analise.itensComprados, 3);
    assert.equal(analise.economiaConfiavel, false);
});

test("compras em um único mês não geram comparação enganosa", () => {
    const analise = compararMeses([
        compra("2026-08-05T12:00:00", 30, [item("Arroz", "Alimentos", 3, 10)]),
        compra("2026-08-12T12:00:00", 20, [item("Leite", "Laticínios", 4, 5)])
    ], referencia);
    assert.equal(analise.atual.totalGasto, 50);
    assert.equal(analise.anterior.totalGasto, 0);
    assert.equal(analise.tipo, "sem-dados");
});

test("meses comparáveis com gasto menor calculam economia real", () => {
    const compras = [
        compra("2026-07-05T12:00:00", 100, [item("Arroz", "Alimentos", 10, 10)]),
        compra("2026-07-15T12:00:00", 100, [item("Leite", "Laticínios", 20, 5)]),
        compra("2026-08-05T12:00:00", 80, [item("Arroz", "Alimentos", 8, 10)]),
        compra("2026-08-15T12:00:00", 70, [item("Leite", "Laticínios", 14, 5)])
    ];
    const analise = compararMeses(compras, referencia);
    assert.equal(analise.tipo, "menor");
    assert.equal(analise.volumeComparavel, true);
    assert.equal(analise.economiaConfiavel, true);
    assert.equal(analise.economia, 50);
});

test("gasto maior é informado como aumento e nunca como economia", () => {
    const compras = [
        compra("2026-07-05T12:00:00", 50, [item("Arroz", "Alimentos", 5, 10)]),
        compra("2026-07-15T12:00:00", 50, [item("Leite", "Laticínios", 10, 5)]),
        compra("2026-08-05T12:00:00", 80, [item("Arroz", "Alimentos", 8, 10)]),
        compra("2026-08-15T12:00:00", 70, [item("Leite", "Laticínios", 14, 5)])
    ];
    const analise = compararMeses(compras, referencia);
    assert.equal(analise.tipo, "maior");
    assert.equal(analise.economiaConfiavel, false);
    assert.equal(analise.economia, 0);
});

test("quantidades de compras muito diferentes impedem atribuir economia", () => {
    const compras = [
        compra("2026-07-05T12:00:00", 100, [item("Arroz", "Alimentos", 10, 10)]),
        compra("2026-07-10T12:00:00", 100, [item("Leite", "Laticínios", 20, 5)]),
        compra("2026-07-20T12:00:00", 100, [item("Café", "Alimentos", 10, 10)]),
        compra("2026-08-05T12:00:00", 80, [item("Arroz", "Alimentos", 8, 10)])
    ];
    const analise = compararMeses(compras, referencia);
    assert.equal(analise.tipo, "menor");
    assert.equal(analise.volumeComparavel, false);
    assert.equal(analise.economiaConfiavel, false);
});

test("categoria principal usa quantidade multiplicada pelo preço", () => {
    const principal = categoriaComMaiorGasto([
        compra("2026-08-05T12:00:00", 50, [
            item("Arroz", "Alimentos", 3, 10),
            item("Leite", "Laticínios", 4, 5)
        ])
    ]);
    assert.equal(principal.nome, "Alimentos");
    assert.equal(principal.total, 30);
    assert.equal(principal.percentual, 60);
});

test("maior aumento compara o preço anterior com o mais recente do mesmo produto", () => {
    const aumento = produtoComMaiorAumento([
        compra("2026-06-05T12:00:00", 10, [item("Café", "Alimentos", 1, 10)]),
        compra("2026-07-05T12:00:00", 11.2, [item("Café", "Alimentos", 1, 11.2)]),
        compra("2026-08-05T12:00:00", 6, [item("Leite", "Laticínios", 1, 6)])
    ]);
    assert.equal(aumento.nome, "Café");
    assert.equal(Math.round(aumento.percentual), 12);
});

test("não compara leite em pó com leite em caixa", () => {
    const aumento = produtoComMaiorAumento([
        compra("2026-07-05T12:00:00", 10, [
            item("Leite em pó", "Laticínios", 1, 10)
        ]),
        compra("2026-08-05T12:00:00", 12, [
            item("Leite em caixa", "Laticínios", 1, 12)
        ])
    ]);

    assert.equal(aumento, null);
});

test("compara novamente quando a apresentação do leite é realmente a mesma", () => {
    const aumento = produtoComMaiorAumento([
        compra("2026-07-05T12:00:00", 10, [
            item("Leite em pó", "Laticínios", 1, 10)
        ]),
        compra("2026-08-05T12:00:00", 12, [
            item("Leite em pó", "Laticínios", 1, 12)
        ])
    ]);

    assert.equal(aumento.nome, "Leite em pó");
    assert.equal(Math.round(aumento.percentual), 20);
});

test("não atribui aumento a leite salvo sem apresentação suficiente", () => {
    const aumento = produtoComMaiorAumento([
        compra("2026-07-05T12:00:00", 5, [
            item("Leite", "Laticínios", 1, 5)
        ]),
        compra("2026-08-05T12:00:00", 6, [
            item("Leite", "Laticínios", 1, 6)
        ])
    ]);

    assert.equal(aumento, null);
});

test("não compara preços com medidas diferentes", () => {
    const anterior = item("Picanha", "Carnes", 1, 40);
    anterior.medida = "kg";
    const atual = item("Picanha", "Carnes", 1, 50);
    atual.medida = "unidade";

    assert.equal(produtoComMaiorAumento([
        compra("2026-07-05T12:00:00", 40, [anterior]),
        compra("2026-08-05T12:00:00", 50, [atual])
    ]), null);
});

test("gráfico produz períodos reais de 3, 6 e 12 meses", () => {
    const compras = [
        compra("2026-07-05T12:00:00", 100, [item("Arroz", "Alimentos", 10, 10)]),
        compra("2026-08-05T12:00:00", 80, [item("Arroz", "Alimentos", 8, 10)])
    ];
    assert.equal(serieDeGastos(compras, 3, referencia).length, 3);
    assert.equal(serieDeGastos(compras, 6, referencia).length, 6);
    assert.equal(serieDeGastos(compras, 12, referencia).length, 12);
    assert.deepEqual(serieDeGastos(compras, 3, referencia).map(mes => mes.total), [0, 100, 80]);
});
