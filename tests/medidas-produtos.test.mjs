import test from "node:test";
import assert from "node:assert/strict";

import {
    MEDIDA_KG,
    MEDIDA_UNIDADE,
    normalizarMedidaProduto
} from "../js/medidas-produtos.js";

test("preserva kg quando o formulário envia o valor do select", () => {
    assert.equal(normalizarMedidaProduto("kg"), MEDIDA_KG);
});

test("aceita os aliases persistidos de unidade", () => {
    assert.equal(normalizarMedidaProduto({ unitType: "kg" }), MEDIDA_KG);
    assert.equal(normalizarMedidaProduto({ unit: "unidade" }), MEDIDA_UNIDADE);
});
