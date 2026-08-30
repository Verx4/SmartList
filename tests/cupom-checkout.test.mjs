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
    assert.match(script, /dadosCheckout\.cupom = cupomAplicado\.codigo/);
    assert.doesNotMatch(script, /Cupons estão temporariamente indisponíveis/);
    assert.match(script, /A Kiwify confirmará a validade/);
});

test("ADM permite escolher, autorizar, desativar e excluir nomes de cupons", async () => {
    const [pagina, script, estilo] = await Promise.all([
        ler("admin/planos.html"),
        ler("js/admin-planos.js"),
        ler("css/admin.css")
    ]);

    assert.match(pagina, /Criar e autorizar cupons/);
    assert.match(pagina, /id="formCupom"/);
    assert.match(pagina, /id="codigoCupomAdmin"/);
    assert.match(pagina, /placeholder="Ex\.: SMART5 ou SMART10"/);
    assert.match(pagina, /id="cicloCupomAdmin"/);
    assert.match(pagina, /class="admin-cupom-form-acoes"/);
    assert.doesNotMatch(pagina, /class="admin-cupom-codigo">FINAL 5/);
    assert.match(estilo, /grid-template-columns: minmax\(280px, 1\.35fr\) minmax\(320px, 0\.85fr\)/);
    assert.match(estilo, /\.admin-cupom-form-acoes/);
    assert.match(script, /api\.get\("\/admin\/cupons"\)/);
    assert.match(script, /api\.post\("\/admin\/cupons"/);
    assert.match(script, /api\.delete\(`\/admin\/cupons\/\$\{/);
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
