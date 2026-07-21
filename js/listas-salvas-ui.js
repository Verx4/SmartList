import {
    criarListaSalva,
    listarListasSalvas,
    selecionarListaSalva
} from "./produtos.js";

ativarGerenciadorDeListas();

function ativarGerenciadorDeListas() {
    if (document.getElementById("gerenciadorListasSalvas")) return;

    const referencia = document.querySelector("main .acoes");
    if (!referencia) return;

    if (!document.querySelector('link[data-listas-salvas="true"]')) {
        const estilo = document.createElement("link");
        estilo.rel = "stylesheet";
        estilo.href = "./css/listas-salvas.css?v=1";
        estilo.dataset.listasSalvas = "true";
        document.head.appendChild(estilo);
    }

    const listas = listarListasSalvas();
    const gerenciador = document.createElement("section");
    gerenciador.id = "gerenciadorListasSalvas";
    gerenciador.className = "listas-salvas-card";
    gerenciador.setAttribute("aria-label", "Listas de compras salvas");
    gerenciador.innerHTML = `
        <div class="listas-salvas-titulo">
            <span aria-hidden="true">🗂️</span>
            <div><strong>Minhas listas</strong><small>Troque de lista sem perder seus itens</small></div>
        </div>
        <div class="listas-salvas-controles">
            <label class="sr-only" for="selecionarListaSalva">Lista atual</label>
            <select id="selecionarListaSalva" aria-label="Selecionar lista salva">
                ${listas.map(lista => `<option value="${escapar(lista.id)}" ${lista.atual ? "selected" : ""}>${escapar(lista.nome)} · ${lista.produtos.length} item(ns)</option>`).join("")}
            </select>
            <button type="button" class="btn btn-primary" id="criarNovaLista">+ Nova lista</button>
        </div>`;

    referencia.before(gerenciador);

    gerenciador.querySelector("select").addEventListener("change", evento => {
        if (selecionarListaSalva(evento.currentTarget.value)) window.location.reload();
    });

    gerenciador.querySelector("#criarNovaLista").addEventListener("click", () => {
        const nome = window.prompt("Qual será o nome da nova lista?", `Lista ${listas.length + 1}`);
        if (nome === null) return;
        criarListaSalva(nome, { ativar: true });
        window.location.reload();
    });
}

function escapar(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}

