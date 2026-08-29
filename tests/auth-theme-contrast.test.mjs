import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
    new URL("../css/auth-theme-fix.css", import.meta.url),
    "utf8"
);

test("o contraste claro funciona com os identificadores atual e legado", () => {
    assert.match(
        css,
        /:is\(html\[data-palette="claro"\], html\[data-theme="claro"\]\)/
    );
});

test("labels, checkbox e mensagens permanecem legíveis no modo claro", () => {
    assert.match(css, /\.form-group label,[\s\S]*color:\s*#334155 !important/);
    assert.match(css, /\.checkbox-label span,[\s\S]*color:\s*#334155 !important/);
    assert.match(css, /\.mensagem-aviso\s*\{[\s\S]*color:\s*#78350f !important/);
    assert.match(css, /\.mensagem-erro\s*\{[\s\S]*color:\s*#991b1b !important/);
});

test("o preenchimento automático do iPhone não usa texto ou fundo ilegível", () => {
    assert.match(css, /input:-webkit-autofill/);
    assert.match(css, /-webkit-text-fill-color:\s*#0f172a !important/);
    assert.match(css, /-webkit-box-shadow:\s*0 0 0 1000px #f8fafc inset !important/);
});
