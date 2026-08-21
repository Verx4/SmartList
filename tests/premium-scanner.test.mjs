import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const ler = caminho => readFile(new URL(caminho, import.meta.url), "utf8");

test("Histórico, Comparação e Minha Economia exigem Premium", async () => {
    const [controle, historico, economia, comparacao, backend] = await Promise.all([
        ler("../js/acesso-premium.js"),
        ler("../historico.html"),
        ler("../minha-economia.html"),
        ler("../js/comparar-embalagens.js"),
        ler("../backend/src/main/java/br/com/minhalista/comparacao/ComparacaoController.java")
    ]);

    for (const rota of ["historico.html", "minha-economia.html", "comparar-embalagens.html"]) {
        assert.match(controle, new RegExp(rota.replace(".", "\\.")));
    }
    assert.match(historico, /acesso-premium\.js/);
    assert.match(economia, /acesso-premium\.js/);
    assert.match(comparacao, /acesso-premium\.js/);
    assert.match(backend, /exigirPremium\(\)/);
});

test("Scanner foi removido da interface e do cache da PWA", async () => {
    const [dashboard, serviceWorker] = await Promise.all([
        ler("../dashboard.html"),
        ler("../service-worker.js")
    ]);

    assert.doesNotMatch(dashboard, /btnLeitorNota|scanner-nota/i);
    assert.doesNotMatch(serviceWorker, /scanner-nota/i);

    for (const caminho of ["../js/scanner-nota.js", "../css/scanner-nota.css"]) {
        await assert.rejects(access(new URL(caminho, import.meta.url)));
    }
});
