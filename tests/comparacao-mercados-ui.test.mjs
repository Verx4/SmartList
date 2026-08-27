import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("a comparação usa mercados, nomes reais e sem alterações", async () => {
    const [pagina, script] = await Promise.all([
        ler("minha-economia.html"),
        ler("js/minha-economia.js")
    ]);

    assert.match(pagina, /id="comparacaoTabelaMercado1">Mercado 1</);
    assert.match(pagina, /id="comparacaoTabelaMercado2">Mercado 2</);
    assert.match(pagina, /<strong id="comparacaoEmpates">0<\/strong> sem alterações/);
    assert.match(script, /: "Sem alterações";/);
    assert.match(script, /nomeMercadoComparacao\(compras\[indice1\], "Mercado 1"\)/);
    assert.match(script, /nomeMercadoComparacao\(compras\[indice2\], "Mercado 2"\)/);
    assert.doesNotMatch(pagina, />Compra 1</);
    assert.doesNotMatch(pagina, />Compra 2</);
});

test("a nova lista exige mercado e mantém o mercado cadastrado selecionado", async () => {
    const [listas, mercadoAtual] = await Promise.all([
        ler("js/listas-salvas-ui.js"),
        ler("js/mercado-atual.js")
    ]);

    assert.match(listas, /id="mercadoNovaLista"[^>]+required/);
    assert.match(listas, /criarListaSalva\(nome, \{ ativar: true, mercado \}\)/);
    assert.match(mercadoAtual, /const mercado = salvarMercadoAtual\(campoNovo\?\.value\)/);
    assert.match(mercadoAtual, /foi adicionado e selecionado para esta lista/);
    assert.match(mercadoAtual, /comunicar\(mercado\)/);
});
