const CHAVE_MERCADO_ATUAL = "mercadoAtual";
const CHAVE_MERCADOS = "mercadosFrequentes";
const CHAVE_MERCADOS_ANTIGOS = "mercadosRecentes";
const CHAVE_ULTIMA_ALTERACAO_LISTAS = "listasUltimaAlteracao";

const MERCADOS_INICIAIS = [
    "Assaí",
    "Atacadão",
    "Novo Atacarejo"
];


function sinalizarAlteracaoDaLista() {

    const atualizadoEm = new Date().toISOString();
    localStorage.setItem(CHAVE_ULTIMA_ALTERACAO_LISTAS, atualizadoEm);
    window.dispatchEvent(new CustomEvent("dadoslistaalterados", {
        detail: { atualizadoEm }
    }));

}


function limparTexto(valor) {

    return String(valor || "")
        .trim()
        .replace(/\s+/g, " ");

}


function lerLista(chave) {

    try {

        const dados = JSON.parse(localStorage.getItem(chave));

        return Array.isArray(dados) ? dados : [];

    } catch {

        return [];

    }

}


function removerDuplicados(lista) {

    const resultado = [];

    lista.forEach(item => {

        const nome = limparTexto(item);

        if (!nome) {

            return;

        }

        const existe = resultado.some(
            mercado => mercado.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR")
        );

        if (!existe) {

            resultado.push(nome);

        }

    });

    return resultado;

}


function salvarLista(lista) {

    const mercados = removerDuplicados(lista);

    localStorage.setItem(CHAVE_MERCADOS, JSON.stringify(mercados));
    sinalizarAlteracaoDaLista();

    return mercados;

}


export function obterMercadoAtual() {

    return limparTexto(localStorage.getItem(CHAVE_MERCADO_ATUAL));

}


export function listarMercadosFrequentes() {

    const jaFoiCriada = localStorage.getItem(CHAVE_MERCADOS) !== null;

    const lista = removerDuplicados([
        ...lerLista(CHAVE_MERCADOS),
        ...lerLista(CHAVE_MERCADOS_ANTIGOS),
        ...(jaFoiCriada ? [] : MERCADOS_INICIAIS)
    ]);

    if (!jaFoiCriada) {

        salvarLista(lista);

    }

    return lista;

}


export function adicionarMercadoFrequente(nome) {

    const mercado = limparTexto(nome);

    if (!mercado) {

        return "";

    }

    salvarLista([
        ...listarMercadosFrequentes(),
        mercado
    ]);

    renderizarMercados();

    return mercado;

}


export function removerMercadoFrequente(nome) {

    const mercado = limparTexto(nome);

    const lista = listarMercadosFrequentes().filter(
        item => item.toLocaleLowerCase("pt-BR") !== mercado.toLocaleLowerCase("pt-BR")
    );

    salvarLista(lista);

    if (
        obterMercadoAtual().toLocaleLowerCase("pt-BR") ===
        mercado.toLocaleLowerCase("pt-BR")
    ) {

        localStorage.removeItem(CHAVE_MERCADO_ATUAL);

    }

    renderizarMercados();
    atualizarMercadoNoModal();

    return lista;

}


export function salvarMercadoAtual(nome) {

    const mercado = adicionarMercadoFrequente(nome);

    if (!mercado) {

        return "";

    }

    localStorage.setItem(CHAVE_MERCADO_ATUAL, mercado);
    sinalizarAlteracaoDaLista();

    renderizarMercados();
    atualizarMercadoNoModal();

    return mercado;

}


export function limparMercadoAtual() {

    localStorage.removeItem(CHAVE_MERCADO_ATUAL);
    sinalizarAlteracaoDaLista();
    renderizarMercados();
    atualizarMercadoNoModal();

}


function renderizarSelect() {

    const campo = document.getElementById("mercadoAtual");

    if (!campo) {

        return;

    }

    const atual = obterMercadoAtual();

    campo.replaceChildren();

    const opcaoInicial = document.createElement("option");
    opcaoInicial.value = "";
    opcaoInicial.textContent = "Manter vazio";
    opcaoInicial.selected = !atual;
    campo.appendChild(opcaoInicial);

    listarMercadosFrequentes().forEach(mercado => {

        const opcao = document.createElement("option");
        opcao.value = mercado;
        opcao.textContent = mercado;
        opcao.selected = mercado === atual;
        campo.appendChild(opcao);

    });

}


function criarMercadoVisual(nome, selecionado) {

    const item = document.createElement("div");
    item.className = selecionado
        ? "mercado-frequente-item ativo"
        : "mercado-frequente-item";

    const selecionar = document.createElement("button");
    selecionar.type = "button";
    selecionar.className = "btn-selecionar-mercado";
    selecionar.dataset.acao = "selecionar";
    selecionar.dataset.mercado = nome;
    selecionar.textContent = selecionado ? `✓ ${nome}` : nome;

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "btn-remover-mercado";
    remover.dataset.acao = "remover";
    remover.dataset.mercado = nome;
    remover.textContent = "×";
    remover.setAttribute("aria-label", `Remover ${nome}`);

    item.append(selecionar, remover);

    return item;

}


function criarOpcaoMercadoVazio(selecionado) {

    const item = document.createElement("div");
    item.className = selecionado
        ? "mercado-frequente-item ativo"
        : "mercado-frequente-item";

    const selecionar = document.createElement("button");
    selecionar.type = "button";
    selecionar.className = "btn-selecionar-mercado";
    selecionar.dataset.acao = "manter-vazio";
    selecionar.textContent = selecionado
        ? "✓ Manter vazio"
        : "Manter vazio";

    item.appendChild(selecionar);

    return item;

}


function renderizarLista() {

    const container = document.getElementById("listaMercadosFrequentes");

    if (!container) {

        return;

    }

    const mercados = listarMercadosFrequentes();
    const atual = obterMercadoAtual();

    container.replaceChildren();

    container.appendChild(
        criarOpcaoMercadoVazio(!atual)
    );

    if (!mercados.length) {

        return;

    }

    mercados.forEach(mercado => {

        container.appendChild(
            criarMercadoVisual(mercado, mercado === atual)
        );

    });

}


function renderizarBarraCompacta() {

    const resumo = document.getElementById("mercadoAtualResumo");
    const barra = document.getElementById("barraSelecionarMercado");
    const atual = obterMercadoAtual();
    const texto = atual || "Manter vazio";

    if (resumo) {

        resumo.textContent = texto;

    }

    if (barra) {

        barra.setAttribute(
            "aria-label",
            atual
                ? `Mercado atual: ${atual}. Toque para alterar.`
                : "Compra sem mercado. Toque para alterar."
        );

    }

}


function fecharPainelCompacto() {

    const painel = document.getElementById("painelMercados");

    if (painel) {

        painel.open = false;

    }

}


export function renderizarMercados() {

    renderizarSelect();
    renderizarLista();
    renderizarBarraCompacta();

}


export function atualizarMercadoNoModal() {

    const campo = document.getElementById("mercadoModalAtual");

    if (campo) {

        campo.textContent = obterMercadoAtual() || "Sem mercado";

    }

}


function mostrarMensagem(texto, tipo = "sucesso") {

    const campo = document.getElementById("mensagemMercado");

    if (!campo) {

        return;

    }

    campo.textContent = texto;
    campo.className = `mensagem-mercado mensagem-${tipo}`;

}


export function configurarMercadoAtual(aoSalvar) {

    const campoAtual = document.getElementById("mercadoAtual");
    const botaoSalvar = document.getElementById("btnSalvarMercadoAtual");
    const campoNovo = document.getElementById("novoMercadoFrequente");
    const botaoAdicionar = document.getElementById("btnAdicionarMercadoFrequente");
    const lista = document.getElementById("listaMercadosFrequentes");
    const aplicar = document.getElementById("aplicarMercadoExistentes");

    renderizarMercados();
    atualizarMercadoNoModal();

    function comunicar(nome) {

        aoSalvar?.({
            nome,
            aplicarExistentes: Boolean(aplicar?.checked)
        });

    }

    if (botaoAdicionar && !botaoAdicionar.dataset.configurado) {

        botaoAdicionar.dataset.configurado = "true";

        botaoAdicionar.addEventListener("click", () => {

            const mercado = salvarMercadoAtual(campoNovo?.value);

            if (!mercado) {

                mostrarMensagem("Digite o nome do mercado.", "erro");
                campoNovo?.focus();
                return;

            }

            campoNovo.value = "";

            mostrarMensagem(
                `${mercado} foi adicionado e selecionado para esta lista.`
            );
            comunicar(mercado);
            fecharPainelCompacto();

        });

    }

    if (campoNovo && !campoNovo.dataset.configurado) {

        campoNovo.dataset.configurado = "true";
        campoNovo.addEventListener("keydown", evento => {

            if (evento.key === "Enter") {

                evento.preventDefault();
                botaoAdicionar?.click();

            }

        });

    }

    if (botaoSalvar && !botaoSalvar.dataset.configurado) {

        botaoSalvar.dataset.configurado = "true";
        botaoSalvar.addEventListener("click", () => {

            const valor = limparTexto(campoAtual?.value);
            const mercado = valor
                ? salvarMercadoAtual(valor)
                : "";

            if (!valor) {

                limparMercadoAtual();

            }

            mostrarMensagem(
                mercado
                    ? `A compra atual está definida para ${mercado}.`
                    : "A compra atual foi mantida sem mercado."
            );
            comunicar(mercado);

        });

    }

    if (lista && !lista.dataset.configurado) {

        lista.dataset.configurado = "true";
        lista.addEventListener("click", evento => {

            const botao = evento.target.closest("[data-acao]");

            if (!botao) {

                return;

            }

            const mercado = botao.dataset.mercado;

            if (botao.dataset.acao === "manter-vazio") {

                limparMercadoAtual();
                mostrarMensagem("A compra atual foi mantida sem mercado.");
                comunicar("");
                fecharPainelCompacto();
                return;

            }

            if (botao.dataset.acao === "remover") {

                removerMercadoFrequente(mercado);
                mostrarMensagem(`${mercado} foi removido.`);
                return;

            }

            const selecionado = salvarMercadoAtual(mercado);
            mostrarMensagem(`${selecionado} foi selecionado para esta compra.`);
            comunicar(selecionado);
            fecharPainelCompacto();

        });

    }

}
