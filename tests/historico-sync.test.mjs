import test from "node:test";
import assert from "node:assert/strict";

import {
    combinarHistoricos,
    normalizarCompraRemota
} from "../js/historico-sync.js";

test("histórico local continua visível quando a API responde uma lista vazia", () => {
    const local = [{
        id: "compra-1",
        data: "2026-08-28T10:00:00Z",
        supermercado: "Assaí",
        total: 381.09,
        economia: 12,
        itens: [{ nome: "Tomate", quantidade: 2, subtotal: 20 }]
    }];

    const resultado = combinarHistoricos([], local);

    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].total, 381.09);
    assert.equal(resultado[0].itens[0].nome, "Tomate");
});

test("compra sincronizada não é duplicada e preserva detalhes locais", () => {
    const remoto = [{
        id: "compra-1",
        data: "2026-08-28T10:00:00Z",
        supermercado: "Assaí",
        usuarioNome: "Fernando",
        total: 381.09,
        itens: []
    }];
    const local = [{
        id: "compra-1",
        data: "2026-08-28T10:00:00Z",
        supermercado: "Assaí",
        total: 381.09,
        economia: 12,
        itens: [{ nome: "Tomate", quantidade: 2, subtotal: 20 }]
    }];

    const resultado = combinarHistoricos(remoto, local);

    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].usuarioNome, "Fernando");
    assert.equal(resultado[0].economia, 12);
    assert.equal(resultado[0].itens.length, 1);
});

test("resposta do servidor é convertida para o contrato usado pelos cards", () => {
    const compra = normalizarCompraRemota({
        compraId: "compra-api",
        realizadaEm: "2026-08-28T12:00:00Z",
        mercado: "Atacadão",
        valorTotal: 50,
        economiaEstimada: 5,
        criador: "Ana",
        itens: []
    });

    assert.equal(compra.id, "compra-api");
    assert.equal(compra.supermercado, "Atacadão");
    assert.equal(compra.total, 50);
    assert.equal(compra.economia, 5);
    assert.equal(compra.usuarioNome, "Ana");
});
