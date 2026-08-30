import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("cupom é informado somente no checkout da Kiwify", async () => {
    const [pagina, checkout, adminPlanos, adminScript] = await Promise.all([
        ler("assinatura.html"),
        ler("checkout.html"),
        ler("admin/planos.html"),
        ler("js/admin-planos.js")
    ]);

    assert.doesNotMatch(pagina, /Possui um cupom\?/);
    assert.doesNotMatch(checkout, /Possui um cupom\?/);
    assert.doesNotMatch(checkout, /checkoutCupom/);
    assert.match(checkout, /aplique-o diretamente no checkout da Kiwify/);
    assert.match(adminPlanos, /Salvar Alterações de Preços/);
    assert.doesNotMatch(adminPlanos, /Criar e autorizar cupons/);
    assert.doesNotMatch(adminScript, /\/admin\/cupons/);
});

test("servidor exige cupom cadastrado e mantém autoridade e auditoria", async () => {
    const [checkout, service, assinaturaService, mercadoPago, migration, autorizacao] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/assinatura/CheckoutRequest.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/CupomService.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/AssinaturaService.java"),
        ler("backend/src/main/java/br/com/minhalista/pagamento/MercadoPagoService.java"),
        ler("backend/src/main/resources/db/migration/postgresql/V10__auditoria_cupons_assinaturas.sql"),
        ler("backend/src/main/resources/db/migration/postgresql/V11__autorizar_cupons_cadastrados.sql")
    ]);

    assert.match(checkout, /String cupom/);
    assert.match(service, /planoService\.valorVigente\(ciclo\)/);
    assert.match(service, /repository\.findByCodigoIgnoreCase\(codigo\)/);
    assert.match(service, /filter\(Cupom::isAtivo\)/);
    assert.ok(service.indexOf('endsWith("10")') < service.indexOf('endsWith("5")'));
    assert.match(service, /divide\(CEM, 2, RoundingMode\.HALF_UP\)/);
    assert.match(assinaturaService, /setCupomValorOriginal/);
    assert.match(assinaturaService, /setCupomPrimeiroPagamentoAplicado\(true\)/);
    assert.match(assinaturaService, /será validado diretamente pela Kiwify/);
    assert.match(assinaturaService, /valor\.compareTo\(valorMaximo\) <= 0/);
    assert.match(mercadoPago, /"unit_price", valorCobranca/);
    assert.match(mercadoPago, /respostaSegura\(resposta\)/);
    assert.match(mercadoPago, /metadata\.put\("cupom_codigo"/);
    assert.match(mercadoPago, /"cupom_valor_original"/);

    const kiwify = await ler(
        "backend/src/main/java/br/com/minhalista/pagamento/KiwifyCheckoutService.java"
    );
    assert.match(kiwify, /"&coupon="/);
    assert.doesNotMatch(kiwify, /Cupons estão temporariamente indisponíveis/);
    assert.match(migration, /cupom_percentual_desconto/);
    assert.match(migration, /cupom_primeiro_pagamento_aplicado/);
    assert.match(autorizacao, /ADD COLUMN IF NOT EXISTS ciclo/);
    assert.match(autorizacao, /SET ativo = FALSE/);
});
