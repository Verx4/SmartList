import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    avaliarReceita,
    criarInventario,
    descontarDoEstoque,
    filtrarEOrdenarReceitas,
    integrarFaltantesNaLista,
    modoResponsivo,
    proximoPasso,
    somarAoEstoque
} from "../js/receitas-core.js";

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
    assert.match(css, /\.modo-cozinha main h1/);
    assert.match(css, /overflow-x: hidden/);
    assert.match(html, /id="modoCozinha"/);
});
