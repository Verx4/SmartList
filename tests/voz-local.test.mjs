import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const listaRapida = await readFile(new URL("../js/lista-rapida.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../js/voz-local-worker.js", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

test("a lista rápida transcreve no aparelho sem chamar uma API paga", () => {
    assert.doesNotMatch(listaRapida, /voz\/transcrever/);
    assert.doesNotMatch(listaRapida, /from "\.\/api\.js"/);
    assert.match(listaRapida, /voz-local-worker\.js/);
    assert.match(listaRapida, /converterAudioParaMono16k/);
});

test("o worker usa Whisper compacto, cache do navegador e português", () => {
    assert.match(worker, /onnx-community\/whisper-tiny/);
    assert.match(worker, /useBrowserCache = true/);
    assert.match(worker, /language: "portuguese"/);
    assert.match(worker, /device: "wasm"/);
});

test("a nova versão do worker entra no cache do PWA", () => {
    assert.match(serviceWorker, /static-v93/);
    assert.match(serviceWorker, /\.\/js\/voz-local-worker\.js/);
});
