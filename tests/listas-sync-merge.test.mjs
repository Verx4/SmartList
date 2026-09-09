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

    clear() {
        this.#dados.clear();
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

test("preserva os produtos do celular original contra lista remota vazia na primeira sincronização", () => {
    const local = estado([
        lista("compra-do-mes", "2026-09-08T10:00:00.000Z", [{ id: "feijao" }])
    ], "2026-09-08T10:00:00.000Z", { orcamentoCompra: "500" });
    const remoto = estado([
        lista("compra-do-mes", "2026-09-08T11:00:00.000Z", [])
    ], "2026-09-08T11:00:00.000Z", { orcamentoCompra: "500" });

    const combinado = listasSyncInterno.combinarEstados(local, remoto, {
        protegerProdutosNaPrimeiraSincronizacao: true
    });

    assert.equal(combinado.listas[0].produtos[0].id, "feijao");
    assert.equal(combinado.orcamentoCompra, "500");
});

test("recupera produtos antigos quando listasSalvas foi criada vazia", () => {
    localStorage.clear();
    localStorage.setItem("listaAtualId", "lista-original");
    localStorage.setItem("listasSalvas", JSON.stringify([
        lista("lista-original", "2026-09-08T10:00:00.000Z", [])
    ]));
    localStorage.setItem("produtos", JSON.stringify([{ id: "arroz" }, { id: "feijao" }]));
    localStorage.setItem("orcamentoCompra", "300");

    const capturado = listasSyncInterno.capturarEstadoLocal();

    assert.deepEqual(
        capturado.listas[0].produtos.map(produto => produto.id),
        ["arroz", "feijao"]
    );
    assert.equal(capturado.orcamentoCompra, "300");
});

test("não limpa os dados quando o identificador da mesma conta muda de e-mail para id", () => {
    localStorage.clear();
    localStorage.setItem("usuarioAtual", JSON.stringify({
        id: "usuario-123",
        email: "cliente@exemplo.com"
    }));
    localStorage.setItem("smartListUsuarioListasAtivo", "cliente@exemplo.com");
    localStorage.setItem("listaAtualId", "lista-original");
    localStorage.setItem("listasSalvas", JSON.stringify([
        lista("lista-original", "2026-09-08T10:00:00.000Z", [{ id: "leite" }])
    ]));
    localStorage.setItem("produtos", JSON.stringify([{ id: "leite" }]));

    listasSyncInterno.prepararArmazenamentoDoUsuario();
    const capturado = listasSyncInterno.capturarEstadoLocal();

    assert.equal(localStorage.getItem("smartListUsuarioListasAtivo"), "usuario-123");
    assert.equal(capturado.listas[0].produtos[0].id, "leite");
});
