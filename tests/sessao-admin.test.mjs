import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("painel ADM encerra a sessão somente quando a API responder 401", async () => {
    const scripts = await Promise.all([
        ler("js/admin.js"),
        ler("js/admin-coleta-precos.js"),
        ler("js/admin-planos.js"),
        ler("js/admin-administradores.js")
    ]);

    scripts.forEach(script => {
        assert.match(script, /Number\(erro\?\.status\) === 401/);
    });
});

test("consulta do perfil não permite que a assinatura derrube a sessão", async () => {
    const service = await ler(
        "backend/src/main/java/br/com/minhalista/usuario/UsuarioService.java"
    );

    assert.match(service, /sincronizarAssinaturaSemBloquearPerfil/);
    assert.match(service, /catch \(RuntimeException erro\)/);
});
