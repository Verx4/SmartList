import {
    criarListaSalva,
    excluirListaSalva,
    listarListasSalvas,
    selecionarListaSalva
} from "./produtos.js";
import {
    adicionarMercadoFrequente,
    listarMercadosFrequentes,
    obterMercadoAtual
} from "./mercado-atual.js";

if (window.__smartListSincronizacaoInicialConcluida) {
    ativarGerenciadorDeListas();
} else {
    window.addEventListener(
        "listassincronizadas",
        ativarGerenciadorDeListas,
        { once: true }
    );
}

function ativarGerenciadorDeListas() {
    if (document.getElementById("gerenciadorListasSalvas")) return;

    const referencia = document.querySelector("main .acoes");
    if (!referencia) return;

    if (!document.querySelector('link[data-listas-salvas="true"]')) {
        const estilo = document.createElement("link");
        estilo.rel = "stylesheet";
        estilo.href = "./css/listas-salvas.css?v=3";
        estilo.dataset.listasSalvas = "true";
        document.head.appendChild(estilo);
    }

    const listas = listarListasSalvas();
    const mercados = listarMercadosFrequentes();
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
            <small class="lista-atual-metadados" id="listaAtualMetadados"></small>
            <div class="listas-salvas-botoes">
                <button type="button" class="btn btn-primary" id="criarNovaLista">+ Nova lista</button>
                <button type="button" class="btn btn-excluir-lista" id="excluirListaAtual" aria-label="Excluir lista selecionada">Excluir lista</button>
            </div>
        </div>
        <div class="listas-salvas-nova" role="dialog" aria-modal="true" aria-labelledby="tituloNovaLista" hidden>
            <strong id="tituloNovaLista">Criar nova lista</strong>

            <label for="nomeNovaLista">Nome da nova lista</label>
            <div class="listas-salvas-campo">
                <input id="nomeNovaLista" type="text" maxlength="80" placeholder="Ex.: Compra do mês" required>
            </div>

            <label for="mercadoNovaLista">Nome do mercado</label>
            <div class="listas-salvas-campo">
                <input id="mercadoNovaLista" type="text" maxlength="80" list="mercadosNovaLista"
                    placeholder="Ex.: Assaí, Atacadão..." autocomplete="organization" required>
                <datalist id="mercadosNovaLista">
                    ${mercados.map(mercado => `<option value="${escapar(mercado)}"></option>`).join("")}
                </datalist>
            </div>

            <div class="listas-salvas-acoes">
                <button type="button" class="btn btn-primary" id="salvarNovaLista">Criar</button>
                <button type="button" class="btn btn-secondary" id="cancelarNovaLista">Cancelar</button>
            </div>
        </div>`;

    referencia.before(gerenciador);

    atualizarMetadadosDaLista(gerenciador, listas);

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
        const campoNome = formulario.querySelector("#nomeNovaLista");
        const campoMercado = formulario.querySelector("#mercadoNovaLista");
        campoNome.value = `Lista ${listas.length + 1}`;
        campoMercado.value = obterMercadoAtual();
        requestAnimationFrame(() => {
            campoNome.focus();
            campoNome.select();
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
        const campoNome = gerenciador.querySelector("#nomeNovaLista");
        const campoMercado = gerenciador.querySelector("#mercadoNovaLista");
        const nome = campoNome.value.trim();
        const mercado = campoMercado.value.trim();

        if (!nome) {
            campoNome.setCustomValidity("Digite um nome para a nova lista.");
            campoNome.reportValidity();
            return;
        }

        campoNome.setCustomValidity("");

        if (!mercado) {
            campoMercado.setCustomValidity("Digite ou selecione o nome do mercado.");
            campoMercado.reportValidity();
            return;
        }

        campoMercado.setCustomValidity("");
        adicionarMercadoFrequente(mercado);
        criarListaSalva(nome, { ativar: true, mercado });
        window.location.reload();
    });

    gerenciador.querySelectorAll("#nomeNovaLista, #mercadoNovaLista").forEach(campo => {
        campo.addEventListener("input", () => campo.setCustomValidity(""));
        campo.addEventListener("keydown", evento => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                gerenciador.querySelector("#salvarNovaLista").click();
            }
        });
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && gerenciador.classList.contains("criando-lista")) {
            fecharFormulario();
        }
    });
}

function atualizarMetadadosDaLista(gerenciador, listas) {
    const atual = listas.find(lista => lista.atual) || listas[0];
    const campo = gerenciador.querySelector("#listaAtualMetadados");

    if (!atual || !campo) return;

    const data = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(atual.criadoEm));

    campo.textContent = `Criada por ${atual.criadorNome || "Usuário"} em ${data}`;
}

function escapar(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}
