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

test("a página administrativa mostra compras finalizadas e detalhes por compra", async () => {
    const [pagina, script, css] = await Promise.all([
        ler("admin/coleta-precos.html"),
        ler("js/admin-coleta-precos.js"),
        ler("css/admin-coleta-precos.css")
    ]);
    assert.match(pagina, /Histórico de Compras Finalizadas/);
    assert.match(pagina, /Compras Finalizadas/);
    assert.match(pagina, /<th>ID Compra<\/th>/);
    assert.match(pagina, /<th>Usuário<\/th>/);
    assert.match(pagina, /<th>Mercado<\/th>/);
    assert.match(pagina, /Produtos da Compra/);
    assert.match(pagina, /registro independente e permanente/);
    assert.match(script, /\/admin\/coleta-precos\/resumo-compras/);
    assert.match(script, /\/admin\/coleta-precos\/compras\?/);
    assert.match(script, /\/admin\/coleta-precos\/compras\/\$\{encodeURIComponent\(compraId\)\}/);
    assert.match(script, /usuarioNome \|\| "Usuário não identificado"/);
    assert.match(script, /item\.nomeOriginal \|\| item\.produto/);
    assert.match(css, /var\(--cor-primaria\)/);
    assert.match(css, /var\(--cor-verde\)/);
    assert.match(css, /content:attr\(data-label\)/);
});

test("backend agrupa por compraId sem sobrescrever compras legítimas", async () => {
    const [entidade, coleta, repository, controller, service] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/preco/ObservacaoPreco.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/ColetaPrecoService.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/ObservacaoPrecoRepository.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/AdminPrecoController.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/AdminPrecoService.java")
    ]);
    assert.match(entidade, /columnNames = \{ "origem", "compra_chave", "item_chave" \}/);
    assert.match(coleta, /observacao\.setCompraChave/);
    assert.match(repository, /count\(distinct o\.compraChave\)/);
    assert.match(repository, /group by o\.compraChave/);
    assert.match(repository, /findByOrigemAndCompraChaveOrderByCriadoEmAsc/);
    assert.match(controller, /GetMapping\("\/compras"\)/);
    assert.match(controller, /GetMapping\("\/compras\/\{compraId\}"\)/);
    assert.match(service, /findByOrigemAndCompraChaveOrderByCriadoEmAsc/);
});

test("o backend protege toda a área administrativa", async () => {
    const security = await ler("backend/src/main/java/br/com/minhalista/config/SecurityConfig.java");
    assert.match(security, /requestMatchers\("\/api\/admin\/\*\*"\)\.hasRole\("ADMIN"\)/);
});
