import {

    listarProdutos,
    salvarProdutos,
    adicionarProduto,
    atualizarProduto,
    removerProduto,
    alterarQuantidade,
    atualizarPreco,
    adicionarPrecoCadastrado,
    atualizarPrecoCadastrado,
    alterarQuantidadePreco,
    removerPrecoCadastrado,
    atualizarPeso,
    alternarFavorito,
    aplicarSupermercadoAProdutos,
    filtrarProdutos,
    ordenarProdutos,
    zerarPrecosDaLista

} from "./produtos.js";


import {

    renderizarProdutos,
    renderizarTotais,
    renderizarHistorico

} from "./render.js";


import {

    finalizarCompra as registrarCompra,
    carregarHistorico,
    limparHistorico,
    obterEconomiaAcumulada

} from "./checkout.js";


import {

    configurarOrcamento,
    renderizarOrcamento

} from "./orcamento.js";


import {

    obterMercadoAtual,
    configurarMercadoAtual,
    atualizarMercadoNoModal

} from "./mercado-atual.js";


let produtos = [];
let historico = [];


function elemento(...ids) {

    for (const id of ids) {

        const encontrado =
            document.getElementById(id);

        if (encontrado) {

            return encontrado;

        }

    }

    return null;

}


function lerUsuarioAtual() {

    for (const chave of ["usuarioAtual", "usuarioLogado"]) {

        try {

            const usuario = JSON.parse(localStorage.getItem(chave));

            if (usuario) {

                return usuario;

            }

        } catch {

            // Continua procurando outra chave.

        }

    }

    return null;

}


function preencherUsuarioDashboard() {

    const campo = elemento("nomeUsuarioDashboard");

    if (!campo) {

        return;

    }

    const usuario = lerUsuarioAtual();

    campo.textContent = usuario?.nome || usuario?.name || "Usuário";

}


function notificar(mensagem, tipo = "sucesso") {

    let container =
        elemento("mensagens", "mensagemGlobal");

    if (!container) {

        container = document.createElement("div");

        container.id = "mensagens";
        container.className = "mensagens-globais";

        document.body.prepend(container);

    }

    const aviso = document.createElement("div");

    aviso.className =
        `mensagem mensagem-${tipo}`;

    aviso.setAttribute("role", "status");
    aviso.textContent = mensagem;

    container.appendChild(aviso);

    window.setTimeout(() => {

        aviso.remove();

    }, 4500);

}


function inferirCategoria(nome) {

    const texto =
        String(nome || "").toLowerCase();

    const regras = [

        {
            categoria: "🥛 Laticínios",
            palavras: [
                "leite",
                "queijo",
                "iogurte",
                "manteiga",
                "requeijão"
            ]
        },

        {
            categoria: "🥩 Carnes",
            palavras: [
                "carne",
                "frango",
                "peixe",
                "linguiça",
                "bife"
            ]
        },

        {
            categoria: "🍎 Hortifruti",
            palavras: [
                "banana",
                "maçã",
                "tomate",
                "batata",
                "cebola",
                "alface",
                "cenoura",
                "fruta",
                "verdura"
            ]
        },

        {
            categoria: "🍞 Padaria",
            palavras: [
                "pão",
                "bolo",
                "torrada"
            ]
        },

        {
            categoria: "🥤 Bebidas",
            palavras: [
                "água",
                "suco",
                "refrigerante",
                "cerveja",
                "bebida"
            ]
        },

        {
            categoria: "🧼 Limpeza",
            palavras: [
                "sabão",
                "detergente",
                "desinfetante",
                "limpeza"
            ]
        },

        {
            categoria: "🪥 Higiene",
            palavras: [
                "shampoo",
                "sabonete",
                "pasta de dente",
                "papel higiênico"
            ]
        }

    ];

    const regra = regras.find(item =>
        item.palavras.some(palavra =>
            texto.includes(palavra)
        )
    );

    return regra?.categoria || "📦 Outros";

}


function obterOrdenacao() {

    return (
        elemento("ordenarProdutos")?.value ||
        "nome"
    );

}


function obterPesquisa() {

    return (
        elemento("buscarProduto")?.value ||
        ""
    );

}


function obterFiltroCategoria() {

    return (
        elemento("filtroCategoria")?.value ||
        ""
    );

}


function produtosVisiveis() {

    let lista = filtrarProdutos(
        produtos,
        obterPesquisa()
    );

    const categoria = obterFiltroCategoria();

    if (categoria) {

        lista = lista.filter(
            produto => produto.categoria === categoria
        );

    }

    return ordenarProdutos(lista, obterOrdenacao());

}


function atualizarInformacoesAuxiliares(lista) {

    const contador = elemento("contadorProdutos");

    if (contador) {

        contador.textContent = lista.length === 1
            ? "1 produto"
            : `${lista.length} produtos`;

    }

    const economia = elemento("economiaAcumulada");

    if (economia) {

        economia.textContent = obterEconomiaAcumulada().toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

    }

    preencherUsuarioDashboard();

}


function atualizarTela() {

    produtos = listarProdutos();
    historico = carregarHistorico();

    const visiveis = produtosVisiveis();

    renderizarProdutos(
        visiveis,
        {

            aoAlterarQuantidade(id, variacao) {

                alterarQuantidade(id, variacao);
                atualizarTela();

            },

            aoAlterarPreco(id, preco) {

                atualizarPreco(id, preco);
                atualizarTela();

            },

            aoAdicionarPreco(id) {

                adicionarPrecoCadastrado(id);
                atualizarTela();

            },

            aoAlterarValorPreco(id, precoId, valor) {

                atualizarPrecoCadastrado(id, precoId, { valor });
                produtos = listarProdutos();
                renderizarTotais(produtos, historico);
                renderizarOrcamento(produtos);

            },

            aoAlterarQuantidadePreco(id, precoId, variacao) {

                alterarQuantidadePreco(id, precoId, variacao);
                atualizarTela();

            },

            aoExcluirPreco(id, precoId) {

                removerPrecoCadastrado(id, precoId);
                atualizarTela();

            },

            aoSalvarEdicao(id, alteracoes) {

                atualizarProduto(id, alteracoes);
                notificar("Produto atualizado.");
                atualizarTela();

            },

            aoAlterarPeso(id, peso) {

                atualizarPeso(id, peso);
                atualizarTela();

            },

            aoAlterarCategoria(id, categoria) {

                atualizarProduto(id, {
                    categoria
                });

                atualizarTela();

            },

            aoFavoritar(id) {

                alternarFavorito(id);
                atualizarTela();

            },

            aoExcluir(id) {

                const produto =
                    produtos.find(
                        item =>
                            String(item.id) === String(id)
                    );

                const confirmar = window.confirm(
                    `Deseja excluir ${produto?.nome || "este produto"}?`
                );

                if (!confirmar) {

                    return;

                }

                removerProduto(id);

                notificar(
                    "Produto removido da lista."
                );

                atualizarTela();

            }

        }
    );

    renderizarTotais(produtos, historico);
    renderizarHistorico(historico);
    renderizarOrcamento(produtos);
    atualizarMercadoNoModal();
    atualizarInformacoesAuxiliares(visiveis);

}


function abrirModal() {

    const mercado = obterMercadoAtual();

    if (!mercado) {

        notificar(
            "Escolha e salve o mercado atual antes de adicionar produtos.",
            "erro"
        );

        elemento("mercadoAtual")?.focus();

        return;

    }

    const modal = elemento("modal", "modalProduto");

    if (!modal) {

        return;

    }

    modal.hidden = false;
    modal.classList.add("aberto");
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-aberto");

    atualizarMercadoNoModal();

    window.setTimeout(() => {

        elemento("novoNome")?.focus();

    }, 50);

}


function fecharModal() {

    const modal = elemento("modal", "modalProduto");

    if (!modal) {

        return;

    }

    modal.classList.remove("aberto");
    modal.style.removeProperty("display");
    modal.setAttribute("aria-hidden", "true");
    modal.hidden = true;
    document.body.classList.remove("modal-aberto");

}


function limparFormularioProduto() {

    const formulario =
        elemento("formProduto");

    formulario?.reset();

    const quantidade =
        elemento("novaQuantidade");

    if (quantidade) {

        quantidade.value = "0";

    }

    const categoria =
        elemento("novaCategoria");

    if (categoria) {

        categoria.value = "automatico";

    }

}


function salvarNovoProduto(evento) {

    evento?.preventDefault();

    const nome =
        elemento("novoNome")?.value.trim();

    let categoria =
        elemento("novaCategoria")?.value ||
        "automatico";

    const preco =
        Number(elemento("novoPreco")?.value || 0);

    const quantidade = Math.max(
        0,
        Number(elemento("novaQuantidade")?.value || 0)
    );

    const favorito =
        Boolean(elemento("novoFavorito")?.checked);

    const supermercado =
        obterMercadoAtual();


    if (!nome) {

        notificar(
            "Digite o nome do produto.",
            "erro"
        );

        elemento("novoNome")?.focus();

        return;

    }

    if (!supermercado) {

        fecharModal();

        notificar(
            "Escolha o mercado atual antes de adicionar o produto.",
            "erro"
        );

        elemento("mercadoAtual")?.focus();

        return;

    }

    if (
        categoria === "automatico" ||
        categoria === "Automático"
    ) {

        categoria = inferirCategoria(nome);

    }

    adicionarProduto({

        nome,
        categoria,
        precos: [{
            valor: Math.max(0, preco),
            quantidade
        }],
        peso: 0,
        supermercado,
        favorito

    });

    limparFormularioProduto();
    fecharModal();

    notificar(
        `${nome} foi adicionado à lista de ${supermercado}.`
    );

    atualizarTela();

}


function concluirCompra() {

    try {

        const resultado =
            registrarCompra(produtos);

        salvarProdutos(
            resultado.produtosAtualizados
        );

        historico = resultado.historico;

        const economia =
            resultado.compra.economia;

        notificar(
            economia > 0
                ? `Compra finalizada. Você economizou ${economia.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                })}.`
                : "Compra finalizada e adicionada ao histórico."
        );

        const historicoContainer =
            elemento("historicoCompras");

        if (historicoContainer) {

            historicoContainer.hidden = false;

        }

        elemento("btnToggleHistorico")?.setAttribute(
            "aria-expanded",
            "true"
        );

        atualizarTela();

    } catch (erro) {

        notificar(
            erro.message ||
            "Não foi possível finalizar a compra.",
            "erro"
        );

    }

}


function alternarHistorico() {

    const container =
        elemento("historicoCompras");

    if (!container) {

        return;

    }

    const abrir = container.hidden;

    container.hidden = !abrir;

    elemento("btnToggleHistorico")?.setAttribute(
        "aria-expanded",
        String(abrir)
    );

}


function configurarEventos() {

    elemento(
        "btnAdicionarProduto",
        "abrirModalProduto"
    )?.addEventListener("click", abrirModal);


    elemento(
        "btnCancelarProduto",
        "btnCancelarModal"
    )?.addEventListener("click", fecharModal);


    elemento("btnFecharModal")
        ?.addEventListener("click", fecharModal);


    elemento("formProduto")
        ?.addEventListener(
            "submit",
            salvarNovoProduto
        );


    elemento("btnSalvarProduto")
        ?.addEventListener(
            "click",
            salvarNovoProduto
        );


    elemento("buscarProduto")
        ?.addEventListener(
            "input",
            atualizarTela
        );


    elemento("filtroCategoria")
        ?.addEventListener(
            "change",
            atualizarTela
        );


    elemento("ordenarProdutos")
        ?.addEventListener(
            "change",
            atualizarTela
        );


    elemento("btnFinalizarCompra")
        ?.addEventListener(
            "click",
            concluirCompra
        );


    elemento("btnToggleHistorico")
        ?.addEventListener(
            "click",
            alternarHistorico
        );


    const modal =
        elemento("modal", "modalProduto");

    modal?.addEventListener("click", evento => {

        if (evento.target === modal) {

            fecharModal();

        }

    });


    document.addEventListener("keydown", evento => {

        if (evento.key === "Escape") {

            fecharModal();

        }

    });


    elemento("historicoCompras")
        ?.addEventListener("click", evento => {

            const botao =
                evento.target.closest(
                    "[data-acao-historico]"
                );

            if (!botao) {

                return;

            }

            const acao =
                botao.dataset.acaoHistorico;

            if (acao === "limpar") {

                const confirmar = window.confirm(
                    "Deseja apagar todo o histórico de compras?"
                );

                if (confirmar) {

                    limparHistorico();

                    notificar(
                        "Histórico apagado."
                    );

                    atualizarTela();

                }

            }

            if (acao === "zerar") {

                zerarPrecosDaLista();

                notificar(
                    "Os preços atuais foram zerados."
                );

                atualizarTela();

            }

        });


    configurarOrcamento(
        () => produtos,
        atualizarTela
    );


    configurarMercadoAtual(
        ({ nome, aplicarExistentes }) => {

            if (aplicarExistentes) {

                aplicarSupermercadoAProdutos(
                    nome,
                    false
                );

                notificar(
                    `O mercado ${nome} foi aplicado aos produtos existentes.`
                );

            } else {

                notificar(
                    `Mercado atual alterado para ${nome}.`
                );

            }

            atualizarTela();

        }
    );

}


function iniciarAplicacao() {

    produtos = listarProdutos();
    historico = carregarHistorico();

    preencherUsuarioDashboard();
    configurarEventos();
    atualizarTela();

}


/*
 * Compatibilidade com botões antigos que ainda
 * utilizam onclick diretamente no HTML.
 */

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.salvarProduto = salvarNovoProduto;
window.filtrarProdutos = atualizarTela;
window.finalizarCompra = concluirCompra;
window.toggleHistorico = alternarHistorico;


document.addEventListener(
    "DOMContentLoaded",
    iniciarAplicacao
);
