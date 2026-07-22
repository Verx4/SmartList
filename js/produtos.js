const CHAVE_PRODUTOS = "produtos";
const CHAVE_LISTAS_SALVAS = "listasSalvas";
const CHAVE_LISTA_ATUAL = "listaAtualId";


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

        const listaAtual = obterListaAtualSalva();
        const espelho = lerJson(CHAVE_PRODUTOS, null);
        const produtosDaLista = listaAtual?.produtos || [];
        const dados = Array.isArray(espelho) && JSON.stringify(espelho) !== JSON.stringify(produtosDaLista)
            ? espelho.map(normalizarProduto)
            : produtosDaLista;

        if (dados !== produtosDaLista) {
            const { listas, idAtual } = carregarListas();
            const atual = listas.find(item => item.id === idAtual);
            if (atual) {
                atual.produtos = dados;
                atual.atualizadoEm = new Date().toISOString();
                gravarListas(listas, idAtual);
            }
        }
        localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(dados));

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

    const { listas, idAtual } = carregarListas();
    const atual = listas.find(item => item.id === idAtual);
    if (atual) {
        atual.produtos = lista;
        atual.mercado = textoSeguro(localStorage.getItem("mercadoAtual"));
        atual.atualizadoEm = new Date().toISOString();
        gravarListas(listas, idAtual);
    }

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


function nomeListaSeguro(valor, padrao = "Minha lista") {

    return textoSeguro(valor).slice(0, 80) || padrao;

}


function lerJson(chave, padrao) {

    try {

        const valor = JSON.parse(localStorage.getItem(chave));
        return valor ?? padrao;

    } catch {

        return padrao;

    }

}


function gravarListas(listas, idAtual) {

    localStorage.setItem(CHAVE_LISTAS_SALVAS, JSON.stringify(listas));
    localStorage.setItem(CHAVE_LISTA_ATUAL, String(idAtual));

}


function carregarListas() {

    let listas = lerJson(CHAVE_LISTAS_SALVAS, []);

    if (!Array.isArray(listas) || !listas.length) {

        const produtosAntigos = lerJson(CHAVE_PRODUTOS, []);
        const inicial = {
            id: criarId(),
            nome: "Minha lista",
            mercado: textoSeguro(localStorage.getItem("mercadoAtual")),
            produtos: Array.isArray(produtosAntigos)
                ? produtosAntigos.map(normalizarProduto)
                : [],
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };
        listas = [inicial];
        gravarListas(listas, inicial.id);

    }

    listas = listas.map(lista => ({
        id: String(lista.id || criarId()),
        nome: nomeListaSeguro(lista.nome),
        mercado: textoSeguro(lista.mercado),
        produtos: Array.isArray(lista.produtos)
            ? lista.produtos.map(normalizarProduto)
            : [],
        criadoEm: lista.criadoEm || new Date().toISOString(),
        atualizadoEm: lista.atualizadoEm || new Date().toISOString()
    }));

    let idAtual = String(localStorage.getItem(CHAVE_LISTA_ATUAL) || "");
    if (!listas.some(lista => lista.id === idAtual)) {
        idAtual = listas[0].id;
        gravarListas(listas, idAtual);
    }

    return { listas, idAtual };

}


export function listarListasSalvas() {

    const { listas, idAtual } = carregarListas();
    return listas.map(lista => ({
        ...lista,
        atual: lista.id === idAtual
    }));

}


export function obterListaAtualSalva() {

    const { listas, idAtual } = carregarListas();
    return listas.find(lista => lista.id === idAtual) || listas[0];

}


export function criarListaSalva(nome, opcoes = {}) {

    const { listas, idAtual } = carregarListas();
    const agora = new Date().toISOString();
    const novaLista = {
        id: criarId(),
        nome: nomeListaSeguro(nome, `Lista ${listas.length + 1}`),
        mercado: textoSeguro(opcoes.mercado),
        produtos: [],
        criadoEm: agora,
        atualizadoEm: agora
    };
    listas.push(novaLista);

    const deveAtivar = opcoes.ativar !== false;
    gravarListas(listas, deveAtivar ? novaLista.id : idAtual);
    if (deveAtivar) {
        localStorage.setItem(CHAVE_PRODUTOS, "[]");
        if (novaLista.mercado) localStorage.setItem("mercadoAtual", novaLista.mercado);
        else localStorage.removeItem("mercadoAtual");
    }

    return { ...novaLista, atual: deveAtivar };

}


export function selecionarListaSalva(id) {

    const { listas, idAtual } = carregarListas();
    const atual = listas.find(lista => lista.id === idAtual);
    if (atual) {
        atual.mercado = textoSeguro(localStorage.getItem("mercadoAtual"));
        atual.atualizadoEm = new Date().toISOString();
    }

    const escolhida = listas.find(lista => lista.id === String(id));
    if (!escolhida) return null;

    gravarListas(listas, escolhida.id);
    localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(escolhida.produtos));
    if (escolhida.mercado) localStorage.setItem("mercadoAtual", escolhida.mercado);
    else localStorage.removeItem("mercadoAtual");

    window.dispatchEvent(new CustomEvent("listaatualalterada", {
        detail: { lista: escolhida }
    }));
    return escolhida;

}
