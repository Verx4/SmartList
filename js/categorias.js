/*
 * Categorias disponíveis no sistema.
 *
 * Este arquivo centraliza as categorias para que
 * produtos, formulários e filtros utilizem os
 * mesmos nomes.
 */


export const CATEGORIA_AUTOMATICA = "automatico";

export const CATEGORIA_HORTIFRUTI =
    "🍎 Hortifruti";

export const CATEGORIA_OUTROS =
    "📦 Outros";


export const CATEGORIAS = [

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


/*
 * Remove acentos e transforma o texto em minúsculo.
 *
 * Exemplo:
 * "Sabão em Pó" vira "sabao em po".
 */

function normalizarTexto(valor) {

    return String(valor || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

}


/*
 * Retorna uma cópia da lista de categorias.
 */

export function listarCategorias() {

    return [...CATEGORIAS];

}


/*
 * Confere se uma categoria existe.
 */

export function categoriaExiste(categoria) {

    const categoriaNormalizada =
        normalizarTexto(categoria);

    return CATEGORIAS.some(
        item =>
            normalizarTexto(item) ===
            categoriaNormalizada
    );

}


/*
 * Verifica se o produto pertence ao Hortifruti.
 */

export function categoriaEhHortifruti(categoria) {

    return normalizarTexto(categoria)
        .includes("hortifruti");

}


/*
 * Recebe uma categoria e retorna o nome correto.
 *
 * Caso a categoria não exista, retorna "Outros".
 */

export function normalizarCategoria(categoria) {

    const categoriaNormalizada =
        normalizarTexto(categoria);

    if (
        !categoriaNormalizada ||
        categoriaNormalizada === "automatico"
    ) {

        return CATEGORIA_OUTROS;

    }

    const encontrada =
        CATEGORIAS.find(item => {

            const itemNormalizado =
                normalizarTexto(item);

            return (
                itemNormalizado ===
                    categoriaNormalizada ||

                itemNormalizado.includes(
                    categoriaNormalizada
                ) ||

                categoriaNormalizada.includes(
                    itemNormalizado
                )
            );

        });

    return encontrada || CATEGORIA_OUTROS;

}


/*
 * Identifica automaticamente a categoria
 * utilizando o nome do produto.
 */

export function identificarCategoria(nomeProduto) {

    const nome =
        normalizarTexto(nomeProduto);


    if (!nome) {

        return CATEGORIA_OUTROS;

    }


    const regras = [

        {

            categoria: "🥛 Laticínios",

            palavras: [

                "leite",
                "queijo",
                "iogurte",
                "manteiga",
                "margarina",
                "requeijao",
                "creme de leite",
                "leite condensado",
                "nata"

            ]

        },

        {

            categoria: "🥩 Carnes",

            palavras: [

                "carne",
                "frango",
                "peixe",
                "bife",
                "costela",
                "linguica",
                "presunto",
                "mortadela",
                "bacon",
                "pernil",
                "file",
                "patinho",
                "picanha"

            ]

        },

        {

            categoria: CATEGORIA_HORTIFRUTI,

            palavras: [

                "banana",
                "maca",
                "laranja",
                "mamao",
                "melancia",
                "uva",
                "morango",
                "abacaxi",
                "limao",
                "tomate",
                "batata",
                "cebola",
                "alho",
                "alface",
                "cenoura",
                "beterraba",
                "repolho",
                "pepino",
                "abobora",
                "mandioca",
                "verdura",
                "legume",
                "fruta"

            ]

        },

        {

            categoria: "🍞 Padaria",

            palavras: [

                "pao",
                "bolo",
                "torrada",
                "biscoito de polvilho",
                "croissant",
                "sonho",
                "rosca"

            ]

        },

        {

            categoria: "🥤 Bebidas",

            palavras: [

                "agua",
                "suco",
                "refrigerante",
                "cerveja",
                "vinho",
                "energetico",
                "isotonico",
                "cha gelado",
                "bebida"

            ]

        },

        {

            categoria: "🍚 Mercearia",

            palavras: [

                "arroz",
                "feijao",
                "macarrao",
                "farinha",
                "acucar",
                "cafe",
                "oleo",
                "azeite",
                "sal",
                "milho",
                "grao de bico",
                "lentilha",
                "aveia"

            ]

        },

        {

            categoria: "🍪 Doces e Snacks",

            palavras: [

                "chocolate",
                "bombom",
                "bala",
                "doce",
                "sorvete",
                "biscoito",
                "bolacha",
                "salgadinho",
                "pipoca",
                "barra de cereal",
                "snack"

            ]

        },

        {

            categoria: "🧼 Limpeza",

            palavras: [

                "detergente",
                "desinfetante",
                "agua sanitaria",
                "sabao em po",
                "amaciante",
                "limpador",
                "esponja",
                "pano de chao",
                "saco de lixo",
                "alcool",
                "lustra moveis"

            ]

        },

        {

            categoria: "🪥 Higiene",

            palavras: [

                "shampoo",
                "condicionador",
                "sabonete",
                "desodorante",
                "pasta de dente",
                "creme dental",
                "escova de dente",
                "papel higienico",
                "fio dental",
                "absorvente",
                "fralda",
                "barbeador"

            ]

        },

        {

            categoria: "🐶 Pet",

            palavras: [

                "racao",
                "petisco",
                "areia para gato",
                "tapete higienico",
                "coleira",
                "gato",
                "cachorro",
                "pet"

            ]

        },

        {

            categoria: "💊 Farmácia",

            palavras: [

                "remedio",
                "medicamento",
                "vitamina",
                "analgesico",
                "antialergico",
                "curativo",
                "algodao",
                "termometro",
                "farmacia"

            ]

        },

        {

            categoria: "🥫 Enlatados",

            palavras: [

                "enlatado",
                "sardinha",
                "atum",
                "ervilha em lata",
                "milho em lata",
                "molho de tomate",
                "extrato de tomate",
                "palmito",
                "azeitona"

            ]

        },

        {

            categoria: "❄️ Congelados",

            palavras: [

                "congelado",
                "pizza",
                "lasanha",
                "hamburguer",
                "nugget",
                "batata congelada",
                "polpa de fruta"

            ]

        },

        {

            categoria: "🌶️ Temperos",

            palavras: [

                "tempero",
                "pimenta",
                "colorau",
                "oregano",
                "cominho",
                "canela",
                "acafrao",
                "paprica",
                "caldo",
                "coentro"

            ]

        }

    ];


    const regraEncontrada =
        regras.find(regra =>

            regra.palavras.some(
                palavra =>
                    nome.includes(
                        normalizarTexto(palavra)
                    )
            )

        );


    return regraEncontrada?.categoria ||
        CATEGORIA_OUTROS;

}


/*
 * Nome alternativo para manter compatibilidade
 * com códigos anteriores.
 */

export const detectarCategoria =
    identificarCategoria;

export const descobrirCategoria =
    identificarCategoria;


/*
 * Monta as opções HTML das categorias.
 *
 * Essa função pode ser usada em formulários
 * e campos select.
 */

export function montarOpcoesCategorias(
    categoriaSelecionada = ""
) {

    return CATEGORIAS.map(categoria => {

        const selecionada =
            categoria === categoriaSelecionada
                ? "selected"
                : "";

        return `
            <option
                value="${categoria}"
                ${selecionada}
            >
                ${categoria}
            </option>
        `;

    }).join("");

}