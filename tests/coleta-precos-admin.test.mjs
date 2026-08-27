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

test("a página administrativa mostra responsável e exclusão da observação", async () => {
    const [pagina, script, css] = await Promise.all([ler("admin/coleta-precos.html"), ler("js/admin-coleta-precos.js"), ler("css/admin-coleta-precos.css")]);
    assert.match(pagina, /Produtos por categoria/);
    assert.match(pagina, /<th>Usuário<\/th>/);
    assert.match(pagina, /Excluir registro\?/);
    assert.match(script, /usuarioNome \|\| "Usuário não identificado"/);
    assert.match(script, /api\.delete\(`\/admin\/coleta-precos\/observacoes\/\$\{id\}`\)/);
    assert.match(script, /<strong>\$\{escapar\(item\.nome\)\}<\/strong>/);
    assert.doesNotMatch(script, /item\.nomeNormalizado\).*<\/small>/);
    assert.match(css, /min-width:0!important/);
    assert.match(css, /content:attr\(data-label\)/);
});

test("backend vincula usuário e exclui somente a observação selecionada", async () => {
    const [entidade, coleta, controller, service, migration] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/preco/ObservacaoPreco.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/ColetaPrecoService.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/AdminPrecoController.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/AdminPrecoService.java"),
        ler("backend/src/main/resources/db/migration/postgresql/V4__vincular_usuario_observacoes_precos.sql")
    ]);
    assert.match(entidade, /JoinColumn\(name = "usuario_id"\)/);
    assert.match(coleta, /observacao\.setUsuario\(usuario\)/);
    assert.match(controller, /DeleteMapping\("\/observacoes\/\{id\}"\)/);
    assert.match(service, /observacaoRepository\.delete\(observacao\)/);
    assert.doesNotMatch(service, /produtoRepository\.delete/);
    assert.match(service, /"Usuário não identificado"/);
    assert.match(migration, /REFERENCES usuarios\(id\)/);
});