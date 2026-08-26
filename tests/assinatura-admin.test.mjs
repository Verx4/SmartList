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

    assert.match(service, /case "approved" -> \{[\s\S]*ativar\(assinatura, pagamento\.id\(\)\)/);
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


test("formulário de cortesia mostra o resultado no local da ação", async () => {
    const [admin, usuarios] = await Promise.all([
        ler("js/admin.js"),
        ler("admin/usuarios.html")
    ]);

    assert.match(usuarios, /id="mensagemCortesia"/);
    assert.match(usuarios, /list="usuariosCortesiaDisponiveis"/);
    assert.match(admin, /exibirResultadoCortesia/);
    assert.match(admin, /botao\.disabled = true/);
    assert.match(admin, /Promise\.allSettled/);
    assert.match(admin, /Nenhum usuário foi encontrado com o e-mail/);
});


test("painel diferencia acessos, inativos e permite atualização manual", async () => {
    const [admin, usuarios, painel, resposta] = await Promise.all([
        ler("js/admin.js"),
        ler("admin/usuarios.html"),
        ler("admin/index.html"),
        ler("backend/src/main/java/br/com/minhalista/admin/UsuarioAdminResponse.java")
    ]);

    assert.match(resposta, /String classificacaoAcesso/);
    assert.match(resposta, /return "PAGANTE"/);
    assert.match(admin, /rotulo: "Pagante"/);
    assert.match(admin, /classificacaoUsuario\(usuario\) === acesso/);
    assert.match(admin, /usuariosInativos/);
    assert.match(admin, /atualizarPainelAdmin/);
    assert.match(usuarios, /<option value="PAGANTE">Pagante<\/option>/);
    assert.match(usuarios, /<option value="INATIVO">Inativo há 40 dias<\/option>/);
    assert.match(usuarios, /<th>Classificação<\/th>/);
    assert.match(painel, /id="graficoUsuariosAcesso"/);
    assert.match(painel, /id="btnAtualizarAdmin"/);
    assert.match(resposta, /DIAS_PARA_INATIVIDADE = 40/);
    assert.match(resposta, /return "INATIVO"/);
});


test("perfil mostra se o Premium é pagante ou cortesia", async () => {
    const perfil = await ler("js/perfil.js");

    assert.match(perfil, /Plano Premium — Pagante/);
    assert.match(perfil, /Plano Premium — Cortesia/);
    assert.match(perfil, /api\.get\("\/assinaturas\/atual"\)/);
});

test("administrador pode limpar a auditoria após confirmação", async () => {
    const [admin, usuarios, controller, service] = await Promise.all([
        ler("js/admin.js"),
        ler("admin/usuarios.html"),
        ler("backend/src/main/java/br/com/minhalista/admin/AdminController.java"),
        ler("backend/src/main/java/br/com/minhalista/admin/AdminService.java")
    ]);

    assert.match(usuarios, /id="btnLimparAuditoria"/);
    assert.match(admin, /window\.confirm\([\s\S]*não pode ser desfeita/);
    assert.match(admin, /api\.post\([\s\S]*"\/admin\/usuarios\/auditoria\/limpar"/);
    assert.match(admin, /await carregarAuditoriaAcessos\(\)/);
    assert.match(controller, /@PostMapping\("\/usuarios\/auditoria\/limpar"\)/);
    assert.match(service, /historicoRepository\.limparTodos\(\)/);
});
