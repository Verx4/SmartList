import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("painel de logs não exibe diagnóstico antigo do Mercado Pago", async () => {
    const [pagina, script] = await Promise.all([
        ler("admin/logs.html"),
        ler("js/admin.js")
    ]);

    assert.doesNotMatch(pagina, /Diagnosticar pagamento recusado/);
    assert.doesNotMatch(pagina, /formDiagnosticoPagamento/);
    assert.doesNotMatch(script, /consultarDiagnosticoPagamento/);
});
