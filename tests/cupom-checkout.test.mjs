import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("checkout exibe e aplica cupom antes de abrir o Mercado Pago", async () => {
    const [pagina, script] = await Promise.all([
        ler("checkout.html"),
        ler("js/assinatura.js")
    ]);

    assert.match(pagina, /Tem um cupom de desconto\?/);
    assert.match(pagina, /id="codigoCupom"/);
    assert.match(pagina, /id="btnAplicarCupom"/);
    assert.match(script, /api\.post\("\/assinaturas\/cupom\/validar"/);
    assert.match(script, /cupom:\s*cupomAplicado/);
});

test("ADM permite criar, listar e excluir cupons", async () => {
    const [pagina, script] = await Promise.all([
        ler("admin/planos.html"),
        ler("js/admin-planos.js")
    ]);

    assert.match(pagina, /Criar e gerenciar cupons/);
    assert.match(pagina, /id="formCupom"/);
    assert.match(script, /api\.get\("\/admin\/cupons"\)/);
    assert.match(script, /api\.post\("\/admin\/cupons"/);
    assert.match(script, /api\.delete\(`\/admin\/cupons\/\$\{/);
});

test("servidor mantém a autoridade sobre preço e cupom", async () => {
    const [checkout, service, migration] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/assinatura/CheckoutRequest.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/CupomService.java"),
        ler("backend/src/main/resources/db/migration/postgresql/V9__cupons_assinaturas.sql")
    ]);

    assert.match(checkout, /String cupom/);
    assert.match(service, /planoService\.valorVigente\(ciclo\)/);
    assert.match(service, /divide\(CEM, 2, RoundingMode\.HALF_UP\)/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS cupons/);
});
