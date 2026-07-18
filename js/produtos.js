const CHAVE_PRODUTOS = "produtos";


function criarId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }

    return `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

}


function textoSeguro(valor) {

    return String(valor || "")
        .trim()
        .replace(/\s+/g, " ");

}


function numeroSeguro(valor, padrao = 0) {

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : padrao;

}


function booleanoSeguro(valor) {

    return (
        valor === true ||
        valor === "true" ||
        valor === 1 ||
        valor === "1"
    );

}


export function normalizarProduto(produto = {}) {

    return {

        id: String(produto.id || criarId()),

        nome:
            textoSeguro(produto.nome) ||
            "Produto sem nome",

        categoria:
            textoSeguro(produto.categoria) ||
            "📦 Outros",

        preco: Math.max(
            0,
            numeroSeguro(produto.preco)
        ),

        quantidade: Math.max(
            1,
            Math.trunc(numeroSeguro(produto.quantidade, 1))
        ),

        peso: Math.max(
            0,
            numeroSeguro(produto.peso)
        ),

        supermercado: textoSeguro(
            produto.supermercado
        ),

        favorito: booleanoSeguro(
            produto.favorito
        ),

        ultimoPreco: Math.max(
            0,
            numeroSeguro(produto.ultimoPreco)
        ),

        ultimoSupermercado: textoSeguro(
            produto.ultimoSupermercado
        ),

        criadoEm:
            produto.criadoEm ||
            new Date().toISOString(),

        atualizadoEm:
            produto.atualizadoEm ||
            new Date().toISOString()

    };

}


export function listarProdutos() {

    try {

        const dados = JSON.parse(
            localStorage.getItem(CHAVE_PRODUTOS)
        );

        return Array.isArray(dados)
            ? dados.map(normalizarProduto)
            : [];

    } catch {

        return [];

    }

}


export function salvarProdutos(produtos = []) {

    const lista = produtos.map(normalizarProduto);

    localStorage.setItem(
        CHAVE_PRODUTOS,
        JSON.stringify(lista)
    );

    window.dispatchEvent(
        new CustomEvent("produtosalterados", {
            detail: {
                produtos: lista
            }
        })
    );

    return lista;

}


export function adicionarProduto(dados) {

    const produtos = listarProdutos();

    const produto = normalizarProduto({

        ...dados,
        id: criarId(),
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()

    });

    produtos.push(produto);

    salvarProdutos(produtos);

    return produto;

}


export function atualizarProduto(id, alteracoes = {}) {

    const produtos = listarProdutos();

    const indice = produtos.findIndex(
        produto => String(produto.id) === String(id)
    );

    if (indice < 0) {

        return null;

    }

    produtos[indice] = normalizarProduto({

        ...produtos[indice],
        ...alteracoes,
        id: produtos[indice].id,
        atualizadoEm: new Date().toISOString()

    });

    salvarProdutos(produtos);

    return produtos[indice];

}


export function removerProduto(id) {

    const produtos = listarProdutos();

    const novaLista = produtos.filter(
        produto => String(produto.id) !== String(id)
    );

    salvarProdutos(novaLista);

    return novaLista;

}


export function alterarQuantidade(id, variacao) {

    const produto = listarProdutos().find(
        item => String(item.id) === String(id)
    );

    if (!produto) {

        return null;

    }

    return atualizarProduto(id, {

        quantidade: Math.max(
            1,
            produto.quantidade + Number(variacao || 0)
        )

    });

}


export function atualizarPreco(id, preco) {

    return atualizarProduto(id, {

        preco: Math.max(
            0,
            numeroSeguro(preco)
        )

    });

}


export function atualizarPeso(id, peso) {

    return atualizarProduto(id, {

        peso: Math.max(
            0,
            numeroSeguro(peso)
        )

    });

}


export function alternarFavorito(id) {

    const produto = listarProdutos().find(
        item => String(item.id) === String(id)
    );

    if (!produto) {

        return null;

    }

    return atualizarProduto(id, {

        favorito: !produto.favorito

    });

}


export function aplicarSupermercadoAProdutos(
    supermercado,
    apenasSemMercado = false
) {

    const nome = textoSeguro(supermercado);

    if (!nome) {

        return listarProdutos();

    }

    const produtos = listarProdutos().map(produto => {

        if (
            apenasSemMercado &&
            produto.supermercado
        ) {

            return produto;

        }

        return normalizarProduto({

            ...produto,
            supermercado: nome,
            atualizadoEm: new Date().toISOString()

        });

    });

    return salvarProdutos(produtos);

}


export function filtrarProdutos(
    produtos,
    pesquisa = ""
) {

    const termo = textoSeguro(pesquisa)
        .toLocaleLowerCase("pt-BR");

    if (!termo) {

        return [...produtos];

    }

    return produtos.filter(produto => {

        const conteudo = [
            produto.nome,
            produto.categoria,
            produto.supermercado
        ]
            .join(" ")
            .toLocaleLowerCase("pt-BR");

        return conteudo.includes(termo);

    });

}


export function ordenarProdutos(
    produtos,
    ordenacao = "nome"
) {

    const lista = [...produtos];

    const comparadores = {

        nome: (a, b) =>
            a.nome.localeCompare(
                b.nome,
                "pt-BR"
            ),

        categoria: (a, b) =>
            a.categoria.localeCompare(
                b.categoria,
                "pt-BR"
            ),

        mercado: (a, b) =>
            a.supermercado.localeCompare(
                b.supermercado,
                "pt-BR"
            ),

        "menor-preco": (a, b) =>
            a.preco - b.preco,

        "maior-preco": (a, b) =>
            b.preco - a.preco,

        favoritos: (a, b) =>
            Number(b.favorito) -
            Number(a.favorito)

    };

    lista.sort(
        comparadores[ordenacao] ||
        comparadores.nome
    );

    return lista;

}


export function zerarPrecosDaLista() {

    const produtos = listarProdutos().map(produto =>
        normalizarProduto({

            ...produto,

            ultimoPreco:
                produto.preco > 0
                    ? produto.preco
                    : produto.ultimoPreco,

            ultimoSupermercado:
                produto.supermercado ||
                produto.ultimoSupermercado,

            preco: 0,

            peso: String(produto.categoria)
                .toLowerCase()
                .includes("hortifruti")
                ? 0
                : produto.peso,

            atualizadoEm: new Date().toISOString()

        })
    );

    return salvarProdutos(produtos);

}