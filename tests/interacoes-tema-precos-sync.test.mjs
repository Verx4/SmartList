import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ler = caminho => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");

test("Adicionar preço abre o painel antes de recriar a lista e foca o novo campo", async () => {
    const render = await ler("js/render.js");
    const inicio = render.indexOf(
        `querySelector('[data-acao="abrir-precos"]')?.addEventListener`
    );
    const trecho = render.slice(inicio, inicio + 3500);

    assert.ok(trecho.indexOf("precosAbertos.add(chave)") < trecho.indexOf("handlers.aoAbrirNovoPreco"));
    assert.match(trecho, /novoCampo\?\.focus\(\)/);
    assert.match(trecho, /novoCampo\?\.select\(\)/);
});

test("a cor personalizada só é aplicada pelo botão ou pela tecla Enter", async () => {
    const tema = await ler("js/tema.js");

    assert.doesNotMatch(tema, /addEventListener\("change", aplicarCorEscolhida\)/);
    assert.match(tema, /evento\.key === "Enter"/);
    assert.match(tema, /closest\("#aplicarCorPersonalizada"\)/);
});

test("listas possuem sincronização autenticada e persistência por usuário", async () => {
    const [sync, controller, migration] = await Promise.all([
        ler("js/listas-sync.js"),
        ler("backend/src/main/java/br/com/minhalista/listasync/SincronizacaoListasController.java"),
        ler("backend/src/main/resources/db/migration/postgresql/V19__sincronizar_listas_entre_dispositivos.sql")
    ]);

    assert.match(sync, /api\.get\(\s*"\/listas\/sincronizacao"/);
    assert.match(sync, /api\.put\(/);
    assert.match(sync, /combinarEstados/);
    assert.match(sync, /PREFIXO_CACHE_USUARIO/);
    assert.match(controller, /@RequestMapping\("\/api\/listas\/sincronizacao"\)/);
    assert.match(migration, /usuario_id UUID NOT NULL/);
    assert.match(migration, /UNIQUE \(usuario_id\)/);
});
