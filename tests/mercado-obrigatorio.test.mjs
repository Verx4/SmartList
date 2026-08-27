import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("adicionar item exige um mercado selecionado", async () => {
    const script = await ler("js/app.js");
    const inicio = script.indexOf("function abrirModal()");
    const fim = script.indexOf("async function fecharModal()", inicio);
    const abrirModal = script.slice(inicio, fim);

    assert.match(abrirModal, /if \(!obterMercadoAtual\(\)\)/);
    assert.match(abrirModal, /Selecione um mercado antes de adicionar um item\./);
    assert.match(abrirModal, /focarSeletorMercado\(\)/);
    assert.ok(
        abrirModal.indexOf("if (!obterMercadoAtual())") <
        abrirModal.indexOf("modal.hidden = false"),
        "a validação deve acontecer antes de abrir o formulário do item"
    );
});

test("finalizar compra exige mercado e volta para Manter vazio", async () => {
    const [script, pagina] = await Promise.all([
        ler("js/app.js"),
        ler("dashboard.html")
    ]);
    const inicio = script.indexOf("function concluirCompra()");
    const fim = script.indexOf("function alternarHistorico()", inicio);
    const concluirCompra = script.slice(inicio, fim);

    assert.match(concluirCompra, /const mercadoAtual = obterMercadoAtual\(\)/);
    assert.match(concluirCompra, /Selecione um mercado antes de finalizar a compra\./);
    assert.match(concluirCompra, /aplicarSupermercadoAProdutos\(\s*mercadoAtual\s*\)/);
    assert.match(concluirCompra, /registrarCompra\(produtos\)/);
    assert.match(concluirCompra, /supermercado: ""/);
    assert.match(concluirCompra, /limparMercadoAtual\(\)/);
    assert.ok(
        concluirCompra.indexOf("registrarCompra(produtos)") <
        concluirCompra.indexOf("limparMercadoAtual()"),
        "o mercado só pode ser limpo depois que a compra for registrada"
    );
    assert.match(pagina, /\.\/js\/app\.js\?v=5/);
});
