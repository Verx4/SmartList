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

    "🍗 Frango",

    "🐟 Peixes e Frutos do Mar",

    "🍎 Hortifruti",

    "🍞 Padaria",

    "🥤 Bebidas",

    "⚡ Energéticos",

    "🍺 Bebidas Alcoólicas",

    "🌾 Grãos",

    "🍚 Mercearia",

    "🍪 Doces e Snacks",

    "🧼 Limpeza",

    "🪥 Higiene",

    "🐶 Pet",

    "💊 Farmácia",

    "🥫 Enlatados e Conservas",

    "❄️ Congelados",

    "🌶️ Temperos",

    "🍽️ Descartáveis",

    "🔌 Utilidades",

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
                "bife",
                "costela",
                "linguica",
                "bacon",
                "pernil",
                "lombo",
                "calabresa",
                "carne seca",
                "charque",
                "patinho",
                "picanha",
                "alcatra",
                "acem",
                "maminha",
                "fraldinha",
                "cupim",
                "coxao",
                "lagarto",
                "paleta",
                "musculo",
                "ossobuco"

            ]

        },

        {

            categoria: "🍗 Frango",

            palavras: [

                "frango",
                "coxa",
                "sobrecoxa",
                "drumette",
                "tulipa",
                "coracao de frango",
                "moela",
                "figado de frango",
                "nugget"

            ]

        },

        {

            categoria: "🐟 Peixes e Frutos do Mar",

            palavras: [

                "peixe",
                "tilapia",
                "salmao",
                "merluza",
                "pescada",
                "dourado",
                "atum",
                "sardinha",
                "bacalhau",
                "camarao",
                "lula",
                "polvo",
                "mexilhao",
                "siri",
                "caranguejo"

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

            categoria: "⚡ Energéticos",

            palavras: [

                "energetico",
                "red bull",
                "monster",
                "tnt energy",
                "baly",
                "burn",
                "flying horse",
                "fusion energy",
                "nitro energy",
                "vibe energy"

            ]

        },

        {

            categoria: "🍺 Bebidas Alcoólicas",

            palavras: [

                "cerveja",
                "vinho",
                "espumante",
                "frisante",
                "whisky",
                "vodka",
                "gin",
                "rum",
                "tequila",
                "cachaca",
                "conhaque",
                "licor",
                "smirnoff ice",
                "beats",
                "corote",
                "xeque mate"

            ]

        },

        {

            categoria: "🥤 Bebidas",

            palavras: [

                "agua",
                "suco",
                "refrigerante",
                "isotonico",
                "cha gelado",
                "bebida"

            ]

        },

        {

            categoria: "🌾 Grãos",

            palavras: [

                "arroz",
                "feijao",
                "milho",
                "grao de bico",
                "lentilha",
                "ervilha seca",
                "soja",
                "quinoa",
                "chia",
                "linhaca",
                "aveia em graos"

            ]

        },

        {

            categoria: "🍚 Mercearia",

            palavras: [

                "macarrao",
                "lasanha",
                "massa para",
                "farinha",
                "fuba",
                "flocao",
                "tapioca",
                "polvilho",
                "acucar",
                "cafe",
                "oleo",
                "azeite",
                "vinagre",
                "molho",
                "extrato",
                "ketchup",
                "mostarda",
                "maionese",
                "shoyu",
                "fermento",
                "amido de milho",
                "cuscuz",
                "granola"

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

            categoria: "🥫 Enlatados e Conservas",

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

        },

        {

            categoria: "🍽️ Descartáveis",

            palavras: [

                "papel aluminio",
                "filme plastico",
                "papel manteiga",
                "guardanapo",
                "copo descartavel",
                "prato descartavel",
                "talher descartavel",
                "canudo",
                "marmita",
                "pote descartavel",
                "saco zip",
                "sacola plastica"

            ]

        },

        {

            categoria: "🔌 Utilidades",

            palavras: [

                "pilha",
                "bateria",
                "lampada",
                "extensao",
                "filtro de linha",
                "carvao",
                "acendedor",
                "gelo",
                "espeto",
                "fosforo",
                "isqueiro",
                "vela",
                "fita adesiva",
                "supercola",
                "barbante",
                "pregador",
                "organizador"

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
