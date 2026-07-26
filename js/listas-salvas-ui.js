import {
    criarListaSalva,
    excluirListaSalva,
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
        estilo.href = "./css/listas-salvas.css?v=2";
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
            <div class="listas-salvas-botoes">
                <button type="button" class="btn btn-primary" id="criarNovaLista">+ Nova lista</button>
                <button type="button" class="btn btn-excluir-lista" id="excluirListaAtual" aria-label="Excluir lista selecionada">Excluir</button>
            </div>
        </div>
        <div class="listas-salvas-nova" role="dialog" aria-modal="true" aria-labelledby="tituloNovaLista" hidden>
            <strong id="tituloNovaLista">Criar nova lista</strong>
            <label for="nomeNovaLista">Nome da nova lista</label>
            <div><input id="nomeNovaLista" type="text" maxlength="80" placeholder="Ex.: Compra do mês"><button type="button" class="btn btn-primary" id="salvarNovaLista">Criar</button><button type="button" class="btn btn-secondary" id="cancelarNovaLista">Cancelar</button></div>
        </div>`;

    referencia.before(gerenciador);

    gerenciador.querySelector("select").addEventListener("change", evento => {
        if (selecionarListaSalva(evento.currentTarget.value)) window.location.reload();
    });

    gerenciador.querySelector("#excluirListaAtual").addEventListener("click", () => {
        const seletor = gerenciador.querySelector("#selecionarListaSalva");
        const nome = seletor.selectedOptions[0]?.textContent?.split(" · ")[0] || "esta lista";

        if (!window.confirm(`Excluir ${nome}? Esta ação não pode ser desfeita.`)) return;

        if (excluirListaSalva(seletor.value)) window.location.reload();
    });

    gerenciador.querySelector("#criarNovaLista").addEventListener("click", () => {
        const formulario = gerenciador.querySelector(".listas-salvas-nova");
        gerenciador.classList.add("criando-lista");
        document.body.classList.add("criando-lista-aberta");
        formulario.hidden = false;
        const campo = formulario.querySelector("input");
        campo.value = `Lista ${listas.length + 1}`;
        requestAnimationFrame(() => {
            campo.focus();
            campo.select();
        });
    });

    const fecharFormulario = () => {
        gerenciador.querySelector(".listas-salvas-nova").hidden = true;
        gerenciador.classList.remove("criando-lista");
        document.body.classList.remove("criando-lista-aberta");
        gerenciador.querySelector("#criarNovaLista").focus();
    };

    gerenciador.querySelector("#cancelarNovaLista").addEventListener("click", fecharFormulario);

    gerenciador.querySelector("#salvarNovaLista").addEventListener("click", () => {
        const campo = gerenciador.querySelector("#nomeNovaLista");
        const nome = campo.value.trim();
        if (!nome) {
            campo.setCustomValidity("Digite um nome para a nova lista.");
            campo.reportValidity();
            return;
        }
        campo.setCustomValidity("");
        criarListaSalva(nome, { ativar: true });
        window.location.reload();
    });

    gerenciador.querySelector("#nomeNovaLista").addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            gerenciador.querySelector("#salvarNovaLista").click();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && gerenciador.classList.contains("criando-lista")) {
            fecharFormulario();
        }
    });
}

function escapar(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}
