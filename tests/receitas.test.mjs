import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    agruparSugestoes,
    avaliarReceita,
    criarInventario,
    descontarDoEstoque,
    filtrarEOrdenarReceitas,
    integrarFaltantesNaLista,
    modoResponsivo,
    proximoPasso,
    somarAoEstoque
} from "../js/receitas-core.js";
import {
    classificarProduto,
    filtrarAlimentos,
    TIPOS_PRODUTO
} from "../js/classificacao-produtos.js";

const receitas = JSON.parse(await readFile(new URL("../data/receitas.json", import.meta.url), "utf8"));
const tropeiro = receitas.find(receita => receita.id === "feijao-tropeiro");

test("Teste 1 — ingredientes compatíveis aparecem primeiro", () => {
    const inventario = criarInventario([], ["feijão", "couve", "farofa", "calabresa", "ovos", "charque"]);
    const resultados = filtrarEOrdenarReceitas(receitas, inventario);
    const posicaoTropeiro = resultados.findIndex(item => item.receita.id === "feijao-tropeiro");
    const primeiraIncompativel = resultados.findIndex(item => item.tem === 0);
    assert.ok(posicaoTropeiro >= 0 && posicaoTropeiro < primeiraIncompativel);
});

test("Teste 2 — informa 6 de 8 ingredientes e 2 faltantes", () => {
    const inventario = criarInventario([], ["feijão", "couve", "farofa", "calabresa", "ovos", "charque"]);
    const resultado = avaliarReceita(tropeiro, inventario);
    assert.equal(resultado.tem, 6);
    assert.equal(resultado.total, 8);
    assert.equal(resultado.faltantes.length, 2);
});

test("Teste 3 — adiciona somente os dois faltantes à lista existente", () => {
    const inventario = criarInventario([], ["feijão", "couve", "farofa", "calabresa", "ovos", "charque"]);
    const resultado = avaliarReceita(tropeiro, inventario);
    const lista = integrarFaltantesNaLista([{ nome: "Arroz", quantidade: 1, unidade: "unidade" }], resultado.faltantes);
    assert.deepEqual(lista.slice(1).map(item => item.nome).sort(), ["Alho", "Cebola"]);
    assert.equal(lista.length, 3);
});

test("Teste 4 — compra finalizada soma quantidades à despensa", () => {
    const inicial = [
        { id: "arroz", nome: "Arroz", quantidade: 2000, unidade: "g" },
        { id: "ovos", nome: "Ovos", quantidade: 12, unidade: "unidade" }
    ];
    const final = somarAoEstoque(inicial, [
        { nome: "Arroz", quantidade: 5, unidade: "kg" },
        { nome: "Ovos", quantidade: 12, unidade: "unidade" }
    ]);
    assert.equal(final.find(item => item.nome === "Arroz").quantidade, 7000);
    assert.equal(final.find(item => item.nome === "Ovos").quantidade, 24);
});

test("Teste 5 — atualização da despensa aumenta receitas disponíveis", () => {
    const antes = filtrarEOrdenarReceitas(receitas, criarInventario([], []))
        .filter(item => item.podeFazer).length;
    const estoque = somarAoEstoque([], [
        { nome: "Flocão de milho", quantidade: 150, unidade: "g" },
        { nome: "Ovos", quantidade: 2, unidade: "unidade" }
    ]);
    const depois = filtrarEOrdenarReceitas(receitas, criarInventario(estoque, []))
        .filter(item => item.podeFazer).length;
    assert.ok(depois > antes);
});

test("Teste 6 — finalizar receita desconta a despensa sem estoque negativo", () => {
    const estoque = [{ id: "ovos", nome: "Ovos", quantidade: 12, unidade: "unidade" }];
    const final = descontarDoEstoque(estoque, tropeiro.ingredientes);
    assert.equal(final[0].quantidade, 8);
    const escasso = descontarDoEstoque([{ ...estoque[0], quantidade: 2 }], tropeiro.ingredientes);
    assert.equal(escasso[0].quantidade, 0);
});

test("Teste 7 — combina Lanche, Salgada e até 30 minutos", () => {
    const resultados = filtrarEOrdenarReceitas(receitas, criarInventario([], []), {
        categoria: "lanche",
        tipo: "salgada",
        tempo: "ate-30"
    });
    assert.ok(resultados.length >= 2);
    assert.ok(resultados.every(item => item.receita.categoria === "lanche"
        && item.receita.tipo === "salgada"
        && item.receita.tempoMinutos <= 30));
});

test("Teste 8 — filtro só com o que tenho retorna apenas receitas possíveis", () => {
    const estoque = [
        { nome: "Ovos", quantidade: 4, unidade: "unidade" },
        { nome: "Queijo", quantidade: 150, unidade: "g" },
        { nome: "Tomate", quantidade: 2, unidade: "unidade" },
        { nome: "Leite", quantidade: 100, unidade: "ml" }
    ];
    const resultados = filtrarEOrdenarReceitas(receitas, criarInventario(estoque, []), {
        somenteDisponiveis: true
    });
    assert.ok(resultados.some(item => item.receita.id === "omelete-de-forno"));
    assert.ok(resultados.every(item => item.podeFazer));
});

test("Teste 9 — passo a passo avança, volta e respeita os limites", () => {
    assert.equal(proximoPasso(0, 7, 1), 1);
    assert.equal(proximoPasso(6, 7, 1), 6);
    assert.equal(proximoPasso(0, 7, -1), 0);
    assert.equal(proximoPasso(3, 7, -1), 2);
});

test("Teste 10 — modo cozinha possui layout específico para celular e web", async () => {
    const [css, html] = await Promise.all([
        readFile(new URL("../css/receitas.css", import.meta.url), "utf8"),
        readFile(new URL("../comparacao.html", import.meta.url), "utf8")
    ]);
    assert.equal(modoResponsivo(390), "mobile");
    assert.equal(modoResponsivo(1440), "web");
    assert.match(css, /@media \(max-width: 640px\)/);
    assert.match(css, /\.modo-cozinha \.cozinha-etapa > h1/);
    assert.match(css, /overflow-x: hidden/);
    assert.match(html, /id="modoCozinha"/);
    assert.match(html, /class="preparo-guiado-destaque"/);
    assert.match(html, /js\/pwa\.js\?v=2/);
    assert.match(css, /\.preparo-guiado-destaque button[\s\S]*min-height: 54px/);
});

test("Preparo guiado — todas as receitas possuem utensílios e etapas estruturadas", () => {
    assert.ok(receitas.every(receita => Array.isArray(receita.utensilios) && receita.utensilios.length > 0));
    assert.ok(receitas.every(receita => receita.passos.every(passo =>
        Array.isArray(passo.ingredientes)
        && Array.isArray(passo.utensilios)
        && Array.isArray(passo.continueUsando)
        && Array.isArray(passo.acoes)
        && passo.acoes.length > 0
        && passo.tempoAproximado
        && passo.intensidadeFogo
        && passo.pontoEsperado
        && Array.isArray(passo.observacoes)
    )));
});

test("Preparo guiado — ingredientes usados pertencem à lista geral da receita", () => {
    for (const receita of receitas) {
        const gerais = new Set(receita.ingredientes.map(item => item.nome));
        for (const passo of receita.passos) {
            assert.ok(passo.ingredientes.every(item => gerais.has(item.nome)), `${receita.nome}: ingrediente sem vínculo`);
        }
    }
});

test("Preparo guiado — Feijão Tropeiro orienta uso, fogo, ponto e continuidade", () => {
    const carnes = tropeiro.passos.find(passo => passo.titulo === "Doure as carnes");
    const temperos = tropeiro.passos.find(passo => passo.titulo === "Refogue os temperos e a couve");
    assert.deepEqual(carnes.ingredientes.map(item => item.nome), ["Calabresa", "Charque", "Óleo"]);
    assert.equal(carnes.intensidadeFogo, "Médio");
    assert.match(carnes.pontoEsperado, /douradas/i);
    assert.ok(temperos.continueUsando.some(item => /mesma panela/i.test(item)));
    assert.ok(temperos.acoes.length >= 4);
});

test("Preparo guiado — modo cozinha oferece progresso e consultas sem perder a etapa", async () => {
    const [css, html, js] = await Promise.all([
        readFile(new URL("../css/receitas.css", import.meta.url), "utf8"),
        readFile(new URL("../comparacao.html", import.meta.url), "utf8"),
        readFile(new URL("../js/receitas.js", import.meta.url), "utf8")
    ]);
    assert.match(html, /id="barraModoCozinha"/);
    assert.match(html, /id="verIngredientesCozinha"/);
    assert.match(html, /id="verUtensiliosCozinha"/);
    assert.match(html, /id="consultaCozinhaDialog"/);
    assert.match(js, /estadoPassoCozinha/);
    assert.match(js, /abrirConsultaCozinha/);
    assert.match(css, /\.modo-cozinha footer button[\s\S]*min-height: 62px/);
});

test("Teste 74 — compra finalizada mantém o histórico completo e envia somente alimentos à despensa", () => {
    const compraCompleta = [
        { nome: "Arroz", categoria: "🌾 Grãos", quantidade: 2, unidade: "kg" },
        { nome: "Detergente", categoria: "🧼 Limpeza", quantidade: 1, unidade: "unidade" },
        { nome: "Shampoo", categoria: "🪥 Higiene", quantidade: 1, unidade: "unidade" },
        { nome: "Suco pronto", categoria: "🥤 Bebidas", quantidade: 2, unidade: "unidade" }
    ];
    const itensDespensa = filtrarAlimentos(compraCompleta);
    assert.equal(compraCompleta.length, 4);
    assert.deepEqual(itensDespensa.map(item => item.nome), ["Arroz"]);
});

test("Teste 75 — classificação separa alimento, bebida, limpeza, higiene e utilidade doméstica", () => {
    assert.equal(classificarProduto({ nome: "Feijão", categoria: "🌾 Grãos" }).tipo, TIPOS_PRODUTO.ALIMENTO);
    assert.equal(classificarProduto({ nome: "Refrigerante", categoria: "🥤 Bebidas" }).tipo, TIPOS_PRODUTO.BEBIDA);
    assert.equal(classificarProduto({ nome: "Detergente", categoria: "🧼 Limpeza" }).tipo, TIPOS_PRODUTO.LIMPEZA);
    assert.equal(classificarProduto({ nome: "Shampoo", categoria: "🪥 Higiene" }).tipo, TIPOS_PRODUTO.HIGIENE);
    assert.equal(classificarProduto({ nome: "Papel alumínio", categoria: "🔌 Utilidades" }).tipo, TIPOS_PRODUTO.DOMESTICO);
});

test("Teste 76 — alimento sem quantidade permanece presente e não é tratado como estoque zero", () => {
    const estoque = somarAoEstoque([], [{ nome: "Ovos", quantidade: null, unidade: "unidade" }]);
    const resultado = avaliarReceita(tropeiro, criarInventario(estoque));
    const ovos = resultado.itens.find(item => item.nome === "Ovos");
    assert.equal(ovos.presente, true);
    assert.equal(ovos.quantidadeConhecida, false);
    assert.ok(resultado.quantidadesDesconhecidas.some(item => item.nome === "Ovos"));
    assert.ok(!resultado.faltantes.some(item => item.nome === "Ovos"));
});

test("Teste 77 — adições repetidas não duplicam o alimento da despensa", () => {
    const estoque = somarAoEstoque([], [
        { nome: "Arroz", quantidade: 1, unidade: "kg" },
        { nome: "arroz", quantidade: 500, unidade: "g" }
    ]);
    assert.equal(estoque.filter(item => item.chaveProduto === "arroz").length, 1);
    assert.equal(estoque[0].quantidade, 1500);
});

test("Teste 78 — página inicial limita sugestões a três por categoria sem repetir receita", () => {
    const grupos = agruparSugestoes(receitas, criarInventario([], []), 3);
    assert.ok(Object.values(grupos).every(grupo => grupo.length <= 3));
    const ids = Object.values(grupos).flat().map(item => item.receita.id);
    assert.equal(new Set(ids).size, ids.length);
});

test("Teste 79 — busca encontra por nome, ingrediente e pequena diferença de digitação", () => {
    const inventario = criarInventario([], []);
    assert.ok(filtrarEOrdenarReceitas(receitas, inventario, { busca: "tropeiro" }).some(item => item.receita.id === "feijao-tropeiro"));
    assert.ok(filtrarEOrdenarReceitas(receitas, inventario, { busca: "charque" }).some(item => item.receita.id === "feijao-tropeiro"));
    assert.ok(filtrarEOrdenarReceitas(receitas, inventario, { busca: "charquf" }).some(item => item.receita.id === "feijao-tropeiro"));
});

test("Teste 80 — falta parcial usa somente a diferença necessária", () => {
    const resultado = avaliarReceita(tropeiro, criarInventario([
        { nome: "Ovos", quantidade: 2, unidade: "unidade" }
    ]));
    const ovos = resultado.faltantes.find(item => item.nome === "Ovos");
    assert.equal(ovos.falta, 2);
    const lista = integrarFaltantesNaLista([{ nome: "Ovos", quantidade: 1, unidade: "unidade" }], [ovos]);
    assert.equal(lista.find(item => item.nome === "Ovos").quantidade, 3);
});

test("Teste 81 — finalizar desconta apenas quantidades conhecidas e recalcula sem negativo", () => {
    const estoque = [
        { nome: "Ovos", quantidade: 5, quantidadeConhecida: true, unidade: "unidade" },
        { nome: "Cebola", quantidade: null, quantidadeConhecida: false, unidade: "unidade" }
    ];
    const final = descontarDoEstoque(estoque, tropeiro.ingredientes);
    assert.equal(final.find(item => item.nome === "Ovos").quantidade, 1);
    assert.equal(final.find(item => item.nome === "Cebola").quantidade, null);
});
