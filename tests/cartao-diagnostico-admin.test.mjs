import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("Checkout Pro envia sinais antifraude válidos do comprador", async () => {
    const [servico, testeBackend] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/pagamento/MercadoPagoService.java"),
        ler("backend/src/test/java/br/com/minhalista/pagamento/MercadoPagoServiceCheckoutTest.java")
    ]);

    assert.match(servico, /adicionarTelefonePagador\(pagador, usuario\.getTelefone\(\)\)/);
    assert.match(servico, /pagador\.put\("date_created", usuario\.getCriadoEm\(\)\.toString\(\)\)/);
    assert.match(servico, /telefone\.put\("number", "\[oculto\]"\)/);
    assert.match(testeBackend, /assertEquals\(81, telefone\(corpo\)\.get\("area_code"\)\)/);
    assert.match(testeBackend, /assertEquals\(999990000L, telefone\(corpo\)\.get\("number"\)\)/);
});

test("ADM consulta o motivo técnico da recusa no Mercado Pago", async () => {
    const [controller, resposta, pagina, script, estilo] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/admin/AdminController.java"),
        ler("backend/src/main/java/br/com/minhalista/admin/PagamentoDiagnosticoResponse.java"),
        ler("admin/logs.html"),
        ler("js/admin.js"),
        ler("css/admin.css")
    ]);

    assert.match(controller, /@GetMapping\("\/pagamentos\/\{pagamentoId\}\/diagnostico"\)/);
    assert.match(controller, /mercadoPagoService\.consultarPagamento\(identificador\)/);
    assert.match(resposta, /String statusDetalhe/);
    assert.match(resposta, /String metodoPagamento/);
    assert.match(pagina, /id="formDiagnosticoPagamento"/);
    assert.match(pagina, /id="resultadoDiagnosticoPagamento"/);
    assert.match(pagina, /admin\.js\?v=6/);
    assert.match(script, /cc_rejected_high_risk/);
    assert.match(script, /rejected_by_bank/);
    assert.match(script, /\/admin\/pagamentos\/\$\{encodeURIComponent\(pagamentoId\)\}\/diagnostico/);
    assert.match(estilo, /\.admin-pagamento-diagnostico/);

    const semImports = script.replace(/^import\s+[^;]+;\s*/gm, "");
    assert.doesNotThrow(() => new Function(semImports));
});

test("cache do aplicativo foi renovado", async () => {
    const serviceWorker = await ler("service-worker.js");
    assert.match(serviceWorker, /static-v62/);
    assert.match(serviceWorker, /pages-v62/);
});
