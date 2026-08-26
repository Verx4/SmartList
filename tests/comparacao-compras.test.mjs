import assert from "node:assert/strict";
import test from "node:test";

import { compararCompras } from "../js/comparacao-compras-calculos.js";

const item = (nome, quantidade, preco, extras = {}) => ({
    nome,
    quantidade,
    precoUnitario: preco,
    subtotal: quantidade * preco,
    ...extras
});
const compra = (data, mercado, itens) => ({
    data,
    supermercado: mercado,
    itens,
    total: itens.reduce((total, atual) => total + atual.subtotal, 0)
});

test("compara só produtos em comum e separa os itens exclusivos", () => {
    const primeira = compra("2026-07-10T12:00:00", "Mercado A", [
        item("Arroz", 1, 10),
        item("Feijão", 1, 5),
        item("Café", 1, 12)
    ]);
    const segunda = compra("2026-08-26T12:00:00", "Mercado B", [
        item("Arroz", 1, 8),
        item("Feijão", 1, 6),
        item("Leite", 1, 7)
    ]);
    const resultado = compararCompras(primeira, segunda);

    assert.equal(resultado.quantidadeComparada, 2);
    assert.equal(resultado.valorComparavel1, 15);
    assert.equal(resultado.valorComparavel2, 14);
    assert.equal(resultado.economiaReal, 1);
    assert.equal(resultado.maisBaratosCompra1, 1);
    assert.equal(resultado.maisBaratosCompra2, 1);
    assert.deepEqual(resultado.exclusivosCompra1.map(atual => atual.nome), ["Café"]);
    assert.deepEqual(resultado.exclusivosCompra2.map(atual => atual.nome), ["Leite"]);
});

test("normaliza embalagens em kg, g, L, ml e unidade sem misturar medidas incompatíveis", () => {
    const primeira = compra("2026-07-10T12:00:00", "Mercado A", [
        item("Arroz tipo 1 1 kg", 1, 8.99),
        item("Café", 1, 20, { quantidadeEmbalagem: 500, unidadeEmbalagem: "g" }),
        item("Leite integral 1000 ml", 1, 6),
        item("Papel higiênico 4 un", 1, 12),
        item("Óleo", 1, 8, { quantidadeEmbalagem: 900, unidadeEmbalagem: "ml" })
    ]);
    const segunda = compra("2026-08-26T12:00:00", "Mercado B", [
        item("Arroz tipo 1 5 kg", 1, 32.9),
        item("Café", 1, 38, { quantidadeEmbalagem: 1, unidadeEmbalagem: "kg" }),
        item("Leite integral 1 L", 1, 5.5),
        item("Papel higiênico 12 un", 1, 30),
        item("Óleo", 1, 7)
    ]);
    const resultado = compararCompras(primeira, segunda);
    const porNome = new Map(resultado.comparaveis.map(atual => [atual.chave, atual]));

    assert.equal(resultado.quantidadeComparada, 4);
    assert.equal(Number(porNome.get("arroz tipo 1").precoCompra2.toFixed(2)), 6.58);
    assert.equal(porNome.get("cafe").precoCompra1, 40);
    assert.equal(porNome.get("cafe").precoCompra2, 38);
    assert.equal(porNome.get("leite integral").precoCompra2, 5.5);
    assert.equal(porNome.get("papel higienico").precoCompra2, 2.5);
    assert.equal(resultado.naoComparaveis.length, 1);
    assert.equal(resultado.naoComparaveis[0].nome, "Óleo");
});
