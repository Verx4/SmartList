import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("menu móvel usa uma lista completa em todas as páginas", async () => {
    const pwa = await ler("js/pwa.js");
    const rotas = [
        "Minha lista",
        "Comparação",
        "Histórico",
        "Favoritos",
        "Relatórios",
        "Sugestões",
        "Suporte",
        "Planos",
        "Perfil"
    ];

    for (const rotulo of rotas) {
        assert.match(pwa, new RegExp(`"${rotulo}"`));
    }

    assert.match(pwa, /sincronizarMenuPrincipal\(navegacao\)/);
    assert.match(pwa, /navegacao\.replaceChildren\(fragmento\)/);
    assert.match(pwa, /\["checkout\.html", "\.\/assinatura\.html"\]/);
    assert.match(pwa, /css\/temas\.css\?v=12/);

    const codigoSemImport = pwa.replace(/^import\s+[^;]+;\s*/m, "");
    assert.doesNotThrow(() => new Function(codigoSemImport));
});

test("tema claro mantém textos, estados e menu com contraste alto", async () => {
    const [temas, serviceWorker] = await Promise.all([
        ler("css/temas.css"),
        ler("service-worker.js")
    ]);

    assert.match(temas, /--cor-texto:\s*#0f172a/);
    assert.match(temas, /--cor-texto-secundario:\s*#475569/);
    assert.match(temas, /\.status-ativo[\s\S]*?color:\s*#166534\s*!important/);
    assert.match(temas, /\.mensagem-erro[\s\S]*?color:\s*#991b1b\s*!important/);
    assert.match(temas, /input::placeholder[\s\S]*?color:\s*#52637a\s*!important/);
    assert.match(temas, /site-header\.menu-ready \.main-nav[\s\S]*?rgba\(255, 255, 255, 0\.98\)/);
    assert.match(serviceWorker, /static-v61/);
    assert.match(serviceWorker, /pages-v61/);
});
