import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("menu ADM mantém somente as rotas solicitadas", async () => {
    const navegacao = await readFile(
        new URL("../js/admin-nav.js", import.meta.url),
        "utf8"
    );

    assert.match(navegacao, /Dashboard/);
    assert.match(navegacao, /Usuários/);
    assert.match(navegacao, /Coleta de Preços/);
    assert.match(navegacao, /Uso por região/);
    assert.match(navegacao, /Banco de Dados/);
    assert.match(navegacao, /Sugestões/);
    assert.match(navegacao, /Logs/);
    assert.match(navegacao, /Administradores/);
    assert.doesNotMatch(
        navegacao,
        /Assinaturas|Supermercados|Produtos|Scrapers|Ofertas e encartes|APIs|Relatórios|Configurações/
    );
});
