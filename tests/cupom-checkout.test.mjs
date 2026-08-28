import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("tela de planos exibe, aplica e remove cupom antes do checkout", async () => {
    const [pagina, checkout, script] = await Promise.all([
        ler("assinatura.html"),
        ler("checkout.html"),
        ler("js/assinatura.js")
    ]);

    assert.match(pagina, /Possui um cupom\?/);
    assert.match(pagina, /id="codigoCupomPlano"/);
    assert.match(pagina, /id="btnRemoverCupomPlano"/);
    assert.match(pagina, /id="promocaoCupomPlano"/);
    assert.match(checkout, /id="checkoutProximaCobranca"/);
    assert.match(checkout, /id="checkoutPercentual"/);
    assert.match(script, /api\.post\("\/assinaturas\/cupom\/validar"/);
    assert.match(script, /cupomAplicado\.codigo/);
});

test("ADM explica as regras automáticas sem exigir cadastro de cupom", async () => {
    const [pagina, script] = await Promise.all([
        ler("admin/planos.html"),
        ler("js/admin-planos.js")
    ]);

    assert.match(pagina, /Cupons automáticos/);
    assert.match(pagina, /FINAL 5/);
    assert.match(pagina, /FINAL 10/);
    assert.doesNotMatch(pagina, /id="formCupom"/);
    assert.doesNotMatch(script, /\/admin\/cupons/);
});

test("servidor mantém autoridade, regra de sufixo e auditoria", async () => {
    const [checkout, service, assinaturaService, mercadoPago, migration] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/assinatura/CheckoutRequest.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/CupomService.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/AssinaturaService.java"),
        ler("backend/src/main/java/br/com/minhalista/pagamento/MercadoPagoService.java"),
        ler("backend/src/main/resources/db/migration/postgresql/V10__auditoria_cupons_assinaturas.sql")
    ]);

    assert.match(checkout, /String cupom/);
    assert.match(service, /planoService\.valorVigente\(ciclo\)/);
    assert.ok(service.indexOf('endsWith("10")') < service.indexOf('endsWith("5")'));
    assert.match(service, /divide\(CEM, 2, RoundingMode\.HALF_UP\)/);
    assert.match(assinaturaService, /setCupomValorOriginal/);
    assert.match(assinaturaService, /setCupomPrimeiroPagamentoAplicado\(true\)/);
    assert.match(mercadoPago, /"unit_price", assinatura\.getValor\(\)/);
    assert.match(mercadoPago, /"cupom_valor_original"/);
    assert.match(migration, /cupom_percentual_desconto/);
    assert.match(migration, /cupom_primeiro_pagamento_aplicado/);
});
