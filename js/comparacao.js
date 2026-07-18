import { api, ApiError } from "./api.js";


/*
 * O preço original coletado pelo scraper é preservado.
 * A margem de 5% é calculada separadamente apenas
 * para mostrar uma faixa estimada ao usuário.
 */

const MARGEM_PERCENTUAL = 5;
const MARGEM_DECIMAL = 0.05;

let resultadosAtuais = [];


function numeroSeguro(valor) {

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;

}


function formatarMoeda(valor) {

    return numeroSeguro(valor).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


function formatarData(valor) {

    if (!valor) {

        return "Não informada";

    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime())
        ? String(valor)
        : data.toLocaleString("pt-BR");

}


function escaparHTML(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function calcularFaixa(precoOriginal) {

    const preco = numeroSeguro(precoOriginal);

    return {

        minimo:
            preco * (1 - MARGEM_DECIMAL),

        maximo:
            preco * (1 + MARGEM_DECIMAL)

    };

}


function mostrarMensagem(
    mensagem,
    tipo = "erro"
) {

    let container =
        document.getElementById("mensagens");

    if (!container) {

        container = document.createElement("div");

        container.id = "mensagens";
        container.className = "mensagens-globais";

        document.body.prepend(container);

    }

    const aviso = document.createElement("div");

    aviso.className =
        `mensagem mensagem-${tipo}`;

    aviso.textContent = mensagem;

    container.appendChild(aviso);

    window.setTimeout(
        () => aviso.remove(),
        5500
    );

}


function obterSupermercadosSelecionados() {

    return Array.from(
        document.querySelectorAll(
            'input[name="supermercados"]:checked'
        )
    )
        .map(campo => campo.value)
        .filter(Boolean);

}


function normalizarResultados(resposta) {

    const dados =
        resposta?.resultados ||
        resposta?.precos ||
        resposta?.itens ||
        resposta ||
        [];

    if (!Array.isArray(dados)) {

        return [];

    }

    return dados.map(item => {

        const precoOriginal =
            numeroSeguro(
                item.precoOriginal ??
                item.preco ??
                item.valor
            );

        return {

            produto:
                item.produto?.nome ||
                item.nomeProduto ||
                item.produto ||
                "Produto",

            supermercado:
                item.supermercado?.nome ||
                item.nomeSupermercado ||
                item.supermercado ||
                "Supermercado",

            precoOriginal,

            confianca:
                item.nivelConfianca ||
                item.confianca ||
                "Não informada",

            atualizadoEm:
                item.atualizadoEm ||
                item.dataColeta ||
                item.coletadoEm,

            cidade:
                item.cidade ||
                item.regiao ||
                ""

        };

    });

}


function renderizarTabela(resultados) {

    const corpo =
        document.getElementById(
            "corpoTabelaComparacao"
        );

    const container =
        document.getElementById(
            "resultadoComparacao"
        );

    if (!corpo) {

        return;

    }

    if (container) {

        container.hidden = false;

    }

    if (!resultados.length) {

        corpo.innerHTML = `

            <tr>

                <td colspan="6">
                    Nenhum preço real foi encontrado para essa pesquisa.
                </td>

            </tr>

        `;

        return;

    }

    corpo.innerHTML = resultados.map(item => {

        const faixa =
            calcularFaixa(item.precoOriginal);

        return `

            <tr>

                <td>
                    ${escaparHTML(item.produto)}
                </td>

                <td>
                    ${escaparHTML(item.supermercado)}
                </td>

                <td class="preco-original">
                    ${formatarMoeda(item.precoOriginal)}
                </td>

                <td>
                    <span class="faixa-preco">
                        ${formatarMoeda(faixa.minimo)}
                        até
                        ${formatarMoeda(faixa.maximo)}
                    </span>

                    <small class="margem-preco">
                        Margem estimada de ±${MARGEM_PERCENTUAL}%
                    </small>
                </td>

                <td>
                    <span class="confianca confianca-${String(item.confianca).toLowerCase()}">
                        ${escaparHTML(item.confianca)}
                    </span>
                </td>

                <td>
                    ${escaparHTML(formatarData(item.atualizadoEm))}
                </td>

            </tr>

        `;

    }).join("");

}


function atualizarResumo(resposta, resultados) {

    const ordenados =
        [...resultados].sort(
            (a, b) =>
                a.precoOriginal -
                b.precoOriginal
        );

    const melhor =
        resposta?.melhorSupermercado ||
        resposta?.melhorOpcao ||
        ordenados[0]?.supermercado ||
        "Não encontrado";

    const menorTotal =
        numeroSeguro(
            resposta?.menorTotal ??
            resposta?.totalMelhorOpcao ??
            ordenados[0]?.precoOriginal
        );

    const economia =
        numeroSeguro(
            resposta?.economiaEstimada ??
            resposta?.economia
        );

    const confianca =
        resposta?.nivelConfianca ||
        resposta?.confianca ||
        ordenados[0]?.confianca ||
        "Não informada";

    const campos = {

        melhorSupermercado: melhor,

        menorTotal:
            formatarMoeda(menorTotal),

        economiaEstimada:
            formatarMoeda(economia),

        nivelConfianca:
            confianca

    };

    Object.entries(campos).forEach(
        ([id, valor]) => {

            const elemento =
                document.getElementById(id);

            if (elemento) {

                elemento.textContent = valor;

            }

        }
    );

}


function ordenarResultados() {

    const tipo =
        document.getElementById(
            "ordenacaoComparacao"
        )?.value || "menor-preco";

    const lista =
        [...resultadosAtuais];

    if (tipo === "maior-preco") {

        lista.sort(
            (a, b) =>
                b.precoOriginal -
                a.precoOriginal
        );

    } else if (tipo === "supermercado") {

        lista.sort(
            (a, b) =>
                a.supermercado.localeCompare(
                    b.supermercado,
                    "pt-BR"
                )
        );

    } else {

        lista.sort(
            (a, b) =>
                a.precoOriginal -
                b.precoOriginal
        );

    }

    renderizarTabela(lista);

}


async function pesquisarComparacao(evento) {

    evento.preventDefault();

    const produto =
        document.getElementById(
            "produtoComparacao"
        )?.value.trim();

    const cidade =
        document.getElementById(
            "cidadeComparacao"
        )?.value.trim();

    const supermercados =
        obterSupermercadosSelecionados();

    if (!produto) {

        mostrarMensagem(
            "Digite o produto que deseja pesquisar."
        );

        return;

    }

    if (!supermercados.length) {

        mostrarMensagem(
            "Selecione pelo menos um supermercado."
        );

        return;

    }

    const botao =
        evento.currentTarget.querySelector(
            'button[type="submit"]'
        );

    if (botao) {

        botao.disabled = true;
        botao.textContent =
            "Buscando preços reais...";

    }

    try {

        const resposta =
            await api.post(
                "/comparacoes",
                {

                    produto,
                    cidade,
                    supermercados,

                    /*
                     * O backend também deverá fixar
                     * essa margem em 5%.
                     */

                    margemPercentual:
                        MARGEM_PERCENTUAL

                }
            );

        resultadosAtuais =
            normalizarResultados(resposta);

        atualizarResumo(
            resposta,
            resultadosAtuais
        );

        ordenarResultados();

    } catch (erro) {

        resultadosAtuais = [];

        renderizarTabela([]);

        mostrarMensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível pesquisar os preços."
        );

    } finally {

        if (botao) {

            botao.disabled = false;
            botao.textContent =
                "Comparar preços";

        }

    }

}


async function buscarCompraInteligente() {

    const cidade =
        document.getElementById(
            "cidadeComparacao"
        )?.value.trim();

    const supermercados =
        obterSupermercadosSelecionados();

    const resultado =
        document.getElementById(
            "resultadoCompraInteligente"
        );

    if (!supermercados.length) {

        mostrarMensagem(
            "Selecione os supermercados para calcular a compra inteligente."
        );

        return;

    }

    try {

        const resposta =
            await api.post(
                "/comparacoes/compra-inteligente",
                {

                    cidade,
                    supermercados,
                    margemPercentual:
                        MARGEM_PERCENTUAL

                }
            );

        if (resultado) {

            const economia =
                numeroSeguro(
                    resposta?.economiaEstimada ??
                    resposta?.economia
                );

            resultado.hidden = false;

            resultado.innerHTML = `

                <h3>✨ Melhor combinação encontrada</h3>

                <p>
                    ${escaparHTML(
                        resposta?.descricao ||
                        resposta?.mensagem ||
                        "A combinação foi calculada com os preços disponíveis."
                    )}
                </p>

                <strong>
                    Economia estimada:
                    ${formatarMoeda(economia)}
                </strong>

                <small>
                    Os valores exibem faixa estimada de ±5%,
                    sem modificar o preço original coletado.
                </small>

            `;

        }

    } catch (erro) {

        mostrarMensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível calcular a compra inteligente."
        );

    }

}


function limparComparacao() {

    resultadosAtuais = [];

    document
        .getElementById("formComparacao")
        ?.reset();

    const corpo =
        document.getElementById(
            "corpoTabelaComparacao"
        );

    if (corpo) {

        corpo.innerHTML = "";

    }

    const container =
        document.getElementById(
            "resultadoComparacao"
        );

    if (container) {

        container.hidden = true;

    }

    const compraInteligente =
        document.getElementById(
            "resultadoCompraInteligente"
        );

    if (compraInteligente) {

        compraInteligente.hidden = true;
        compraInteligente.innerHTML = "";

    }

}


function iniciar() {

    document
        .getElementById("formComparacao")
        ?.addEventListener(
            "submit",
            pesquisarComparacao
        );

    document
        .getElementById("ordenacaoComparacao")
        ?.addEventListener(
            "change",
            ordenarResultados
        );

    document
        .getElementById("btnLimparComparacao")
        ?.addEventListener(
            "click",
            limparComparacao
        );

    document
        .getElementById("btnCompraInteligente")
        ?.addEventListener(
            "click",
            buscarCompraInteligente
        );

}


document.addEventListener(
    "DOMContentLoaded",
    iniciar
);