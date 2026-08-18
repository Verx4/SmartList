import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assinatura = await readFile(
    new URL("../js/assinatura.js", import.meta.url),
    "utf8"
);
const checkout = await readFile(
    new URL("../checkout.html", import.meta.url),
    "utf8"
);

test("frontend envia plano e CPF sem aceitar valor ou status do cliente", () => {
    const chamada = assinatura.match(
        /api\.post\("\/payments\/pix",\s*\{([\s\S]*?)\}\)/
    );

    assert.ok(chamada);
    assert.match(chamada[1], /planId:\s*dados\.planId/);
    assert.match(chamada[1], /cpf/);
    assert.doesNotMatch(chamada[1], /amount|valor|userId|status|premium/i);
});

test("checkout preserva cartão e oferece PIX separado", () => {
    assert.match(checkout, /value="cartao"/);
    assert.match(checkout, /value="pix"/);
    assert.match(checkout, /id="pixQrCode"/);
    assert.match(checkout, /id="pixCopiaCola"/);
    assert.match(checkout, /id="cpfPagadorPix"/);
    assert.match(checkout, /não é armazenado pelo Smart List/);
    assert.doesNotMatch(checkout, /JÁ PAGUEI|JA PAGUEI/i);
});

test("CPF é exigido somente no fluxo PIX e validado antes da API", () => {
    assert.match(assinatura, /cpfPagadorPix\.required\s*=\s*pix/);
    assert.match(assinatura, /cpfValido\(cpf\)/);
    assert.match(assinatura, /somenteDigitos\(campoCpf\?\.value\)/);
});

test("tela PIX possui QR Code, Copia e Cola e nunca libera Premium manualmente", () => {
    assert.match(checkout, /id="pixQrCode"/);
    assert.match(checkout, /id="pixCopiaCola"/);
    assert.match(checkout, /id="btnCopiarPix"/);
    assert.match(checkout, /id="btnVerificarPix"/);
    assert.match(checkout, /Seu Premium será liberado automaticamente/);
    assert.doesNotMatch(checkout, /JÁ PAGUEI/i);
    assert.match(assinatura, /navigator\.clipboard\.writeText/);
});

test("status terminal encerra a consulta automática", () => {
    for (const status of [
        "approved",
        "rejected",
        "cancelled",
        "expired",
        "refunded"
    ]) {
        assert.match(assinatura, new RegExp(`"${status}"`));
    }

    assert.match(assinatura, /STATUS_TERMINAIS\.has\(status\)/);
    assert.match(assinatura, /pararPollingPix\(\)/);
});

test("polling possui intervalo e limite de tentativas", () => {
    assert.match(assinatura, /INTERVALO_POLLING\s*=\s*5000/);
    assert.match(assinatura, /MAXIMO_TENTATIVAS_POLLING\s*=\s*360/);
    assert.match(assinatura, /STATUS_TERMINAIS/);
});

