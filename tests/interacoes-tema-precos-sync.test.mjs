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

test("a cor personalizada usa seletor próprio e só é salva pelo botão Aplicar", async () => {
    const tema = await ler("js/tema.js");

    assert.doesNotMatch(tema, /addEventListener\("change", aplicarCorEscolhida\)/);
    assert.doesNotMatch(tema, /type="color"/);
    assert.match(tema, /id="modalSeletorCor"/);
    assert.match(tema, /closest\("#aplicarCorPersonalizada"\)/);
    assert.match(tema, /data-aba-cor="grade"/);
    assert.match(tema, /data-aba-cor="espectro"/);
    assert.match(tema, /data-aba-cor="controles"/);
    assert.match(tema, /localStorage\.setItem\(CHAVE_COR_PERSONALIZADA, corPendente\)/);
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
