import test from "node:test";
import assert from "node:assert/strict";

class MemoriaStorage {
    #dados = new Map();

    getItem(chave) {
        return this.#dados.has(chave) ? this.#dados.get(chave) : null;
    }

    setItem(chave, valor) {
        this.#dados.set(chave, String(valor));
    }

    removeItem(chave) {
        this.#dados.delete(chave);
    }
}

globalThis.localStorage = new MemoriaStorage();
globalThis.sessionStorage = new MemoriaStorage();
globalThis.window = {
    location: { hostname: "localhost" },
    setTimeout,
    clearTimeout,
    addEventListener() {},
    dispatchEvent() {}
};

const { listasSyncInterno } = await import("../js/listas-sync.js");

const lista = (id, atualizadoEm, produtos = []) => ({
    id,
    nome: `Lista ${id}`,
    criadorNome: "Fernando",
    mercado: "Mercado",
    produtos,
    criadoEm: "2026-09-01T10:00:00.000Z",
    atualizadoEm
});

const estado = (listas, atualizadoEm, extras = {}) => ({
    formato: 1,
    atualizadoEm,
    listas,
    listaAtualId: listas[0]?.id || "",
    mercadosFrequentes: [],
    mercadosRecentes: [],
    orcamentoCompra: null,
    listasExcluidas: [],
    ...extras
});

test("baixa a lista remota no primeiro acesso de outro celular", () => {
    const local = estado([
        {
            ...lista("local", "2026-09-08T10:00:00.000Z"),
            nome: "Minha lista",
            mercado: ""
        }
    ], "2026-09-08T10:00:00.000Z");
    const remoto = estado([
        lista("remota", "2026-09-07T10:00:00.000Z", [{ id: "arroz" }])
    ], "2026-09-07T10:00:00.000Z");

    const combinado = listasSyncInterno.combinarEstados(local, remoto);

    assert.deepEqual(combinado.listas.map(item => item.id), ["remota"]);
    assert.equal(combinado.listas[0].produtos[0].id, "arroz");
});

test("combina listas diferentes criadas em dois celulares", () => {
    const combinado = listasSyncInterno.combinarEstados(
        estado([lista("celular-a", "2026-09-08T10:00:00.000Z")], "2026-09-08T10:00:00.000Z"),
        estado([lista("celular-b", "2026-09-08T09:00:00.000Z")], "2026-09-08T09:00:00.000Z")
    );

    assert.deepEqual(
        new Set(combinado.listas.map(item => item.id)),
        new Set(["celular-a", "celular-b"])
    );
});

test("não ressuscita lista excluída em outro dispositivo", () => {
    const combinado = listasSyncInterno.combinarEstados(
        estado([], "2026-09-08T11:00:00.000Z", {
            listasExcluidas: [{
                id: "apagada",
                excluidoEm: "2026-09-08T11:00:00.000Z"
            }]
        }),
        estado([lista("apagada", "2026-09-08T10:00:00.000Z")], "2026-09-08T10:00:00.000Z")
    );

    assert.equal(combinado.listas.some(item => item.id === "apagada"), false);
});
