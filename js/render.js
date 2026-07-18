const CATEGORIAS = [

    "🥛 Laticínios",
    "🥩 Carnes",
    "🍎 Hortifruti",
    "🍞 Padaria",
    "🥤 Bebidas",
    "🍚 Mercearia",
    "🍪 Doces e Snacks",
    "🧼 Limpeza",
    "🪥 Higiene",
    "🐶 Pet",
    "💊 Farmácia",
    "🥫 Enlatados",
    "❄️ Congelados",
    "🌶️ Temperos",
    "📦 Outros"

];


function numeroSeguro(valor) {

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;

}


export function formatarMoeda(valor) {

    return numeroSeguro(valor).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


function formatarData(data) {

    if (!data) {

        return "Data não informada";

    }

    const objeto = new Date(data);

    if (Number.isNaN(objeto.getTime())) {

        return String(data);

    }

    return objeto.toLocaleString("pt-BR");

}


function escaparHTML(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function ehHortifruti(produto) {

    return String(produto.categoria || "")
        .toLowerCase()
        .includes("hortifruti");

}


export function calcularSubtotalProduto(produto) {

    const preco = numeroSeguro(produto.preco);
    const quantidade = Math.max(
        0,
        numeroSeguro(produto.quantidade)
    );

    const peso = Math.max(
        0,
        numeroSeguro(produto.peso)
    );

    if (ehHortifruti(produto) && peso > 0) {

        return preco * peso;

    }

    return preco * quantidade;

}


export function calcularTotalProdutos(produtos = []) {

    return produtos.reduce(
        (total, produto) =>
            total + calcularSubtotalProduto(produto),
        0
    );

}


function montarOpcoesCategoria(categoriaAtual) {

    return CATEGORIAS.map(categoria => `

        <option
            value="${escaparHTML(categoria)}"
            ${categoria === categoriaAtual ? "selected" : ""}
        >
            ${escaparHTML(categoria)}
        </option>

    `).join("");

}


function montarDiferencaPreco(produto) {

    const atual = numeroSeguro(produto.preco);
    const anterior = numeroSeguro(produto.ultimoPreco);

    if (anterior <= 0 || atual <= 0) {

        return `
            <p class="diferenca gray">
                Sem comparação anterior
            </p>
        `;

    }

    const diferenca = atual - anterior;
    const percentual = (diferenca / anterior) * 100;

    if (diferenca > 0) {

        return `
            <p class="diferenca red">
                ▲ Subiu ${formatarMoeda(diferenca)}
                (${percentual.toFixed(1)}%)
            </p>
        `;

    }

    if (diferenca < 0) {

        return `
            <p class="diferenca green">
                ▼ Baixou ${formatarMoeda(Math.abs(diferenca))}
                (${Math.abs(percentual).toFixed(1)}%)
            </p>
        `;

    }

    return `
        <p class="diferenca gray">
            Preço sem alteração
        </p>
    `;

}


function montarProduto(produto) {

    const subtotal =
        calcularSubtotalProduto(produto);

    const mercado =
        produto.supermercado ||
        "Mercado não definido";

    const favorito =
        produto.favorito
            ? "produto-favorito"
            : "";

    return `

        <article
            class="produto ${favorito}"
            data-produto-id="${escaparHTML(produto.id)}"
        >

            <div class="info-produto">

                <div class="produto-titulo-linha">

                    <div>

                        <span class="categoria-produto">
                            ${escaparHTML(produto.categoria)}
                        </span>

                        <h3>
                            ${escaparHTML(produto.nome)}
                        </h3>

                    </div>

                    <button
                        type="button"
                        class="btn-favorito-produto
                            ${produto.favorito ? "ativo" : ""}"
                        data-acao="favoritar"
                        aria-label="${
                            produto.favorito
                                ? "Remover dos favoritos"
                                : "Adicionar aos favoritos"
                        }"
                        title="${
                            produto.favorito
                                ? "Remover dos favoritos"
                                : "Adicionar aos favoritos"
                        }"
                    >
                        ${produto.favorito ? "★" : "☆"}
                    </button>

                </div>

                <p class="supermercado-produto">
                    🏪 ${escaparHTML(mercado)}
                </p>

                <div class="info-anterior">

                    <div class="box-anterior">

                        <small>Último preço</small>

                        <strong>
                            ${
                                produto.ultimoPreco > 0
                                    ? formatarMoeda(produto.ultimoPreco)
                                    : "Não registrado"
                            }
                        </strong>

                    </div>

                    <div class="box-anterior">

                        <small>Último mercado</small>

                        <strong>
                            ${escaparHTML(
                                produto.ultimoSupermercado ||
                                "Não registrado"
                            )}
                        </strong>

                    </div>

                </div>

                ${montarDiferencaPreco(produto)}

                <div class="campos-produto">

                    <div class="campo-produto">

                        <label>
                            Preço ${
                                ehHortifruti(produto)
                                    ? "por kg"
                                    : "unitário"
                            }
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value="${numeroSeguro(produto.preco)}"
                            data-campo="preco"
                            aria-label="Preço de ${escaparHTML(produto.nome)}"
                        >

                    </div>

                    <div class="campo-produto">

                        <label>Categoria</label>

                        <select
                            data-campo="categoria"
                            aria-label="Categoria de ${escaparHTML(produto.nome)}"
                        >
                            ${montarOpcoesCategoria(produto.categoria)}
                        </select>

                    </div>

                </div>

                ${
                    ehHortifruti(produto)
                        ? `
                            <div class="peso-container">

                                <label>
                                    Peso em quilogramas
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    class="input-peso"
                                    data-campo="peso"
                                    value="${numeroSeguro(produto.peso)}"
                                    placeholder="Exemplo: 1,5 kg"
                                    aria-label="Peso de ${escaparHTML(produto.nome)}"
                                >

                            </div>
                        `
                        : ""
                }

            </div>

            <div class="qtd">

                <button
                    type="button"
                    data-acao="diminuir"
                    aria-label="Diminuir quantidade de ${escaparHTML(produto.nome)}"
                >
                    −
                </button>

                <span>
                    ${Math.max(1, numeroSeguro(produto.quantidade))}
                </span>

                <button
                    type="button"
                    data-acao="aumentar"
                    aria-label="Aumentar quantidade de ${escaparHTML(produto.nome)}"
                >
                    +
                </button>

            </div>

            <div class="subtotal">

                <small>Subtotal</small>

                <strong>
                    ${formatarMoeda(subtotal)}
                </strong>

            </div>

            <button
                type="button"
                class="btn-excluir"
                data-acao="excluir"
                aria-label="Excluir ${escaparHTML(produto.nome)}"
            >
                Excluir
            </button>

        </article>

    `;

}


export function renderizarProdutos(
    produtos = [],
    acoes = {}
) {

    const lista =
        document.getElementById("listaProdutos");

    if (!lista) {

        return;

    }

    if (!produtos.length) {

        lista.innerHTML = `

            <div class="estado-vazio">

                <span aria-hidden="true">🛒</span>

                <h3>Nenhum produto encontrado</h3>

                <p>
                    Escolha o mercado atual e adicione o primeiro item.
                </p>

            </div>

        `;

        return;

    }

    lista.innerHTML =
        produtos.map(montarProduto).join("");


    lista.querySelectorAll("[data-produto-id]")
        .forEach(elemento => {

            const id =
                elemento.dataset.produtoId;

            elemento
                .querySelector('[data-acao="aumentar"]')
                ?.addEventListener("click", () =>
                    acoes.aoAlterarQuantidade?.(id, 1)
                );

            elemento
                .querySelector('[data-acao="diminuir"]')
                ?.addEventListener("click", () =>
                    acoes.aoAlterarQuantidade?.(id, -1)
                );

            elemento
                .querySelector('[data-acao="excluir"]')
                ?.addEventListener("click", () =>
                    acoes.aoExcluir?.(id)
                );

            elemento
                .querySelector('[data-acao="favoritar"]')
                ?.addEventListener("click", () =>
                    acoes.aoFavoritar?.(id)
                );

            elemento
                .querySelector('[data-campo="preco"]')
                ?.addEventListener("change", evento =>
                    acoes.aoAlterarPreco?.(
                        id,
                        evento.target.value
                    )
                );

            elemento
                .querySelector('[data-campo="peso"]')
                ?.addEventListener("change", evento =>
                    acoes.aoAlterarPeso?.(
                        id,
                        evento.target.value
                    )
                );

            elemento
                .querySelector('[data-campo="categoria"]')
                ?.addEventListener("change", evento =>
                    acoes.aoAlterarCategoria?.(
                        id,
                        evento.target.value
                    )
                );

        });

}


function montarResumoCategorias(produtos) {

    const totais = {};

    produtos.forEach(produto => {

        const categoria =
            produto.categoria || "📦 Outros";

        totais[categoria] =
            (totais[categoria] || 0) +
            calcularSubtotalProduto(produto);

    });

    const categorias =
        Object.entries(totais)
            .sort((a, b) => b[1] - a[1]);

    if (!categorias.length) {

        return `
            <p class="texto-secundario">
                Adicione produtos para visualizar o resumo.
            </p>
        `;

    }

    return categorias.map(
        ([categoria, total]) => `

            <div class="categoria-resumo">

                <span>
                    ${escaparHTML(categoria)}
                </span>

                <strong>
                    ${formatarMoeda(total)}
                </strong>

            </div>

        `
    ).join("");

}


export function renderizarTotais(
    produtos = [],
    historico = []
) {

    const total =
        calcularTotalProdutos(produtos);

    const ultima =
        historico.length
            ? numeroSeguro(historico[0].total)
            : 0;

    const totalCompra =
        document.getElementById("totalCompra");

    const ultimaCompra =
        document.getElementById("ultimaCompra");

    const comparacao =
        document.getElementById("comparacaoCompra");

    const resumo =
        document.getElementById("resumoItens");


    if (totalCompra) {

        totalCompra.textContent =
            formatarMoeda(total);

    }

    if (ultimaCompra) {

        ultimaCompra.textContent =
            formatarMoeda(ultima);

    }

    if (comparacao) {

        if (ultima <= 0) {

            comparacao.textContent =
                "⚪ Nenhuma compra anterior";

            comparacao.className =
                "comparacao-compra";

        } else {

            const diferenca = total - ultima;

            if (diferenca > 0) {

                comparacao.textContent =
                    `🔴 A compra atual está ${formatarMoeda(diferenca)} mais cara.`;

                comparacao.className =
                    "comparacao-compra comparacao-aumento";

            } else if (diferenca < 0) {

                comparacao.textContent =
                    `🟢 Economia estimada de ${formatarMoeda(Math.abs(diferenca))}.`;

                comparacao.className =
                    "comparacao-compra comparacao-economia";

            } else {

                comparacao.textContent =
                    "⚪ O total é igual ao da última compra.";

                comparacao.className =
                    "comparacao-compra";

            }

        }

    }

    if (resumo) {

        resumo.innerHTML = `

            <h3>📊 Resumo da Compra</h3>

            <div class="resumo-total-linha">

                <span>Total atual</span>

                <strong>
                    ${formatarMoeda(total)}
                </strong>

            </div>

            ${montarResumoCategorias(produtos)}

        `;

    }

}


export function renderizarHistorico(
    historico = []
) {

    const container =
        document.getElementById("historicoCompras");

    if (!container) {

        return;

    }

    if (!historico.length) {

        container.innerHTML = `

            <h2>📋 Histórico de Compras</h2>

            <p class="texto-secundario">
                Nenhuma compra foi finalizada ainda.
            </p>

        `;

        return;

    }

    container.innerHTML = `

        <h2>📋 Histórico de Compras</h2>

        <div class="botoes-historico">

            <button
                type="button"
                class="btn-limpar-historico"
                data-acao-historico="limpar"
            >
                Limpar histórico
            </button>

            <button
                type="button"
                class="btn-zerar-compra"
                data-acao-historico="zerar"
            >
                Zerar preços atuais
            </button>

        </div>

        ${historico.map(compra => `

            <article class="compra-historico">

                <h3>
                    Compra de ${escaparHTML(formatarData(compra.data))}
                </h3>

                <p>
                    <strong>Mercado:</strong>
                    ${escaparHTML(compra.supermercado || "Vários mercados")}
                </p>

                <p>
                    <strong>Total:</strong>
                    ${formatarMoeda(compra.total)}
                </p>

                ${
                    numeroSeguro(compra.economia) > 0
                        ? `
                            <p class="diferenca-compra-economia">
                                Economia de ${formatarMoeda(compra.economia)}
                            </p>
                        `
                        : `
                            <p class="diferenca-compra-primeira">
                                Compra registrada no histórico
                            </p>
                        `
                }

                <ul>

                    ${(compra.itens || []).map(item => `

                        <li>
                            ${escaparHTML(item.nome)}
                            — ${escaparHTML(item.supermercado || "Sem mercado")}
                            — ${formatarMoeda(item.subtotal)}
                        </li>

                    `).join("")}

                </ul>

            </article>

        `).join("")}

    `;

}