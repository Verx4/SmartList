import test from "node:test";import assert from "node:assert/strict";class MemoriaStorage{constructor(){this.dados=new Map()}getItem(chave){return this.dados.has(chave)?this.dados.get(chave):null}setItem(chave,valor){this.dados.set(chave,String(valor))}}globalThis.localStorage=new MemoriaStorage();globalThis.window={dispatchEvent(){}};globalThis.CustomEvent=class{constructor(tipo,opcoes){this.type=tipo;this.detail=opcoes?.detail}};const{adicionarCompraNaDespensa,adicionarItemDespensa,alterarQuantidadeDespensa,listarDespensa,marcarItemComoAcabou,produtosAcabando}=await import("../js/despensa-store.js");test("compra finalizada soma automaticamente os produtos na despensa",()=>{adicionarItemDespensa({nome:"Arroz",quantidade:1,unidade:"un"});adicionarCompraNaDespensa({itens:[{nome:"Arroz",categoria:"Grãos",quantidade:2,medida:"un"}]});assert.equal(listarDespensa()[0].quantidade,3)});test("quantidade pode ser reduzida e marcada como acabou",()=>{const item=listarDespensa()[0];alterarQuantidadeDespensa(item.id,-1);assert.equal(listarDespensa()[0].quantidade,2);marcarItemComoAcabou(item.id);assert.equal(listarDespensa()[0].quantidade,0);assert.equal(produtosAcabando().length,1)});

test("abre a despensa pelo menu e mostra produtos acabando no início", async () => {
    const { readFile } = await import("node:fs/promises");
    const [menu, inicio, app, cache] = await Promise.all([
        readFile(new URL("../menu.html", import.meta.url), "utf8"),
        readFile(new URL("../inicio.html", import.meta.url), "utf8"),
        readFile(new URL("../js/app.js", import.meta.url), "utf8"),
        readFile(new URL("../service-worker.js", import.meta.url), "utf8")
    ]);
    assert.match(menu, /Minha Despensa/);
    assert.match(inicio, /Produtos acabando/);
    assert.match(app, /adicionarCompraNaDespensa\(resultado\.compra\)/);
    assert.match(cache, /despensa\.html/);
});
