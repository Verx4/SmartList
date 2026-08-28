import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("finalização sincroniza compra completa e Histórico combina servidor e aparelho", async () => {
    const [checkout, coleta, pagina, controller, service, entidade] = await Promise.all([
        ler("js/checkout.js"),
        ler("js/coleta-precos.js"),
        ler("js/historico-page.js"),
        ler("backend/src/main/java/br/com/minhalista/preco/ColetaPrecoController.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/ColetaPrecoService.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/ObservacaoPreco.java")
    ]);

    assert.match(checkout, /usuarioNome:/);
    assert.match(checkout, /itens,/);
    assert.match(checkout, /economia/);
    assert.match(coleta, /economia: Number\(compra\.economia \|\| 0\)/);
    assert.match(pagina, /\/coleta-precos\/compras\/historico/);
    assert.match(pagina, /combinarHistoricos\(remotas, locais\)/);
    assert.match(controller, /GetMapping\("\/compras\/historico"\)/);
    assert.match(service, /HistoricoCompraResponse/);
    assert.match(entidade, /economia_compra/);
});
