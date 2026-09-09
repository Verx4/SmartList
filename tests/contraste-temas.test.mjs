import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = (caminho) => readFile(new URL(caminho, raiz), "utf8");

function canaisHex(cor) {
    const normalizada = cor.replace("#", "");
    const hex = normalizada.length === 3
        ? [...normalizada].map(canal => canal + canal).join("")
        : normalizada;

    return [0, 2, 4].map(indice => Number.parseInt(hex.slice(indice, indice + 2), 16));
}

function luminanciaRelativa(cor) {
    const canais = canaisHex(cor).map(canal => {
        const normalizado = canal / 255;
        return normalizado <= 0.04045
            ? normalizado / 12.92
            : ((normalizado + 0.055) / 1.055) ** 2.4;
    });

    return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
}

function contraste(corA, corB) {
    const maior = Math.max(luminanciaRelativa(corA), luminanciaRelativa(corB));
    const menor = Math.min(luminanciaRelativa(corA), luminanciaRelativa(corB));
    return (maior + 0.05) / (menor + 0.05);
}

function blocoPaleta(css, paleta) {
    const seletor = paleta === "azul"
        ? String.raw`:root,\s*html\[data-palette="azul"\]`
        : String.raw`html\[data-palette="${paleta}"\]`;
    const bloco = css.match(new RegExp(`${seletor}\\s*\\{([\\s\\S]*?)\\}`))?.[1];

    assert.ok(bloco, `A paleta ${paleta} precisa existir`);
    return bloco;
}

function variavel(bloco, nome) {
    const valor = bloco.match(new RegExp(`--${nome}:\\s*(#[0-9a-f]{3,6})`, "i"))?.[1];
    assert.ok(valor, `A variável --${nome} precisa existir`);
    return valor;
}

test("todas as paletas mantêm textos, links, botões e bordas legíveis", async () => {
    const css = await ler("css/temas.css");
    const paletas = ["azul", "claro", "preto", "amarelo", "vermelho", "verde", "roxo", "personalizada"];

    for (const paleta of paletas) {
        const bloco = blocoPaleta(css, paleta);
        const fundo = variavel(bloco, "cor-fundo");
        const superficie = variavel(bloco, "cor-superficie");
        const superficieSecundaria = variavel(bloco, "cor-superficie-secundaria");
        const texto = variavel(bloco, "cor-texto");
        const secundario = variavel(bloco, "cor-texto-secundario");
        const borda = variavel(bloco, "cor-borda");
        const primaria = variavel(bloco, "cor-primaria");
        const destaque = variavel(bloco, "cor-destaque");
        const textoBotao = variavel(bloco, "cor-texto-botao");

        assert.ok(contraste(texto, fundo) >= 4.5, `${paleta}: texto principal no fundo`);
        assert.ok(contraste(texto, superficie) >= 4.5, `${paleta}: texto principal no card`);
        assert.ok(contraste(secundario, fundo) >= 4.5, `${paleta}: texto secundário no fundo`);
        assert.ok(contraste(secundario, superficie) >= 4.5, `${paleta}: texto secundário no card`);
        assert.ok(contraste(secundario, superficieSecundaria) >= 4.5, `${paleta}: texto secundário na superfície secundária`);
        assert.ok(contraste(destaque, fundo) >= 4.5, `${paleta}: links no fundo`);
        assert.ok(contraste(destaque, superficie) >= 4.5, `${paleta}: links no card`);
        assert.ok(contraste(textoBotao, primaria) >= 4.5, `${paleta}: texto de botão primário`);
        assert.ok(contraste(borda, superficie) >= 3, `${paleta}: borda no card`);
        assert.ok(contraste(borda, superficieSecundaria) >= 3, `${paleta}: borda no campo`);
    }
});

test("tabelas e textos fixos passam a respeitar a paleta ativa", async () => {
    const css = await ler("css/temas.css");

    assert.match(css, /html\[data-palette\] td,[\s\S]*?color:\s*var\(--cor-texto\)\s*!important/);
    assert.match(css, /html\[data-palette\] th,[\s\S]*?border-color:\s*var\(--cor-borda\)\s*!important/);
    assert.match(css, /html\[data-palette\] \.documento-legal h2/);
    assert.match(css, /html\[data-palette\] \.relatorio-barra-info strong/);
    assert.match(css, /html\[data-palette\] \.site-footer/);
    assert.match(css, /html\[data-palette\] \.categoria-produto,[\s\S]*?color:\s*var\(--cor-texto-botao\)\s*!important/);
});

test("tema personalizado calcula contraste real e não usa limiar aproximado", async () => {
    const tema = await ler("js/tema.js");

    assert.match(tema, /function luminanciaRelativa\(/);
    assert.match(tema, /function contrasteEntre\(/);
    assert.match(tema, /function corComContrasteClaro\(/);
    assert.match(tema, /function textoAcessivelSobre\(/);
    assert.match(tema, /const primaria = corComContrasteClaro\(hex, \[fundo, superficie\], 3\)/);
    assert.match(tema, /\[fundo, superficie, secundaria\],[\s\S]*?4\.5/);
    assert.match(tema, /"--cor-texto-secundario": textoSecundario/);
    assert.match(tema, /"--cor-texto-botao": textoBotao/);
    assert.doesNotMatch(tema, /luminosidade\s*>\s*155/);
});

test("autenticação e mensagens do modo claro usam bordas perceptíveis", async () => {
    const [tema, autenticacao] = await Promise.all([
        ler("css/temas.css"),
        ler("css/auth-theme-fix.css")
    ]);

    assert.ok(contraste("#76869b", "#ffffff") >= 3);
    assert.match(autenticacao, /\.auth-card \{[\s\S]*?border-color:\s*#76869b\s*!important/);
    assert.match(autenticacao, /\.auth-card \.form-group textarea \{[\s\S]*?border-color:\s*#76869b\s*!important/);
    assert.match(tema, /\.status-ok \{[\s\S]*?border-color:\s*#16a34a\s*!important/);
    assert.match(tema, /\.status-erro \{[\s\S]*?border-color:\s*#ef4444\s*!important/);
    assert.match(tema, /\.status-alerta \{[\s\S]*?border-color:\s*#b45309\s*!important/);
});

test("nova versão de contraste invalida os recursos mantidos pelo PWA", async () => {
    const [pwa, serviceWorker] = await Promise.all([
        ler("js/pwa.js"),
        ler("service-worker.js")
    ]);

    assert.match(pwa, /css\/temas\.css\?v=14/);
    assert.match(pwa, /js\/tema\.js\?v=14/);
    assert.match(serviceWorker, /static-v85/);
    assert.match(serviceWorker, /pages-v85/);
});
