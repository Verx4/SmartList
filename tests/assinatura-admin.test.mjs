import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);

async function ler(caminho) {
    return readFile(new URL(caminho, raiz), "utf8");
}

test("pagamento aprovado promove o usuário para Premium", async () => {
    const service = await ler(
        "backend/src/main/java/br/com/minhalista/assinatura/AssinaturaService.java"
    );

    assert.match(service, /case "approved" -> ativar/);
    assert.match(service, /usuario\.setTipoAcesso\(TipoAcesso\.PREMIUM\)/);
});

test("assinatura vencida sem renovação retorna o usuário para Free", async () => {
    const validade = await ler(
        "backend/src/main/java/br/com/minhalista/assinatura/AssinaturaValidadeService.java"
    );

    assert.match(validade, /@Scheduled/);
    assert.match(validade, /StatusAssinatura\.EXPIRADA/);
    assert.match(validade, /existsByUsuarioIdAndStatusAndVenceEmAfter/);
    assert.match(validade, /usuario\.setTipoAcesso\(TipoAcesso\.FREE\)/);
});

test("painel administrativo atualiza assinatura e validade automaticamente", async () => {
    const admin = await ler("js/admin.js");

    assert.match(admin, /usuario\.assinaturaVenceEm \|\| usuario\.cortesiaAte/);
    assert.match(admin, /setInterval\([\s\S]*atualizarAssinaturasAdmin[\s\S]*30000/);
    assert.match(admin, /visibilitychange/);
});
