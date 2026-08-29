import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("checkout aceita os dois nomes de token e separa segredo do webhook", async () => {
    const [configuracao, mercadoPago] = await Promise.all([
        ler("backend/src/main/resources/application.yml"),
        ler("backend/src/main/java/br/com/minhalista/pagamento/MercadoPagoService.java")
    ]);

    assert.match(configuracao, /MERCADO_PAGO_ACCESS_TOKEN:\$\{MERCADO_PAGO_TOKEN:/);
    assert.match(mercadoPago, /void exigirConfiguracaoCheckout\(\)/);
    assert.doesNotMatch(
        mercadoPago.match(/void exigirConfiguracaoCheckout\(\)[\s\S]*?\n    }/)[0],
        /webhookSecret/
    );
    assert.match(mercadoPago, /URL do webhook do Mercado Pago precisa ser uma URL HTTPS pública/);
    assert.match(mercadoPago, /URL de retorno do checkout precisa ser uma URL HTTPS pública/);
});

test("backend registra payload seguro e devolve erro técnico somente quando autorizado", async () => {
    const [mercadoPago, handler, controller] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/pagamento/MercadoPagoService.java"),
        ler("backend/src/main/java/br/com/minhalista/common/ApiExceptionHandler.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/AssinaturaController.java")
    ]);

    assert.match(mercadoPago, /Payload Mercado Pago preparado/);
    assert.match(mercadoPago, /payloadSeguro\(corpo\)/);
    assert.match(mercadoPago, /respostaSegura\(resposta\)/);
    assert.match(handler, /corpo\.put\("error", true\)/);
    assert.match(handler, /corpo\.put\("message", mensagem\)/);
    assert.match(handler, /exp(or|or)Erros \? erro\.getDetalhes\(\) : null/);
    assert.match(controller, /codigoDiagnostico/);
    assert.match(controller, /Falha inesperada no checkout/);
});

test("frontend prioriza message do backend e mostra o código de diagnóstico", async () => {
    const [script, checkout, planos] = await Promise.all([
        ler("js/assinatura.js"),
        ler("checkout.html"),
        ler("assinatura.html")
    ]);

    assert.match(script, /dados\?\.message/);
    assert.match(script, /dados\?\.diagnosticId/);
    assert.match(script, /mensagemErroCheckout\(erro\)/);
    assert.match(checkout, /assinatura\.js\?v=9/);
    assert.match(planos, /assinatura\.js\?v=9/);
});

test("produção repara automaticamente as colunas que bloquearam o checkout", async () => {
    const [migration, repair, controller] = await Promise.all([
        ler("backend/src/main/resources/db/migration/postgresql/V15__reparar_colunas_checkout_assinaturas.sql"),
        ler("backend/src/main/java/br/com/minhalista/config/CheckoutSchemaRepair.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/AssinaturaController.java")
    ]);

    assert.match(migration, /ADD COLUMN IF NOT EXISTS cupom_primeira_cobranca_somente/);
    assert.match(migration, /ADD COLUMN IF NOT EXISTS cupom_primeiro_pagamento_aplicado/);
    assert.match(repair, /Esquema do checkout verificado e reparado com sucesso/);
    assert.match(repair, /@Order\(Ordered\.HIGHEST_PRECEDENCE\)/);
    assert.match(controller, /O banco de dados do checkout está desatualizado/);
    assert.match(controller, /COLUNA_AUSENTE/);
});
