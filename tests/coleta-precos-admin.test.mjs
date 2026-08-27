import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("a compra finalizada entra na coleta idempotente e volta a ser tentada", async () => {
    const [app, coleta] = await Promise.all([ler("js/app.js"), ler("js/coleta-precos.js")]);
    assert.match(app, /enfileirarColetaPreco\(resultado\.compra\)/);
    assert.match(app, /sincronizarColetasPendentes\(\)/);
    assert.match(coleta, /\/coleta-precos\/compras/);
    assert.match(coleta, /itemId: String\(item\.id\)/);
    assert.match(coleta, /filter\(item => item\.compraId !== payload\.compraId\)/);
});

test("a página de preços é administrativa, paginada e não mostra comprador", async () => {
    const [pagina, script, navegacao] = await Promise.all([
        ler("admin/coleta-precos.html"),
        ler("js/admin-coleta-precos.js"),
        ler("js/admin-nav.js")
    ]);
    assert.match(pagina, /data-admin-page="coleta-precos"/);
    assert.match(pagina, /Produtos por categoria/);
    assert.match(pagina, /Evolução recente dos preços/);
    assert.doesNotMatch(pagina, /<th>Usuário<\/th>|<th>E-mail<\/th>/i);
    assert.match(script, /perfil \|\| usuario\.role/);
    assert.match(script, /paginaProdutos/);
    assert.match(navegacao, /Coleta de Preços/);
});
