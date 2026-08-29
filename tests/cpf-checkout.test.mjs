import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("cadastro exige, mascara, valida e envia o CPF higienizado", async () => {
    const [pagina, script, utilitario] = await Promise.all([
        ler("cadastro.html"),
        ler("js/auth-page.js"),
        ler("js/cpf.js")
    ]);

    assert.match(pagina, /id="cadastroCpf"/);
    assert.match(pagina, /name="cpf"/);
    assert.match(pagina, /placeholder="000\.000\.000-00"/);
    assert.match(pagina, /id="cadastroCpf"[\s\S]*?required/);
    assert.match(script, /cpfValido\(cpf\)/);
    assert.match(script, /cpf,\s*\n\s*senha/);

    const modulo = await import(
        `data:text/javascript,${encodeURIComponent(utilitario)}`
    );
    assert.equal(modulo.formatarCpf("52998224725"), "529.982.247-25");
    assert.equal(modulo.cpfValido("529.982.247-25"), true);
    assert.equal(modulo.cpfValido("111.111.111-11"), false);
});

test("perfil carrega e permite editar o CPF salvo em endpoint autenticado", async () => {
    const [pagina, script] = await Promise.all([
        ler("perfil.html"),
        ler("js/perfil.js")
    ]);

    assert.match(pagina, /id="perfilCpf"/);
    assert.match(script, /api\.get\("\/usuarios\/me\/cpf"\)/);
    assert.match(script, /api\.put\("\/usuarios\/me\/cpf"/);
    assert.match(script, /campo\.value = resposta\.cpf \|\| ""/);
    assert.match(script, /cpfInformado/);
});

test("checkout não pede CPF e omite cupom quando nenhum código está aplicado", async () => {
    const [pagina, script, mercadoPago] = await Promise.all([
        ler("checkout.html"),
        ler("js/assinatura.js"),
        ler("backend/src/main/java/br/com/minhalista/pagamento/MercadoPagoService.java")
    ]);

    assert.doesNotMatch(pagina, /id="checkoutCpf"/);
    assert.match(pagina, /nome, e-mail e CPF de cadastro/);
    assert.match(script, /const dadosCheckout = \{/);
    assert.doesNotMatch(script, /cupom:\s*cupomAplicado[\s\S]*?:\s*null/);
    assert.match(mercadoPago, /identificacao\.put\("type", "CPF"\)/);
    assert.match(mercadoPago, /identificacao\.put\("number", cpf\)/);
    assert.match(mercadoPago, /Checkout bloqueado antes do Mercado Pago/);
    assert.match(mercadoPago, /Pagador Mercado Pago preparado/);
});
