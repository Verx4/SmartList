import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboard = await readFile(new URL("../dashboard.html", import.meta.url), "utf8");
const listaRapida = await readFile(new URL("../js/lista-rapida.js", import.meta.url), "utf8");
const estilo = await readFile(new URL("../css/lista-rapida.css", import.meta.url), "utf8");
const cache = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

test("mantém a criação rápida por texto e a organização dos produtos", () => {
    assert.match(dashboard, /id="btnListaRapida"/);
    assert.match(dashboard, /id="textoListaRapida"/);
    assert.match(dashboard, /id="btnGerarListaRapida"/);
    assert.match(listaRapida, /function interpretarTexto/);
    assert.match(listaRapida, /function confirmarLista/);
});

test("remove completamente a criação de lista por microfone", () => {
    assert.doesNotMatch(listaRapida, /microfone|MediaRecorder|SpeechRecognition|voz-local-worker|Falar produtos/i);
    assert.doesNotMatch(estilo, /lista-rapida-voz|btn-voz-lista/);
    assert.doesNotMatch(cache, /voz-local-worker/);
    assert.match(cache, /static-v94/);
});
