import {
    produtoEhPorPeso as produtoEhPorPesoCompartilhado
} from "./medidas-produtos.js";
import {
    abrirPainel,
    fecharPainel
} from "./animations.js";

const CHAVE_ORCAMENTO = "orcamentoCompra";
const CHAVE_ULTIMA_ALTERACAO_LISTAS = "listasUltimaAlteracao";


function sinalizarAlteracaoDaLista() {

    const atualizadoEm = new Date().toISOString();
    localStorage.setItem(CHAVE_ULTIMA_ALTERACAO_LISTAS, atualizadoEm);
    window.dispatchEvent(new CustomEvent("dadoslistaalterados", {
        detail: { atualizadoEm }
    }));

}


function numeroSeguro(valor) {

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;

}


function converterValorDigitado(valor) {

    if (typeof valor === "number") {

        return numeroSeguro(valor);

    }

    let texto = String(valor || "")
        .trim()
        .replace(/[R$\s]/g, "");

    if (texto.includes(",") && texto.includes(".")) {

        texto = texto
            .replace(/\./g, "")
            .replace(",", ".");

    } else {

        texto = texto.replace(",", ".");

    }

    return numeroSeguro(texto);

}


function formatarMoeda(valor) {

    return numeroSeguro(valor).toLocaleString("pt-BR", {

        style: "currency",
        currency: "BRL"

    });

}


function produtoEhPorPeso(produto) {

    return produtoEhPorPesoCompartilhado(produto);

}


function calcularSubtotal(produto) {

    if (produtoEhPorPeso(produto)) {

        const valorKg = Math.max(0, numeroSeguro(
            produto.precos?.[0]?.valor ?? produto.preco
        ));
        const peso = Math.max(0, numeroSeguro(produto.peso));

        return valorKg > 0 && peso > 0
            ? valorKg * peso
            : 0;

    }

    if (Array.isArray(produto.precos) && produto.precos.length) {

        return produto.precos.reduce(
            (total, item) => total + (
                Math.max(0, numeroSeguro(item.valor)) *
                Math.max(0, numeroSeguro(item.quantidade))
            ),
            0
        );

    }

    const preco = numeroSeguro(produto.preco);
    const quantidade = Math.max(0, numeroSeguro(produto.quantidade));
    const peso = Math.max(0, numeroSeguro(produto.peso));

    if (produtoEhPorPeso(produto) && peso > 0) {

        return preco * peso;

    }

    return preco * quantidade;

}


function calcularTotal(produtos = []) {

    return produtos.reduce(
        (total, produto) => total + calcularSubtotal(produto),
        0
    );

}


function resolverProdutos(fonteProdutos) {

    if (typeof fonteProdutos === "function") {

        return fonteProdutos() || [];

    }

    return Array.isArray(fonteProdutos)
        ? fonteProdutos
        : [];

}


export function obterOrcamento() {

    return Math.max(
        0,
        numeroSeguro(localStorage.getItem(CHAVE_ORCAMENTO))
    );

}


export function salvarOrcamento(valor) {

    const limite = Math.max(
        0,
        converterValorDigitado(valor)
    );

    localStorage.setItem(
        CHAVE_ORCAMENTO,
        String(limite)
    );

    sinalizarAlteracaoDaLista();

    return limite;

}


export function limparOrcamento() {

    localStorage.removeItem(CHAVE_ORCAMENTO);
    sinalizarAlteracaoDaLista();

}


export function renderizarOrcamento(produtos = []) {

    const card = document.getElementById("cardOrcamento");

    if (!card) {

        return;

    }

    const limite = obterOrcamento();
    const gasto = calcularTotal(produtos);
    const disponivel = limite - gasto;

    const percentual =
        limite > 0
            ? (gasto / limite) * 100
            : 0;

    const campoLimite =
        document.getElementById("orcamentoLimite");

    const campoGasto =
        document.getElementById("orcamentoGasto");

    const campoDisponivel =
        document.getElementById("orcamentoDisponivel");

    const campoPercentual =
        document.getElementById("orcamentoPercentual");

    const barra =
        document.getElementById("barraOrcamento");

    const mensagem =
        document.getElementById("mensagemOrcamento");

    const valorOrcamento =
        document.getElementById("valorOrcamento");


    if (
        valorOrcamento &&
        document.activeElement !== valorOrcamento
    ) {

        valorOrcamento.value =
            limite > 0
                ? limite.toFixed(2).replace(".", ",")
                : "";

    }

    if (campoLimite) {

        campoLimite.textContent = formatarMoeda(limite);

    }

    if (campoGasto) {

        campoGasto.textContent = formatarMoeda(gasto);

    }

    if (campoDisponivel) {

        campoDisponivel.textContent =
            disponivel >= 0
                ? formatarMoeda(disponivel)
                : `-${formatarMoeda(Math.abs(disponivel))}`;

    }

    if (campoPercentual) {

        campoPercentual.textContent =
            limite > 0
                ? `${percentual.toFixed(0)}%`
                : "0%";

    }

    if (barra) {

        barra.style.width =
            `${Math.min(Math.max(percentual, 0), 100)}%`;

    }

    const estados = [
        "orcamento-vazio",
        "orcamento-ok",
        "orcamento-atencao",
        "orcamento-proximo",
        "orcamento-excedido"
    ];

    card.classList.remove(...estados);

    let classe;
    let texto;

    if (limite <= 0) {

        classe = "orcamento-vazio";
        texto = "Defina um orçamento para acompanhar o limite da compra.";

    } else if (percentual <= 70) {

        classe = "orcamento-ok";
        texto = "Seu orçamento está sob controle.";

    } else if (percentual <= 90) {

        classe = "orcamento-atencao";
        texto = "Atenção: você já utilizou boa parte do orçamento.";

    } else if (percentual <= 100) {

        classe = "orcamento-proximo";
        texto = "Você está próximo do limite do orçamento.";

    } else {

        classe = "orcamento-excedido";
        texto =
            `Orçamento excedido em ${formatarMoeda(Math.abs(disponivel))}.`;

    }

    card.classList.add(classe);

    if (mensagem) {

        mensagem.textContent = texto;

    }

}


export function configurarOrcamento(
    fonteProdutos,
    aoAlterar
) {

    const botaoSalvar =
        document.getElementById("btnSalvarOrcamento");

    const botaoLimpar =
        document.getElementById("btnLimparOrcamento");

    const campo =
        document.getElementById("valorOrcamento");

    const botaoEditar =
        document.getElementById("btnEditarOrcamento");

    const painelEdicao =
        document.getElementById("painelEdicaoOrcamento");

    async function fecharEdicao() {

        if (!painelEdicao || !botaoEditar) return;

        botaoEditar.setAttribute("aria-expanded", "false");
        await fecharPainel(painelEdicao);

    }

    if (botaoEditar && painelEdicao && !botaoEditar.dataset.configurado) {

        botaoEditar.dataset.configurado = "true";
        botaoEditar.addEventListener("click", function () {

            const abrir = painelEdicao.hidden;
            botaoEditar.setAttribute("aria-expanded", String(abrir));

            if (abrir) {
                abrirPainel(painelEdicao).then(() => campo?.focus());
            } else {
                fecharPainel(painelEdicao);
            }

        });

    }


    if (botaoSalvar && !botaoSalvar.dataset.configurado) {

        botaoSalvar.dataset.configurado = "true";

        botaoSalvar.addEventListener("click", function () {

            const valor = salvarOrcamento(campo?.value);

            if (valor <= 0 && campo) {

                campo.value = "";

            }

            renderizarOrcamento(
                resolverProdutos(fonteProdutos)
            );

            if (typeof aoAlterar === "function") {

                aoAlterar(valor);

            }

            fecharEdicao();

        });

    }


    if (botaoLimpar && !botaoLimpar.dataset.configurado) {

        botaoLimpar.dataset.configurado = "true";

        botaoLimpar.addEventListener("click", function () {

            limparOrcamento();

            if (campo) {

                campo.value = "";

            }

            renderizarOrcamento(
                resolverProdutos(fonteProdutos)
            );

            if (typeof aoAlterar === "function") {

                aoAlterar(0);

            }

            fecharEdicao();

        });

    }


    if (campo && !campo.dataset.configurado) {

        campo.dataset.configurado = "true";

        campo.addEventListener("keydown", function (evento) {

            if (evento.key === "Enter") {

                evento.preventDefault();
                botaoSalvar?.click();

            }

        });

    }


    renderizarOrcamento(
        resolverProdutos(fonteProdutos)
    );

}
