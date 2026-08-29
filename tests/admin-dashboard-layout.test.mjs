import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../css/admin.css", import.meta.url), "utf8");
const adminJs = await readFile(new URL("../js/admin.js", import.meta.url), "utf8");

test("o dashboard usa toda a largura disponível nos blocos principais", () => {
    assert.match(
        css,
        /body\[data-admin-page="dashboard"\] \.admin-main > \.grid-resumo \+ \.admin-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(320px, 2fr\) minmax\(520px, 3fr\)/
    );
    assert.match(
        css,
        /body\[data-admin-page="dashboard"\] \.admin-main > \.admin-grid \+ \.admin-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/
    );
});

test("os últimos usuários têm colunas legíveis e estado sem quebra", () => {
    assert.match(adminJs, /class="status-item admin-usuario-recente"/);
    assert.match(adminJs, /class="admin-usuario-recente-email"/);
    assert.match(css, /\.admin-usuario-recente\s*\{[\s\S]*grid-template-columns:/);
    assert.match(css, /\.admin-usuario-recente \.status\s*\{[\s\S]*white-space:\s*nowrap/);
});

test("o painel preserva uma versão móvel em uma coluna", () => {
    assert.match(
        css,
        /@media \(max-width: 760px\)[\s\S]*\.admin-usuario-recente\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/
    );
});

test("o item ativo do menu respeita o contraste do tema", () => {
    assert.match(
        css,
        /\.admin-nav a\.active\s*\{[\s\S]*color:\s*var\(--cor-texto-botao, #ffffff\)/
    );
});

test("o tema claro usa contraste forte nos estados administrativos", () => {
    assert.match(
        css,
        /html\[data-palette="claro"\] body\[data-admin-page\] \.status-ativo,[\s\S]*color:\s*#166534;[\s\S]*background:\s*#dcfce7;/
    );
    assert.match(
        css,
        /html\[data-palette="claro"\] body\[data-admin-page\] \.status-inativo,[\s\S]*color:\s*#991b1b;[\s\S]*background:\s*#fee2e2;/
    );
});

test("os atalhos administrativos formam uma grade responsiva sem sobreposição", () => {
    assert.match(
        css,
        /\.admin-atalhos\s*\{[\s\S]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/
    );
    assert.match(
        css,
        /@media \(max-width: 900px\)[\s\S]*\.admin-atalhos\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/
    );
    assert.match(
        css,
        /@media \(max-width: 460px\)[\s\S]*\.admin-atalhos\s*\{[\s\S]*grid-template-columns:\s*1fr/
    );
});
