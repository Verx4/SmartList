import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const raiz = new URL("../", import.meta.url);
const ler = caminho => readFile(new URL(caminho, raiz), "utf8");

test("painel ADM oferece os modos padrão, escuro e claro", async () => {
    const [navegacao, tema] = await Promise.all([
        ler("js/admin-nav.js"),
        ler("js/tema.js")
    ]);

    assert.match(navegacao, /data-admin-theme-select/);
    assert.match(navegacao, /value="padrao">Modo padrão/);
    assert.match(navegacao, /value="escuro">Modo escuro/);
    assert.match(navegacao, /value="claro">Modo claro/);
    assert.match(navegacao, /TemaMinhaLista\?\.aplicar\(seletorTema\.value\)/);
    assert.match(tema, /function aplicarAparencia/);
});

test("gestão de administradores concede e revoga papel no banco", async () => {
    const [pagina, script, controller, service] = await Promise.all([
        ler("admin/administradores.html"),
        ler("js/admin-administradores.js"),
        ler("backend/src/main/java/br/com/minhalista/admin/AdminController.java"),
        ler("backend/src/main/java/br/com/minhalista/admin/AdminService.java")
    ]);

    assert.match(pagina, /E-mail do novo administrador/);
    assert.match(pagina, /Conceder Acesso ADM/);
    assert.match(script, /api\.post\("\/admin\/administradores"/);
    assert.match(script, /api\.delete\(`\/admin\/administradores\/\$\{/);
    assert.match(controller, /@GetMapping\("\/administradores"\)/);
    assert.match(service, /usuario\.setPerfil\(Perfil\.ADMIN\)/);
    assert.match(service, /usuario\.setPerfil\(Perfil\.USUARIO\)/);
});

test("preços configurados no ADM alimentam catálogo e checkout", async () => {
    const [pagina, script, assinatura, planoService] = await Promise.all([
        ler("admin/planos.html"),
        ler("js/assinatura.js"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/AssinaturaService.java"),
        ler("backend/src/main/java/br/com/minhalista/assinatura/PlanoService.java")
    ]);

    assert.match(pagina, /Salvar Alterações de Preços/);
    assert.doesNotMatch(pagina, /Criar e autorizar cupons/);
    assert.match(script, /api\.get\("\/assinaturas\/planos"\)/);
    assert.match(assinatura, /planoService\.valorVigente\(ciclo\)/);
    assert.match(planoService, /repository\.findById\(ciclo\)/);
});

test("resposta do ADM cria badge e leitura do usuário o remove", async () => {
    const [service, controller, usuario, badge] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/sugestao/SugestaoService.java"),
        ler("backend/src/main/java/br/com/minhalista/sugestao/SugestaoController.java"),
        ler("js/sugestoes.js"),
        ler("js/sugestoes-badge.js")
    ]);

    assert.match(service, /setTemNovaResposta\(true\)/);
    assert.match(service, /setTemNovaResposta\(false\)/);
    assert.match(controller, /@PatchMapping\("\/\{id\}\/visualizar"\)/);
    assert.match(usuario, /data-visualizar-sugestao/);
    assert.match(badge, /\/sugestoes\/nao-lidas/);
});

test("histórico do ADM usa a mesma compra agrupada exibida ao usuário", async () => {
    const [service, repository] = await Promise.all([
        ler("backend/src/main/java/br/com/minhalista/preco/AdminPrecoService.java"),
        ler("backend/src/main/java/br/com/minhalista/preco/ObservacaoPrecoRepository.java")
    ]);

    assert.match(service, /observacaoRepository\.listarCompras/);
    assert.match(service, /observacaoRepository\.contarCompras/);
    assert.match(repository, /group by o\.compraChave/);
});
