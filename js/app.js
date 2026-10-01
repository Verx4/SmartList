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
    limparMercadoAtual,
    configurarMercadoAtual,
    atualizarMercadoNoModal

} from "./mercado-atual.js";

import {
    MEDIDA_KG,
    limparMarcadorMedida,
    medidaPadraoParaNovoProduto,
    obterRegraMedida
} from "./medidas-produtos.js";
import { resolverCategoriaSelecionada } from "./categorias.js";
import {
    enfileirarColetaPreco,
    sincronizarColetasPendentes
} from "./coleta-precos.js";
import { iniciarSincronizacaoListas } from "./listas-sync.js";
import { adicionarCompraNaDespensa } from "./despensa-store.js";

import {
    animarAberturaModal,
    animarEntradaNotificacao,
    animarFechamentoModal,
    animarSaidaNotificacao,
    animarSaidaProduto,
    destacarProduto
} from "./animations.js";


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


function numeroDigitado(valor) {

    const texto = String(valor || "")
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".");
    const numero = Number(texto);

    return Number.isFinite(numero)
        ? numero
        : 0;

}


function atualizarCampoMedidaNovoProduto() {

    const campoNome = elemento("novoNome");
    const campoCategoria = elemento("novaCategoria");
    const campoMedida = elemento("novaMedida");
    const campoQuantidade = elemento("novaQuantidade");
    const rotuloQuantidade = elemento("rotuloNovaQuantidade");
    const dica = elemento("dicaNovaMedida");

    if (!campoMedida || !campoQuantidade) {
        return;
    }

    const regra = obterRegraMedida(campoNome?.value);
    const medida = medidaPadraoParaNovoProduto(
        campoNome?.value,
        campoCategoria?.value,
        campoMedida.value
    );

    campoMedida.value = regra.medida || medida;
    campoMedida.disabled = regra.tipo === "fixa";
    campoMedida.setAttribute(
        "aria-describedby",
        "dicaNovaMedida"
    );

    if (dica) {
        dica.textContent = regra.motivo;
    }

    const porPeso = campoMedida.value === MEDIDA_KG;

    if (rotuloQuantidade) {
        rotuloQuantidade.textContent = porPeso
            ? "Peso (kg)"
            : "Quantidade";
    }

    campoQuantidade.type = porPeso
        ? "text"
        : "number";
    campoQuantidade.inputMode = porPeso
        ? "decimal"
        : "numeric";
    campoQuantidade.step = porPeso
        ? "0.001"
        : "1";
    campoQuantidade.placeholder = porPeso
        ? "Ex.: 1,5"
        : "Ex.: 1";

}


function focarSeletorMercado() {

    const painel = elemento("painelMercados");

    if (painel) {

        painel.open = true;

    }

    elemento(
        "barraSelecionarMercado",
        "mercadoAtual"
    )?.focus();

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

    animarEntradaNotificacao(aviso);

    window.setTimeout(() => {

        animarSaidaNotificacao(aviso)
            .finally(() => aviso.remove());

    }, 4500);

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
                destacarProduto(id);

            },

            aoAbrirNovoPreco(id, alteracoes) {

                atualizarProduto(id, alteracoes);
                adicionarPrecoCadastrado(id);
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

            async aoExcluir(id, elementoProduto) {

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

                await animarSaidaProduto(elementoProduto);
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

    if (!obterMercadoAtual()) {

        notificar(
            "Selecione um mercado antes de adicionar um item.",
            "erro"
        );
        focarSeletorMercado();
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

    const quantidade = elemento("novaQuantidade");

    if (quantidade) {
        quantidade.value = "";
    }

    atualizarMercadoNoModal();
    atualizarCampoMedidaNovoProduto();
    animarAberturaModal(modal);

    window.setTimeout(() => {

        elemento("novoNome")?.focus();

    }, 50);

}


async function fecharModal() {

    const modal = elemento("modal", "modalProduto");

    if (!modal) {

        return;

    }

    if (modal.hidden || modal.dataset.fechando === "true") {
        return;
    }

    modal.dataset.fechando = "true";
    modal.setAttribute("aria-hidden", "true");
    await animarFechamentoModal(modal);

    modal.classList.remove("aberto");
    modal.style.removeProperty("display");
    modal.hidden = true;
    modal.dataset.fechando = "false";
    document.body.classList.remove("modal-aberto");

}


function limparFormularioProduto() {

    const formulario =
        elemento("formProduto");

    formulario?.reset();

    const quantidade =
        elemento("novaQuantidade");

    if (quantidade) {

        quantidade.value = "";

    }

    const categoria =
        elemento("novaCategoria");

    if (categoria) {

        categoria.value = "automatico";

    }

    const medida = elemento("novaMedida");

    if (medida) {

        medida.disabled = false;
        medida.value = "unidade";

    }

    atualizarCampoMedidaNovoProduto();

}


function salvarNovoProduto(evento) {

    evento?.preventDefault();

    const nomeDigitado =
        elemento("novoNome")?.value.trim();

    const nome = limparMarcadorMedida(nomeDigitado);

    let categoria =
        elemento("novaCategoria")?.value ||
        "automatico";

    const regraMedida = obterRegraMedida(nomeDigitado);
    const medidaSelecionada =
        elemento("novaMedida")?.value || MEDIDA_UNIDADE;
    const medidaParaCategoria =
        regraMedida.medida || medidaSelecionada;

    categoria = resolverCategoriaSelecionada(
        nome,
        categoria,
        medidaParaCategoria
    );

    const preco =
        Number(elemento("novoPreco")?.value || 0);

    const campoQuantidade = elemento("novaQuantidade");
    const valorQuantidade = campoQuantidade?.value.trim() || "";
    const quantidadeInformada = Math.max(
        0,
        numeroDigitado(valorQuantidade)
    );

    const medida = regraMedida.medida || medidaPadraoParaNovoProduto(
        nomeDigitado,
        categoria,
        medidaSelecionada
    );
    const quantidade = medida === MEDIDA_KG
        ? 0
        : Math.floor(quantidadeInformada);
    const peso = medida === MEDIDA_KG
        ? quantidadeInformada
        : 0;

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

    if (!valorQuantidade || quantidadeInformada <= 0) {

        notificar(
            medida === MEDIDA_KG
                ? "Informe um peso maior que zero."
                : "Informe uma quantidade maior que zero.",
            "erro"
        );

        campoQuantidade?.focus();

        return;

    }

    adicionarProduto({

        nome,
        categoria,
        precos: [{
            valor: Math.max(0, preco),
            quantidade
        }],
        medida,
        peso,
        supermercado,
        favorito

    });

    limparFormularioProduto();
    fecharModal();

    notificar(
        supermercado
            ? `${nome} foi adicionado à lista de ${supermercado}.`
            : `${nome} foi adicionado à lista sem mercado.`
    );

    atualizarTela();

}


function concluirCompra() {

    const mercadoAtual = obterMercadoAtual();

    if (!mercadoAtual) {

        notificar(
            "Selecione um mercado antes de finalizar a compra.",
            "erro"
        );
        focarSeletorMercado();
        return;

    }

    try {

        produtos = aplicarSupermercadoAProdutos(
            mercadoAtual
        );

        const resultado =
            registrarCompra(produtos);

        adicionarCompraNaDespensa(resultado.compra);

        enfileirarColetaPreco(resultado.compra);
        void sincronizarColetasPendentes();

        const produtosParaProximaCompra =
            resultado.produtosAtualizados.map(produto => ({
                ...produto,
                supermercado: ""
            }));

        limparMercadoAtual();

        salvarProdutos(
            produtosParaProximaCompra
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
                : "Compra finalizada. Os itens foram adicionados à sua despensa."
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

    elemento("novoNome")
        ?.addEventListener(
            "input",
            atualizarCampoMedidaNovoProduto
        );


    elemento("novaCategoria")
        ?.addEventListener(
            "change",
            atualizarCampoMedidaNovoProduto
        );


    elemento("novaMedida")
        ?.addEventListener(
            "change",
            atualizarCampoMedidaNovoProduto
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
                    false,
                    true
                );

                notificar(
                    nome
                        ? `O mercado ${nome} foi aplicado aos produtos existentes.`
                        : "Os produtos existentes ficaram sem mercado."
                );

            } else {

                salvarProdutos(listarProdutos());

                notificar(
                    nome
                        ? `Mercado atual alterado para ${nome}.`
                        : "A compra atual foi mantida sem mercado."
                );

            }

            atualizarTela();

        }
    );

}


async function iniciarAplicacao() {

    await iniciarSincronizacaoListas();

    produtos = listarProdutos();
    historico = carregarHistorico();

    // Recupera também compras antigas que ficaram apenas no histórico local.
    // O backend deduplica compra e item, então reenviar é seguro.
    for (const compra of historico) {
        enfileirarColetaPreco(compra);
    }

    preencherUsuarioDashboard();
    configurarEventos();

    window.addEventListener("listarapida:concluida", evento => {
        const adicionados = Number(evento.detail?.adicionados || 0);
        atualizarTela();

        notificar(
            adicionados > 0
                ? `${adicionados} ${adicionados === 1 ? "produto adicionado" : "produtos adicionados"} à lista.`
                : "Os produtos informados já estavam na lista."
        );
    });

    atualizarTela();
    void sincronizarColetasPendentes();

    window.addEventListener("online", () => {
        void sincronizarColetasPendentes();
    });

    window.setInterval(() => {
        void sincronizarColetasPendentes();
    }, 30 * 1000);

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
    () => void iniciarAplicacao()
);
