import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("todas as listas preservam criador e data de criação", async () => {
    const [produtos, interfaceListas] = await Promise.all([
        ler("js/produtos.js"),
        ler("js/listas-salvas-ui.js")
    ]);
    assert.match(produtos, /criadorNome: obterNomeCriador\(\)/);
    assert.match(produtos, /criadorNome: textoSeguro\(lista\.criadorNome\) \|\| obterNomeCriador\(\)/);
    assert.match(interfaceListas, /Criada por \$\{atual\.criadorNome/);
    assert.match(interfaceListas, /dateStyle: "short"/);
});

test("a lista escolhida pode ser excluída após confirmação", async () => {
    const [produtos, interfaceListas] = await Promise.all([
        ler("js/produtos.js"),
        ler("js/listas-salvas-ui.js")
    ]);
    assert.match(interfaceListas, />Excluir lista<\/button>/);
    assert.match(interfaceListas, /window\.confirm\(`Excluir \$\{nome\}\?/);
    assert.match(interfaceListas, /excluirListaSalva\(seletor\.value\)/);
    assert.match(produtos, /listas\.filter\(lista => lista\.id !== alvo\.id\)/);
});
