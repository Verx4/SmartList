import test from "node:test";
import assert from "node:assert/strict";

import {
    agruparComprasPorCategoria,
    filtrarComprasPorPeriodo,
    precoUnitarioDoItem,
    resumirCompras,
    totalItensComprados
} from "../js/historico-calculos.js";
import { finalizarCompra } from "../js/checkout.js";

const quantidades = [
    ...Array(19).fill(2),
    ...Array(7).fill(1)
];

const itens = quantidades.map((quantidade, indice) => ({
    nome: `Produto ${indice + 1}`,
    categoria: indice < 13 ? "Alimentos" : "Outros",
    quantidade,
    preco: 10,
    subtotal: quantidade * 10
}));

const compra = {
    data: "2026-08-10T12:00:00.000Z",
    total: 450,
    economia: 25,
    itens
};

test("26 produtos/linhas são contabilizados como 45 unidades em uma compra", () => {
    const resumo = resumirCompras([compra]);

    assert.equal(itens.length, 26);
    assert.equal(totalItensComprados([compra]), 45);
    assert.equal(resumo.itensComprados, 45);
    assert.equal(resumo.quantidadeCompras, 1);
    assert.equal(resumo.totalGasto, 450);
    assert.equal(resumo.media, 450);
    assert.equal(resumo.economia, 25);
});

test("categorias somam quantidades reais, não a quantidade de linhas", () => {
    const categorias = agruparComprasPorCategoria([compra]);

    assert.equal(categorias.get("Alimentos").itens.length, 13);
    assert.equal(categorias.get("Alimentos").quantidade, 26);
    assert.equal(categorias.get("Outros").itens.length, 13);
    assert.equal(categorias.get("Outros").quantidade, 19);
});

test("itens vendidos por peso contam como 1 item quando a quantidade vem zerada", () => {
    const compraPorPeso = {
        data: "2026-08-31T12:00:00.000Z",
        total: 14.98,
        itens: [
            {
                nome: "Banana prata",
                categoria: "🍎 Hortifruti",
                quantidade: 0,
                peso: 1,
                precoUnitario: 6.99,
                subtotal: 6.99
            },
            {
                nome: "Banana prata",
                categoria: "🍎 Hortifruti",
                quantidade: 0,
                peso: 1,
                precoUnitario: 7.99,
                subtotal: 7.99
            }
        ]
    };

    const categorias = agruparComprasPorCategoria([compraPorPeso]);
    const hortifruti = categorias.get("🍎 Hortifruti");

    assert.equal(hortifruti.itens.length, 2);
    assert.equal(hortifruti.quantidade, 2);
    assert.equal(totalItensComprados([compraPorPeso]), 2);
});

test("seletor por dia separa as compras e a opção todos mantém o conjunto completo", () => {
    const diaDois = { ...compra, data: "2026-09-02T12:00:00.000Z" };
    const diaVinteESete = { ...compra, data: "2026-08-27T12:00:00.000Z" };
    const compras = [diaDois, diaVinteESete];

    assert.equal(filtrarComprasPorPeriodo(compras, "2026-09-02").length, 1);
    assert.equal(filtrarComprasPorPeriodo(compras, "2026-08-27").length, 1);
    assert.equal(filtrarComprasPorPeriodo(compras, "todos").length, 2);
    assert.equal(resumirCompras(filtrarComprasPorPeriodo(compras, "todos")).itensComprados, 90);
});

test("preço unitário explícito é preservado para o detalhamento", () => {
    assert.equal(precoUnitarioDoItem({
        quantidade: 2,
        precoUnitario: 8.9,
        subtotal: 17.8
    }), 8.9);
});

test("finalização persiste as 45 unidades e o preço unitário nas 26 linhas", () => {
    const armazenamento = new Map();
    globalThis.localStorage = {
        getItem: chave => armazenamento.get(chave) ?? null,
        setItem: (chave, valor) => armazenamento.set(chave, String(valor)),
        removeItem: chave => armazenamento.delete(chave)
    };
    globalThis.window = {
        crypto: {
            randomUUID: () => "compra-teste"
        }
    };

    const produtos = quantidades.map((quantidade, indice) => ({
        id: `produto-${indice + 1}`,
        nome: `Produto ${indice + 1}`,
        categoria: "Outros",
        medida: "unidade",
        supermercado: "Mercado Teste",
        precos: [{ valor: 8.9, quantidade }]
    }));
    const resultado = finalizarCompra(produtos);
    const compraPersistida = JSON.parse(
        armazenamento.get("historicoCompras")
    )[0];

    assert.equal(resultado.compra.totalItens, 45);
    assert.equal(compraPersistida.totalItens, 45);
    assert.equal(compraPersistida.itens.length, 26);
    assert.equal(compraPersistida.itens[0].quantidade, 2);
    assert.equal(compraPersistida.itens[0].precoUnitario, 8.9);
});
