import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const assinatura = await readFile(
    new URL("../js/assinatura.js", import.meta.url),
    "utf8"
);
const checkout = await readFile(
    new URL("../checkout.html", import.meta.url),
    "utf8"
);

async function arquivoExiste(caminho) {
    try {
        await access(new URL(caminho, import.meta.url));
        return true;
    } catch {
        return false;
    }
}

test("checkout mantém apenas o redirecionamento seguro ao Mercado Pago", () => {
    assert.match(assinatura, /api\.post\("\/assinaturas\/checkout"/);
    assert.match(checkout, /Ir para o Mercado Pago/);
    assert.doesNotMatch(checkout, /name="formaPagamento"|id="painelPix"|id="pixQrCode"|id="pixCopiaCola"/i);
    assert.doesNotMatch(assinatura, /\/payments\/pix|pollingPix|restaurarPixPendente/i);
});

test("API exclusiva do PIX personalizado não está presente", async () => {
    const arquivosPix = [
        "../backend/src/main/java/br/com/minhalista/pagamento/PagamentoController.java",
        "../backend/src/main/java/br/com/minhalista/pagamento/PagamentoPixService.java",
        "../backend/src/main/java/br/com/minhalista/pagamento/PixCheckoutRequest.java",
        "../backend/src/main/java/br/com/minhalista/pagamento/PixPagamentoResponse.java"
    ];

    const resultados = await Promise.all(arquivosPix.map(arquivoExiste));
    assert.deepEqual(resultados, resultados.map(() => false));
});


test("retorno do Mercado Pago confirma e ativa o Premium automaticamente", () => {
    assert.match(
        assinatura,
        /api\.post\(\s*"\/assinaturas\/confirmar-pagamento"/
    );
    assert.match(assinatura, /parametros\.get\("payment_id"\)/);
    assert.match(assinatura, /confirmacao\.premiumAtivo/);
    assert.match(assinatura, /await mostrarRetornoPagamento\(\)/);
});
