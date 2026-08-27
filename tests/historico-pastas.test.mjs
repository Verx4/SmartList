import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("histórico busca compras persistidas no backend e cria pastas por compra", async () => {
    const script = await ler("js/historico-page.js");
    assert.match(script, /api\.get\("\/listas\/historico"\)/);
    assert.match(script, /class="historico-pasta"/);
    assert.match(script, /data-abrir-compra/);
    assert.match(script, /mercadoDaCompra/);
    assert.match(script, /usuarioDaCompra/);
    assert.match(script, /data-voltar-compras/);
});

test("detalhe da compra mostra itens, usuário, mercado e total", async () => {
    const script = await ler("js/historico-page.js");
    assert.match(script, /Usuário:/);
    assert.match(script, /historico-itens-compra/);
    assert.match(script, /subtotalDoItem/);
    assert.match(script, /totalDaCompra/);
});

test("cálculos aceitam finalizadoEm retornado pelo backend", async () => {
    const calculos = await ler("js/historico-calculos.js");
    assert.match(calculos, /compra\?\.finalizadoEm/);
});
