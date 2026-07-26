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

    if (Array.isArray(produto.precos) && produto.precos.length) {

        return resumirProduto(produto).total;

    }

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


function montarProdutoLegado(produto) {

    const subtotal =
        calcularSubtotalProduto(produto);

    const mercado =
        produto.supermercado ||
        "Mercado não definido";

    const favorito =
        produto.favorito
            ? "produto-favorito"
            : "";

    const semHistorico =
        numeroSeguro(produto.ultimoPreco) <= 0 &&
        !String(produto.ultimoSupermercado || "").trim()
            ? "produto-sem-historico"
            : "";

    return `

        <article
            class="produto ${favorito} ${semHistorico}"
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


const precosAbertos = new Set();
const produtosEmEdicao = new Set();


function montarLinhaPreco(preco, indice, nomeProduto) {

    const subtotal = preco.valor * preco.quantidade;

    return `
        <div class="preco-cadastrado" data-preco-id="${escaparHTML(preco.id)}">
            <label class="preco-valor-campo">
                <span>Valor (R$)</span>
                <input type="number" min="0" step="0.01" inputmode="decimal"
                    value="${preco.valor.toFixed(2)}" data-campo-preco="valor"
                    aria-label="Valor do preço ${indice + 1} de ${escaparHTML(nomeProduto)}">
            </label>
            <div class="preco-quantidade-campo">
                <span>Quantidade</span>
                <div class="controle-quantidade-preco">
                    <button type="button" data-acao-preco="diminuir" aria-label="Diminuir quantidade">−</button>
                    <strong data-quantidade-preco>${preco.quantidade}</strong>
                    <button type="button" data-acao-preco="aumentar" aria-label="Aumentar quantidade">+</button>
                </div>
            </div>
            <div class="preco-subtotal-campo">
                <span>Subtotal (R$)</span>
                <strong data-subtotal-preco>${formatarMoeda(subtotal)}</strong>
            </div>
            <button type="button" class="excluir-preco" data-acao-preco="excluir"
                aria-label="Excluir preço ${indice + 1}">🗑</button>
        </div>
    `;

}


function formatarQuantidade(valor) {

    return numeroSeguro(valor).toLocaleString(
        "pt-BR",
        {
            maximumFractionDigits: 3
        }
    );

}


function ajustarPrecosAoResumo(produto, quantidadeInformada, totalInformado) {

    const precos = obterPrecosProduto(produto).map(preco => ({ ...preco }));
    const quantidadeAlvo = Math.max(0, Math.floor(numeroSeguro(quantidadeInformada)));
    const totalAlvo = Math.max(0, numeroSeguro(totalInformado));
    const quantidadeAtual = precos.reduce(
        (soma, preco) => soma + preco.quantidade,
        0
    );

    if (quantidadeAtual > 0) {

        let quantidadeDistribuida = 0;

        precos.forEach((preco, indice) => {

            const ultimaLinha = indice === precos.length - 1;
            const quantidade = ultimaLinha
                ? quantidadeAlvo - quantidadeDistribuida
                : Math.floor((preco.quantidade / quantidadeAtual) * quantidadeAlvo);

            preco.quantidade = Math.max(0, quantidade);
            quantidadeDistribuida += preco.quantidade;

        });

    } else {

        precos.forEach(preco => { preco.quantidade = 0; });
        precos[0].quantidade = quantidadeAlvo;

    }

    const linhasAtivas = precos.filter(preco => preco.quantidade > 0);
    const totalAtual = linhasAtivas.reduce(
        (soma, preco) => soma + (preco.valor * preco.quantidade),
        0
    );

    if (!linhasAtivas.length) {

        return precos;

    }

    if (totalAlvo === 0) {

        linhasAtivas.forEach(preco => { preco.valor = 0; });
        return precos;

    }

    if (totalAtual > 0) {

        const fator = totalAlvo / totalAtual;
        linhasAtivas.forEach(preco => { preco.valor *= fator; });

    } else {

        linhasAtivas[0].valor = totalAlvo / linhasAtivas[0].quantidade;

    }

    const ultimaLinha = linhasAtivas.at(-1);
    const totalOutrasLinhas = linhasAtivas
        .slice(0, -1)
        .reduce((soma, preco) => soma + (preco.valor * preco.quantidade), 0);

    ultimaLinha.valor = Math.max(
        0,
        (totalAlvo - totalOutrasLinhas) / ultimaLinha.quantidade
    );

    return precos;

}


function montarProduto(produto) {

    const resumo = resumirProduto(produto);
    const aberto = precosAbertos.has(String(produto.id));
    const editando = produtosEmEdicao.has(String(produto.id));
    const quantidadePrecos = resumo.precos.length;
    const rotuloPrecos = `${quantidadePrecos} ${quantidadePrecos === 1 ? "preço" : "preços"}`;
    const ultimoPreco = Math.max(0, numeroSeguro(produto.ultimoPreco));
    const ultimaQuantidade = Math.max(0, numeroSeguro(produto.ultimaQuantidade));
    const possuiUltimaCompra = ultimoPreco > 0 || ultimaQuantidade > 0;

    return `
        <article class="produto produto-multivalores"
            data-produto-id="${escaparHTML(produto.id)}">
            <header class="produto-resumo-compacto">
                <div class="produto-identidade-compacta">
                    <div>
                        <h3>${escaparHTML(produto.nome)}</h3>
                        ${possuiUltimaCompra ? `
                            <div class="produto-ultima-compra" aria-label="Dados da última compra">
                                <span>Último preço <strong>${ultimoPreco > 0 ? formatarMoeda(ultimoPreco) : "—"}</strong></span>
                                <span>Última qtd. <strong>${ultimaQuantidade > 0 ? formatarQuantidade(ultimaQuantidade) : "—"}</strong></span>
                            </div>
                        ` : `<small class="produto-sem-ultima-compra">Sem compra finalizada</small>`}
                    </div>
                </div>
                <div class="alternar-precos" aria-label="${rotuloPrecos}">
                    <strong>${rotuloPrecos}</strong>
                </div>
                <div class="metrica-produto">
                    <span>Qtd. total</span>
                    ${editando ? `
                        <div class="editar-quantidade-total">
                            <button type="button" data-acao-edicao="diminuir-quantidade" aria-label="Diminuir quantidade total">−</button>
                            <input type="number" min="0" step="1" inputmode="numeric" data-editar="quantidade-total"
                                value="${resumo.quantidadeTotal}" aria-label="Quantidade total de ${escaparHTML(produto.nome)}">
                            <button type="button" data-acao-edicao="aumentar-quantidade" aria-label="Aumentar quantidade total">+</button>
                        </div>
                    ` : `<strong data-total-quantidade>${resumo.quantidadeTotal}</strong>`}
                </div>
                <div class="metrica-produto metrica-total">
                    <span>Total</span>
                    ${editando ? `
                        <label class="editar-total-produto">
                            <span class="sr-only">Valor total do produto</span>
                            <input type="number" min="0" step="0.01" inputmode="decimal" data-editar="total"
                                value="${resumo.total.toFixed(2)}" aria-label="Valor total de ${escaparHTML(produto.nome)}">
                        </label>
                    ` : `<strong data-total-produto>${formatarMoeda(resumo.total)}</strong>`}
                </div>
                <button type="button" class="editar-produto" data-acao="editar" aria-label="Editar ${escaparHTML(produto.nome)}">✎</button>
            </header>

            ${editando ? `
                <section class="editar-produto-painel" aria-label="Editar produto">
                    <label><span>Nome do produto</span><input type="text" data-editar="nome" maxlength="100" value="${escaparHTML(produto.nome)}"></label>
                    <label><span>Categoria</span><select data-editar="categoria">${montarOpcoesCategoria(produto.categoria)}</select></label>
                    <div class="editar-produto-acoes">
                        <button type="button" class="btn btn-primary" data-acao="salvar-edicao">Salvar alterações</button>
                        <button type="button" class="btn btn-secondary" data-acao="cancelar-edicao">Cancelar</button>
                        <button type="button" class="btn btn-secondary" data-acao="abrir-precos">+ Adicionar preço</button>
                        <button type="button" class="btn btn-danger" data-acao="excluir">Excluir produto</button>
                    </div>
                </section>
            ` : ""}

            ${editando || aberto ? `
                <section class="precos-produto" ${aberto ? "" : "hidden"} aria-label="Preços cadastrados de ${escaparHTML(produto.nome)}">
                    <div class="precos-produto-topo"><h4>Preços cadastrados</h4><button type="button" data-acao="adicionar-preco">+ Adicionar preço</button></div>
                    <div class="precos-cabecalho" aria-hidden="true"><span>Valor (R$)</span><span>Quantidade</span><span>Subtotal (R$)</span><span></span></div>
                    <div class="precos-lista">${resumo.precos.map((preco, indice) => montarLinhaPreco(preco, indice, produto.nome)).join("")}</div>
                    <footer class="resumo-precos-produto">
                        <div><span>Qtd. total</span><strong data-resumo-quantidade>${resumo.quantidadeTotal} ${resumo.quantidadeTotal === 1 ? "unidade" : "unidades"}</strong></div>
                        <div><span>Total do item</span><strong data-resumo-total>${formatarMoeda(resumo.total)}</strong></div>
                        <div><span>Média por unidade</span><strong data-resumo-media>${formatarMoeda(resumo.media)}</strong></div>
                    </footer>
                </section>
            ` : ""}
        </article>
    `;

}


function atualizarResumoVisualProduto(elemento, opcoes = {}) {

    const linhas = [...elemento.querySelectorAll(".preco-cadastrado")];
    let quantidadeTotal = 0;
    let total = 0;

    linhas.forEach(linha => {
        const valor = Math.max(0, numeroSeguro(linha.querySelector('[data-campo-preco="valor"]')?.value));
        const quantidade = Math.max(0, numeroSeguro(linha.querySelector("[data-quantidade-preco]")?.textContent));
        const subtotal = valor * quantidade;
        quantidadeTotal += quantidade;
        total += subtotal;
        const subtotalElemento = linha.querySelector("[data-subtotal-preco]");
        if (subtotalElemento) subtotalElemento.textContent = formatarMoeda(subtotal);
    });

    const media = quantidadeTotal > 0 ? total / quantidadeTotal : 0;
    const atualizar = (seletor, valor) => {
        const alvo = elemento.querySelector(seletor);
        if (alvo) alvo.textContent = valor;
    };
    const campoQuantidadeTotal = elemento.querySelector('[data-editar="quantidade-total"]');
    const campoTotal = elemento.querySelector('[data-editar="total"]');

    if (!opcoes.preservarCamposEdicao && campoQuantidadeTotal) {
        campoQuantidadeTotal.value = String(quantidadeTotal);
    } else {
        atualizar("[data-total-quantidade]", String(quantidadeTotal));
    }

    if (!opcoes.preservarCamposEdicao && campoTotal) {
        campoTotal.value = total.toFixed(2);
    } else {
        atualizar("[data-total-produto]", formatarMoeda(total));
    }

    atualizar("[data-resumo-quantidade]", `${quantidadeTotal} ${quantidadeTotal === 1 ? "unidade" : "unidades"}`);
    atualizar("[data-resumo-total]", formatarMoeda(total));
    atualizar("[data-resumo-media]", formatarMoeda(media));

}


function sincronizarPrecosComResumoEditavel(elemento, produto) {

    const quantidade = elemento.querySelector('[data-editar="quantidade-total"]')?.value;
    const total = elemento.querySelector('[data-editar="total"]')?.value;
    const precos = ajustarPrecosAoResumo(produto, quantidade, total);
    const precosPorId = new Map(
        precos.map(preco => [String(preco.id), preco])
    );

    elemento.querySelectorAll(".preco-cadastrado").forEach(linha => {

        const preco = precosPorId.get(String(linha.dataset.precoId));
        if (!preco) return;

        const campoValor = linha.querySelector('[data-campo-preco="valor"]');
        const quantidadeElemento = linha.querySelector("[data-quantidade-preco]");

        if (campoValor) campoValor.value = preco.valor.toFixed(2);
        if (quantidadeElemento) quantidadeElemento.textContent = String(preco.quantidade);

    });

    atualizarResumoVisualProduto(elemento, { preservarCamposEdicao: true });

}


function obterAlteracoesDaEdicao(elemento, produto) {

    const campoNome = elemento.querySelector('[data-editar="nome"]');
    const nome = campoNome?.value.trim();

    if (!nome) {
        campoNome?.setCustomValidity("Digite o nome do produto.");
        campoNome?.reportValidity();
        return null;
    }

    campoNome.setCustomValidity("");

    let quantidadeTotal = Math.max(
        0,
        Math.floor(numeroSeguro(elemento.querySelector('[data-editar="quantidade-total"]')?.value))
    );
    const total = Math.max(
        0,
        numeroSeguro(elemento.querySelector('[data-editar="total"]')?.value)
    );

    if (total > 0 && quantidadeTotal === 0) quantidadeTotal = 1;

    return {
        nome,
        categoria: elemento.querySelector('[data-editar="categoria"]')?.value,
        precos: ajustarPrecosAoResumo(produto || {}, quantidadeTotal, total)
    };

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
            const produtoAtual = produtos.find(
                produto => String(produto.id) === String(id)
            );

            elemento
                .querySelector('[data-acao="editar"]')
                ?.addEventListener("click", () => {
                    produtosEmEdicao.add(String(id));
                    precosAbertos.delete(String(id));
                    renderizarProdutos(produtos, acoes);
                });

            elemento
                .querySelector('[data-acao="abrir-precos"]')
                ?.addEventListener("click", () => {
                    const alteracoes = obterAlteracoesDaEdicao(elemento, produtoAtual);
                    if (!alteracoes) return;
                    precosAbertos.add(String(id));
                    if (acoes.aoPrepararEdicaoPrecos) {
                        acoes.aoPrepararEdicaoPrecos(id, alteracoes);
                        return;
                    }
                    sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
                    const painelPrecos = elemento.querySelector(".precos-produto");
                    if (painelPrecos) painelPrecos.hidden = false;
                });

            const campoQuantidadeTotal = elemento.querySelector('[data-editar="quantidade-total"]');
            const campoTotal = elemento.querySelector('[data-editar="total"]');

            elemento
                .querySelector('[data-acao-edicao="diminuir-quantidade"]')
                ?.addEventListener("click", () => {
                    campoQuantidadeTotal.value = String(
                        Math.max(0, Math.floor(numeroSeguro(campoQuantidadeTotal.value)) - 1)
                    );
                    sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
                });

            elemento
                .querySelector('[data-acao-edicao="aumentar-quantidade"]')
                ?.addEventListener("click", () => {
                    campoQuantidadeTotal.value = String(
                        Math.max(0, Math.floor(numeroSeguro(campoQuantidadeTotal.value)) + 1)
                    );
                    sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
                });

            campoQuantidadeTotal?.addEventListener("input", () => {
                campoQuantidadeTotal.value = String(
                    Math.max(0, Math.floor(numeroSeguro(campoQuantidadeTotal.value)))
                );
                sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
            });

            campoTotal?.addEventListener("input", () => {
                if (numeroSeguro(campoTotal.value) > 0 && numeroSeguro(campoQuantidadeTotal?.value) === 0) {
                    campoQuantidadeTotal.value = "1";
                }
                sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
            });

            elemento
                .querySelector('[data-acao="cancelar-edicao"]')
                ?.addEventListener("click", () => {
                    produtosEmEdicao.delete(String(id));
                    precosAbertos.delete(String(id));
                    renderizarProdutos(produtos, acoes);
                });

            elemento
                .querySelector('[data-acao="salvar-edicao"]')
                ?.addEventListener("click", () => {
                    const alteracoes = obterAlteracoesDaEdicao(elemento, produtoAtual);
                    if (!alteracoes) return;
                    produtosEmEdicao.delete(String(id));
                    precosAbertos.delete(String(id));
                    acoes.aoSalvarEdicao?.(id, alteracoes);
                });

            elemento
                .querySelector('[data-acao="adicionar-preco"]')
                ?.addEventListener("click", () => {
                    precosAbertos.add(String(id));
                    acoes.aoAdicionarPreco?.(id);
                });

            elemento.querySelectorAll(".preco-cadastrado").forEach(linha => {
                const precoId = linha.dataset.precoId;

                linha.querySelector('[data-acao-preco="diminuir"]')
                    ?.addEventListener("click", () =>
                        acoes.aoAlterarQuantidadePreco?.(id, precoId, -1)
                    );

                linha.querySelector('[data-acao-preco="aumentar"]')
                    ?.addEventListener("click", () =>
                        acoes.aoAlterarQuantidadePreco?.(id, precoId, 1)
                    );

                linha.querySelector('[data-acao-preco="excluir"]')
                    ?.addEventListener("click", () =>
                        acoes.aoExcluirPreco?.(id, precoId)
                    );

                linha.querySelector('[data-campo-preco="valor"]')
                    ?.addEventListener("input", evento => {
                        acoes.aoAlterarValorPreco?.(id, precoId, evento.target.value);
                        atualizarResumoVisualProduto(elemento);
                    });
            });

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


function obterPrecosProduto(produto = {}) {

    if (Array.isArray(produto.precos) && produto.precos.length) {

        return produto.precos.map((preco, indice) => ({
            id: String(preco.id || indice),
            valor: Math.max(0, numeroSeguro(preco.valor)),
            quantidade: Math.max(0, numeroSeguro(preco.quantidade))
        }));

    }

    return [{
        id: "preco-inicial",
        valor: Math.max(0, numeroSeguro(produto.preco)),
        quantidade: Math.max(0, numeroSeguro(produto.quantidade))
    }];

}


function resumirProduto(produto = {}) {

    const precos = obterPrecosProduto(produto);
    const quantidadeTotal = precos.reduce(
        (soma, preco) => soma + preco.quantidade,
        0
    );
    const total = precos.reduce(
        (soma, preco) => soma + (preco.valor * preco.quantidade),
        0
    );

    return {
        precos,
        quantidadeTotal,
        total,
        media: quantidadeTotal > 0 ? total / quantidadeTotal : 0
    };

}
