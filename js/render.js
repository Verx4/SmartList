import {
    MEDIDA_KG,
    normalizarMedidaProduto,
    obterRegraMedida,
    produtoEhPorPeso
} from "./medidas-produtos.js";
import { CATEGORIAS } from "./categorias.js";
import {
    animarProdutosNaLista
} from "./animations.js";


function numeroSeguro(valor) {

    const valorNormalizado = typeof valor === "string"
        ? valor.trim().replace(/\s/g, "").replace(",", ".")
        : valor;
    const numero = Number(valorNormalizado);

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

    return produtoEhPorPeso(produto);

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

    const categorias = CATEGORIAS.includes(categoriaAtual)
        ? CATEGORIAS
        : [categoriaAtual, ...CATEGORIAS].filter(Boolean);

    return categorias.map(categoria => `

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


function atualizarPrecoPrincipal(produto, quantidadeInformada, valorInformado) {

    const precos = obterPrecosProduto(produto).map(preco => ({ ...preco }));

    precos[0] = {
        ...precos[0],
        quantidade: Math.max(0, Math.floor(numeroSeguro(quantidadeInformada))),
        valor: Math.max(0, numeroSeguro(valorInformado))
    };

    return precos;

}


function montarProduto(produto) {

    const resumo = resumirProduto(produto);
    const porPeso = ehHortifruti(produto);
    const regraMedida = obterRegraMedida(produto.nome);
    const aberto = precosAbertos.has(String(produto.id));
    const editando = produtosEmEdicao.has(String(produto.id));
    const quantidadePrecos = porPeso ? 1 : resumo.precos.length;
    const rotuloPrecos = porPeso
        ? "Preço por kg"
        : `${quantidadePrecos} ${quantidadePrecos === 1 ? "preço" : "preços"}`;
    const ultimoPreco = Math.max(0, numeroSeguro(produto.ultimoPreco));
    const ultimaQuantidade = Math.max(0, numeroSeguro(produto.ultimaQuantidade));
    const possuiUltimaCompra = ultimoPreco > 0 || ultimaQuantidade > 0;
    const precoPrincipal = resumo.precos[0];
    const precosAdicionais = porPeso ? [] : resumo.precos.slice(1);

    return `
        <article class="produto produto-multivalores"
            data-produto-id="${escaparHTML(produto.id)}" data-por-peso="${porPeso}">
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
                ${editando && !porPeso && quantidadePrecos > 1 ? `
                    <button type="button" class="alternar-precos acionavel" data-acao="alternar-precos"
                        aria-expanded="${aberto}" aria-controls="precos-${escaparHTML(produto.id)}">
                        ${aberto ? "Ocultar" : "Ver"} ${rotuloPrecos}
                    </button>
                ` : `
                    <div class="alternar-precos" aria-label="${rotuloPrecos}">
                        <strong>${rotuloPrecos}</strong>
                    </div>
                `}
                <div class="metrica-produto metrica-quantidade">
                    <span>${porPeso ? "Peso (kg)" : editando && precosAdicionais.length ? "Qtd. principal" : "Qtd. total"}</span>
                    ${editando && porPeso ? `
                        <input class="editar-peso-total" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                            data-editar="peso" value="${numeroSeguro(produto.peso)}" aria-label="Peso em kg de ${escaparHTML(produto.nome)}">
                    ` : editando ? `
                        <div class="editar-quantidade-total">
                            <button type="button" data-acao-edicao="diminuir-quantidade" aria-label="Diminuir quantidade total">−</button>
                            <input type="number" min="0" step="1" inputmode="numeric" data-editar="quantidade-total"
                                value="${precoPrincipal.quantidade}" aria-label="Quantidade principal de ${escaparHTML(produto.nome)}">
                            <button type="button" data-acao-edicao="aumentar-quantidade" aria-label="Aumentar quantidade total">+</button>
                        </div>
                    ` : `<strong data-total-quantidade>${formatarQuantidade(resumo.quantidadeTotal)}${porPeso ? " kg" : ""}</strong>`}
                </div>
                <div class="metrica-produto metrica-total">
                    <span>Total</span>
                    <strong data-total-produto>${formatarMoeda(resumo.total)}</strong>
                </div>
                <button type="button" class="editar-produto" data-acao="editar"
                    aria-expanded="${editando}" aria-label="${editando ? "Fechar edição de" : "Editar"} ${escaparHTML(produto.nome)}">✎</button>
            </header>

            ${editando ? `
                <section class="editar-produto-painel" aria-label="Editar produto">
                    <label><span>Nome do produto</span><input type="text" data-editar="nome" maxlength="100" value="${escaparHTML(produto.nome)}"></label>
                    <label><span>Categoria</span><select data-editar="categoria">${montarOpcoesCategoria(produto.categoria)}</select></label>
                    <label class="editar-produto-medida">
                        <span>Forma de compra</span>
                        <select data-editar="medida" ${regraMedida.tipo === "fixa" ? "disabled" : ""}>
                            <option value="unidade" ${porPeso ? "" : "selected"}>Unidade</option>
                            <option value="kg" ${porPeso ? "selected" : ""}>Kg</option>
                        </select>
                        <small>${escaparHTML(regraMedida.motivo)}</small>
                    </label>
                    <label><span data-rotulo-valor-medida>${porPeso ? "Valor do kg (R$)" : "Valor unitário (R$)"}</span><input class="editar-valor-unitario" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                        data-editar="valor-unitario" value="${precoPrincipal.valor.toFixed(2)}"
                        aria-label="Valor unitário de ${escaparHTML(produto.nome)}"></label>
                    <div class="editar-produto-acoes">
                        <button type="button" class="btn btn-primary" data-acao="salvar-edicao">Salvar alterações</button>
                        <button type="button" class="btn btn-secondary" data-acao="cancelar-edicao">Cancelar</button>
                        <button type="button" class="btn btn-secondary" data-acao="abrir-precos" ${porPeso ? "hidden" : ""}>+ Adicionar preço</button>
                        <button type="button" class="btn btn-danger" data-acao="excluir">Excluir produto</button>
                    </div>
                </section>
            ` : ""}

            ${editando || aberto ? `
                <section id="precos-${escaparHTML(produto.id)}" class="precos-produto"
                    ${aberto && !porPeso ? "" : "hidden"} aria-label="Preços adicionais de ${escaparHTML(produto.nome)}">
                    <div class="precos-produto-topo"><h4>Preços adicionais</h4><button type="button" data-acao="adicionar-preco">+ Outro preço</button></div>
                    <div class="precos-cabecalho" aria-hidden="true"><span>Valor (R$)</span><span>Quantidade</span><span>Subtotal (R$)</span><span></span></div>
                    <div class="precos-lista">${precosAdicionais.map((preco, indice) => montarLinhaPreco(preco, indice + 1, produto.nome)).join("")}</div>
                </section>
            ` : ""}
        </article>
    `;

}


function atualizarResumoVisualProduto(elemento) {

    const linhas = [...elemento.querySelectorAll(".preco-cadastrado")];
    const campoQuantidadeTotal = elemento.querySelector('[data-editar="quantidade-total"]');
    const campoPeso = elemento.querySelector('[data-editar="peso"]');
    const campoValorUnitario = elemento.querySelector('[data-editar="valor-unitario"]');
    const porPeso = elemento.dataset.porPeso === "true";
    let quantidadeTotal = Math.max(0, numeroSeguro(
        porPeso ? campoPeso?.value : campoQuantidadeTotal?.value
    ));
    let total = quantidadeTotal * Math.max(0, numeroSeguro(campoValorUnitario?.value));

    linhas.forEach(linha => {
        const valor = Math.max(0, numeroSeguro(linha.querySelector('[data-campo-preco="valor"]')?.value));
        const quantidade = Math.max(0, numeroSeguro(linha.querySelector("[data-quantidade-preco]")?.textContent));
        const subtotal = valor * quantidade;
        quantidadeTotal += quantidade;
        total += subtotal;
        const subtotalElemento = linha.querySelector("[data-subtotal-preco]");
        if (subtotalElemento) subtotalElemento.textContent = formatarMoeda(subtotal);
    });

    const atualizar = (seletor, valor) => {
        const alvo = elemento.querySelector(seletor);
        if (alvo) alvo.textContent = valor;
    };
    if (!campoQuantidadeTotal && !campoPeso) {
        atualizar("[data-total-quantidade]", `${formatarQuantidade(quantidadeTotal)}${porPeso ? " kg" : ""}`);
    }
    atualizar("[data-total-produto]", formatarMoeda(total));

}


function sincronizarPrecosComResumoEditavel(elemento, produto) {

    const porPeso = elemento.dataset.porPeso === "true";
    const quantidade = porPeso
        ? obterPrecosProduto(produto)[0]?.quantidade
        : elemento.querySelector('[data-editar="quantidade-total"]')?.value;
    const valorUnitario = elemento.querySelector('[data-editar="valor-unitario"]')?.value;
    const precos = atualizarPrecoPrincipal(produto, quantidade, valorUnitario);
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

    atualizarResumoVisualProduto(elemento);

}


function configurarQuantidadeEditavel(elemento, produto) {

    const campoQuantidadeTotal = elemento.querySelector('[data-editar="quantidade-total"]');
    const campoPeso = elemento.querySelector('[data-editar="peso"]');

    elemento
        .querySelector('[data-acao-edicao="diminuir-quantidade"]')
        ?.addEventListener("click", () => {
            campoQuantidadeTotal.value = String(
                Math.max(0, Math.floor(numeroSeguro(campoQuantidadeTotal.value)) - 1)
            );
            sincronizarPrecosComResumoEditavel(elemento, produto || {});
        });

    elemento
        .querySelector('[data-acao-edicao="aumentar-quantidade"]')
        ?.addEventListener("click", () => {
            campoQuantidadeTotal.value = String(
                Math.max(0, Math.floor(numeroSeguro(campoQuantidadeTotal.value)) + 1)
            );
            sincronizarPrecosComResumoEditavel(elemento, produto || {});
        });

    campoQuantidadeTotal?.addEventListener("input", () => {
        campoQuantidadeTotal.value = String(
            Math.max(0, Math.floor(numeroSeguro(campoQuantidadeTotal.value)))
        );
        sincronizarPrecosComResumoEditavel(elemento, produto || {});
    });

    campoPeso?.addEventListener("input", () => {
        sincronizarPrecosComResumoEditavel(elemento, produto || {});
    });

}


function atualizarEdicaoPorMedida(elemento, produto, medida) {

    const porPeso = medida === MEDIDA_KG;
    const metrica = elemento.querySelector(".metrica-quantidade");
    const quantidadeAtual = numeroSeguro(
        elemento.querySelector('[data-editar="quantidade-total"]')?.value
        ?? elemento.querySelector('[data-editar="peso"]')?.value
    );
    const quantidadeInicial = quantidadeAtual || (
        porPeso
            ? numeroSeguro(produto?.peso)
            : numeroSeguro(obterPrecosProduto(produto || {})[0]?.quantidade)
    );

    elemento.dataset.porPeso = String(porPeso);

    if (metrica) {
        metrica.innerHTML = porPeso
            ? `
                <span>Peso (kg)</span>
                <input class="editar-peso-total" type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*"
                    data-editar="peso" value="${quantidadeInicial}" aria-label="Peso em kg de ${escaparHTML(produto?.nome)}">
            `
            : `
                <span>Qtd. total</span>
                <div class="editar-quantidade-total">
                    <button type="button" data-acao-edicao="diminuir-quantidade" aria-label="Diminuir quantidade total">−</button>
                    <input type="number" min="0" step="1" inputmode="numeric" data-editar="quantidade-total"
                        value="${Math.floor(quantidadeInicial)}" aria-label="Quantidade principal de ${escaparHTML(produto?.nome)}">
                    <button type="button" data-acao-edicao="aumentar-quantidade" aria-label="Aumentar quantidade total">+</button>
                </div>
            `;
    }

    const rotuloValor = elemento.querySelector("[data-rotulo-valor-medida]");
    if (rotuloValor) {
        rotuloValor.textContent = porPeso
            ? "Valor do kg (R$)"
            : "Valor unitário (R$)";
    }

    const botaoAdicionarPreco = elemento.querySelector('[data-acao="abrir-precos"]');
    if (botaoAdicionarPreco) {
        botaoAdicionarPreco.hidden = porPeso;
    }

    if (porPeso) {
        const painelPrecos = elemento.querySelector(".precos-produto");
        if (painelPrecos) painelPrecos.hidden = true;
    }

    configurarQuantidadeEditavel(elemento, produto);
    sincronizarPrecosComResumoEditavel(elemento, produto || {});

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

    const categoria = elemento.querySelector('[data-editar="categoria"]')?.value;
    const regraMedida = obterRegraMedida(nome);
    const medidaSelecionada = elemento.querySelector('[data-editar="medida"]')?.value;
    const medida = regraMedida.medida || (
        [MEDIDA_KG, "unidade"].includes(medidaSelecionada)
            ? medidaSelecionada
            : normalizarMedidaProduto({ ...produto, categoria })
    );
    const porPeso = medida === MEDIDA_KG;
    let quantidadeTotal = Math.max(
        0,
        porPeso
            ? numeroSeguro(obterPrecosProduto(produto || {})[0]?.quantidade)
            : Math.floor(numeroSeguro(elemento.querySelector('[data-editar="quantidade-total"]')?.value))
    );
    const valorUnitario = Math.max(
        0,
        numeroSeguro(elemento.querySelector('[data-editar="valor-unitario"]')?.value)
    );

    return {
        nome,
        categoria,
        medida,
        peso: porPeso
            ? Math.max(0, numeroSeguro(elemento.querySelector('[data-editar="peso"]')?.value))
            : 0,
        precos: atualizarPrecoPrincipal(produto || {}, quantidadeTotal, valorUnitario)
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

    animarProdutosNaLista(lista);


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
                    if (produtosEmEdicao.has(String(id))) {
                        produtosEmEdicao.delete(String(id));
                    } else {
                        produtosEmEdicao.add(String(id));
                    }
                    precosAbertos.delete(String(id));
                    renderizarProdutos(produtos, acoes);
                });

            elemento
                .querySelector('[data-acao="alternar-precos"]')
                ?.addEventListener("click", () => {
                    if (precosAbertos.has(String(id))) {
                        precosAbertos.delete(String(id));
                    } else {
                        precosAbertos.add(String(id));
                    }
                    renderizarProdutos(produtos, acoes);
                });

            elemento
                .querySelector('[data-acao="abrir-precos"]')
                ?.addEventListener("click", () => {
                    const alteracoes = obterAlteracoesDaEdicao(elemento, produtoAtual);
                    if (!alteracoes) return;
                    precosAbertos.add(String(id));
                    if (acoes.aoAbrirNovoPreco) {
                        acoes.aoAbrirNovoPreco(id, alteracoes);
                        return;
                    }
                    sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
                    const painelPrecos = elemento.querySelector(".precos-produto");
                    if (painelPrecos) painelPrecos.hidden = false;
                });

            const campoValorUnitario = elemento.querySelector('[data-editar="valor-unitario"]');
            const campoMedida = elemento.querySelector('[data-editar="medida"]');

            campoValorUnitario?.addEventListener("input", () => {
                sincronizarPrecosComResumoEditavel(elemento, produtoAtual || {});
            });

            campoMedida?.addEventListener("change", evento => {
                atualizarEdicaoPorMedida(
                    elemento,
                    produtoAtual || {},
                    evento.target.value
                );
            });

            configurarQuantidadeEditavel(elemento, produtoAtual || {});

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
                    acoes.aoExcluir?.(id, elemento)
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
    if (ehHortifruti(produto)) {
        const peso = Math.max(0, numeroSeguro(produto.peso));
        const valorKg = Math.max(0, numeroSeguro(precos[0]?.valor));
        return {
            precos,
            quantidadeTotal: peso,
            total: valorKg * peso,
            media: valorKg
        };
    }
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
