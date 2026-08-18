import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const raiz = fileURLToPath(new URL("../", import.meta.url));

async function listarHtml(diretorio = raiz) {
    const entradas = await readdir(diretorio, { withFileTypes: true });
    const arquivos = [];

    for (const entrada of entradas) {
        const caminho = path.join(diretorio, entrada.name);

        if (entrada.isDirectory()) {
            if (["backend", "tests", ".git"].includes(entrada.name)) {
                continue;
            }

            arquivos.push(...await listarHtml(caminho));
            continue;
        }

        if (entrada.isFile() && entrada.name.endsWith(".html")) {
            arquivos.push(caminho);
        }
    }

    return arquivos;
}

test("todas as páginas reais possuem uma única viewport bloqueada", async () => {
    const paginas = await listarHtml();

    assert.ok(paginas.length > 0);

    for (const pagina of paginas) {
        const html = await readFile(pagina, "utf8");
        const viewports = html.match(/<meta\s+name=["']viewport["'][^>]*>/gi) || [];

        assert.equal(viewports.length, 1, path.relative(raiz, pagina));
        assert.match(viewports[0], /maximum-scale=1\.0/i);
        assert.match(viewports[0], /user-scalable=no/i);
    }
});

test("o CSS global desativa double tap e evita zoom ao focar campos", async () => {
    const css = await readFile(path.join(raiz, "css", "global.css"), "utf8");

    assert.match(css, /touch-action:\s*manipulation/);
    assert.match(css, /-webkit-text-size-adjust:\s*100%/);
    assert.match(css, /font-size:\s*max\(16px,\s*1em\)\s*!important/);
});

test("a proteção JavaScript é global, única e preserva o scroll de um dedo", async () => {
    const javascript = await readFile(path.join(raiz, "js", "tema.js"), "utf8");

    assert.match(javascript, /__smartListProtecaoZoomAtiva/);
    assert.match(javascript, /evento\.touches\?\.length > 1/);
    assert.match(javascript, /gesturestart/);
    assert.match(javascript, /dblclick/);
    assert.doesNotMatch(javascript, /touches\?\.length\s*>\s*0/);
});

test("telas interativas carregam o ponto global da proteção", async () => {
    const paginas = await listarHtml();

    for (const pagina of paginas) {
        const html = await readFile(pagina, "utf8");
        const redirecionamento = /http-equiv=["']refresh["']/i.test(html);

        if (redirecionamento) {
            continue;
        }

        assert.match(
            html,
            /js\/(?:pwa|tema)\.js(?:\?v=\d+)?/,
            path.relative(raiz, pagina)
        );
    }
});

test("novo produto começa com quantidade vazia e placeholder, sem afetar edição", async () => {
    const html = await readFile(path.join(raiz, "dashboard.html"), "utf8");
    const javascript = await readFile(path.join(raiz, "js", "app.js"), "utf8");
    const renderizacao = await readFile(path.join(raiz, "js", "render.js"), "utf8");
    const campo = html.match(/<input[^>]+id=["']novaQuantidade["'][^>]*>/i)?.[0] || "";

    assert.ok(campo);
    assert.doesNotMatch(campo, /\svalue=["']/i);
    assert.match(campo, /placeholder=["']Ex\.: 1["']/i);
    assert.match(campo, /inputmode=["']numeric["']/i);
    assert.match(javascript, /quantidade\.value = ""/);
    assert.match(javascript, /Informe uma quantidade maior que zero\./);
    assert.match(javascript, /Informe um peso maior que zero\./);
    assert.match(renderizacao, /function configurarQuantidadeEditavel/);
});
