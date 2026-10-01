/*
 * Categorias e regras usadas pela classificação automática.
 *
 * A ordem do seletor continua centralizada aqui. Já a classificação usa
 * exceções e expressões completas antes de produtos genéricos, evitando que
 * uma palavra curta vença uma descrição mais específica.
 */

export const CATEGORIA_AUTOMATICA = "automatico";
export const CATEGORIA_HORTIFRUTI = "🍎 Hortifruti";
export const CATEGORIA_OUTROS = "📦 Outros";

export const CATEGORIAS = [
    "🥛 Laticínios",
    "🥚 Ovos",
    "🥩 Carnes bovinas",
    "🐖 Carnes suínas",
    "🍗 Aves",
    "🐟 Peixes e Frutos do Mar",
    CATEGORIA_HORTIFRUTI,
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
    CATEGORIA_OUTROS
];

/*
 * Exceções explícitas têm prioridade sobre o dicionário geral. As expressões
 * são comparadas como palavras completas, nunca como pedaços inseguros.
 */
export const EXCECOES_CATEGORIZACAO = [
    { categoria: "❄️ Congelados", termos: ["pão de queijo", "nugget", "nuggets", "lasanha congelada"] },
    { categoria: "🍚 Mercearia", termos: ["chocolate em pó", "papel filme", "filme plástico", "margarina", "manteiga"] },
    { categoria: "🍚 Mercearia", termos: ["palito de dente", "palitos de dente", "papel toalha", "papel-toalha"] },
    { categoria: "🥚 Ovos", termos: ["ovo de galinha", "ovos de galinha", "ovo de codorna", "ovos de codorna", "ovo caipira", "ovos caipiras"] },
    { categoria: "🌾 Grãos", termos: ["ervilha seca"] },
    { categoria: "🥫 Enlatados e Conservas", termos: ["atum em lata", "atum enlatado", "sardinha em lata", "sardinha enlatada"] },
    { categoria: CATEGORIA_HORTIFRUTI, termos: ["pimentão", "coentro"] },
    { categoria: "🥛 Laticínios", termos: ["cream cheese", "cream-cheese"] }
];

/*
 * Dicionário extensível. Expressões com mais palavras recebem prioridade
 * automática sobre termos curtos, independentemente da ordem das categorias.
 */
export const REGRAS_CATEGORIZACAO = [
    {
        categoria: "🥛 Laticínios",
        termos: [
            "leite integral", "leite desnatado", "leite semidesnatado",
            "leite zero lactose", "leite em pó", "leite fermentado",
            "queijo coalho", "queijo mussarela", "queijo muçarela",
            "queijo prato", "queijo minas", "queijo parmesão",
            "queijo provolone", "queijo cheddar", "iogurte natural",
            "iogurte grego", "bebida láctea", "creme de leite",
            "leite condensado", "cream cheese", "requeijão", "ricota",
            "cottage", "gorgonzola", "mussarela", "muçarela", "parmesão",
            "provolone", "leite", "queijo", "iogurte", "nata"
        ]
    },
    {
        categoria: "🥚 Ovos",
        termos: [
            "ovo branco", "ovos brancos", "ovo vermelho", "ovos vermelhos",
            "ovo orgânico", "ovos orgânicos", "ovo", "ovos"
        ]
    },
    {
        categoria: "🥩 Carnes bovinas",
        termos: [
            "carne bovina", "carne moída", "carne seca", "carne de sol",
            "assado de tira", "bife ancho", "bife de chorizo", "capa de filé",
            "filé de costela", "filé mignon", "contra filé", "contrafilé",
            "costela bovina", "coxão mole", "coxão duro", "fígado bovino",
            "língua bovina", "ponta de agulha", "peito bovino", "t bone",
            "tomahawk", "carne", "bife", "picanha", "alcatra", "acém",
            "patinho", "maminha", "fraldinha", "cupim", "lagarto", "paleta",
            "músculo", "ossobuco", "charque", "rabada", "mocotó", "matambre",
            "bananinha", "aranha", "brisket", "chuleta", "vazio"
        ]
    },
    {
        categoria: "🐖 Carnes suínas",
        termos: [
            "carne suína", "carne de porco", "costela suína", "filé mignon suíno",
            "lombo suíno", "bisteca suína", "picanha suína", "pernil suíno",
            "copa lombo", "copa-lombo", "joelho de porco", "pé de porco",
            "orelha de porco", "rabo de porco", "barriga de porco",
            "linguiça toscana", "linguiça calabresa", "linguiça suína",
            "leitão", "carré", "panceta", "pernil", "lombo", "bisteca",
            "toucinho", "bacon", "linguiça", "calabresa", "paio",
            "presunto", "salame", "mortadela", "pepperoni"
        ]
    },
    {
        categoria: "🍗 Aves",
        termos: [
            "peito de frango", "filé de frango", "filé de peito",
            "coxa e sobrecoxa", "meio da asa", "coração de frango",
            "fígado de frango", "pé de frango", "frango inteiro",
            "frango a passarinho", "frango desossado", "frango moído",
            "peito de peru", "peru inteiro", "galinha caipira",
            "frango", "coxa", "sobrecoxa", "asa", "asinha", "drumette",
            "tulipa", "moela", "galinha", "peru", "pato", "marreco",
            "codorna", "chester", "faisão"
        ]
    },
    {
        categoria: "🐟 Peixes e Frutos do Mar",
        termos: [
            "filé de peixe", "atum fresco", "sardinha fresca", "peixe",
            "tilápia", "salmão", "merluza", "pescada", "dourado", "bacalhau",
            "corvina", "robalo", "linguado", "tambaqui", "tucunaré", "traíra",
            "cavala", "anchova", "atum", "sardinha", "camarão", "lula", "polvo",
            "mexilhão", "marisco", "ostra", "siri", "caranguejo", "lagosta"
        ]
    },
    {
        categoria: CATEGORIA_HORTIFRUTI,
        termos: [
            "banana prata", "banana nanica", "banana da terra", "tomate cereja",
            "couve-flor", "batata-doce", "batata inglesa", "cebola roxa",
            "alho-poró", "coentro fresco", "maço de coentro", "repolho roxo",
            "banana", "maçã", "pera", "laranja", "tangerina", "mexerica", "limão",
            "mamão", "manga", "melancia", "melão", "uva", "morango", "abacaxi",
            "goiaba", "maracujá", "acerola", "kiwi", "ameixa", "pêssego",
            "nectarina", "coco", "abacate", "caqui", "pitaya", "caju", "alface",
            "rúcula", "couve", "espinafre", "acelga", "agrião", "chicória",
            "escarola", "repolho", "brócolis", "salsa", "salsinha", "cebolinha",
            "coentro", "tomate", "pimentão", "pepino", "cenoura", "beterraba",
            "abóbora", "abobrinha", "chuchu", "berinjela", "quiabo", "jiló",
            "vagem", "batata", "inhame", "macaxeira", "mandioca", "mandioquinha",
            "aipim", "cebola", "alho", "rabanete", "nabo", "verdura", "legume",
            "fruta"
        ]
    },
    {
        categoria: "🍞 Padaria",
        termos: [
            "pão francês", "pão de forma", "pão integral", "pão australiano",
            "pão italiano", "pão sírio", "pão brioche", "pão de leite", "pão doce",
            "biscoito de polvilho", "bolo de aniversário", "pão", "pães", "baguete",
            "bisnaguinha", "croissant", "torrada", "bolo", "sonho", "rosca", "broa",
            "cuca"
        ]
    },
    {
        categoria: "⚡ Energéticos",
        termos: [
            "tnt energy", "flying horse", "fusion energy", "nitro energy",
            "vibe energy", "red bull", "energético", "monster", "baly", "burn"
        ]
    },
    {
        categoria: "🍺 Bebidas Alcoólicas",
        termos: [
            "cerveja puro malte", "cerveja sem álcool", "vinho tinto", "vinho branco",
            "vinho rosé", "smirnoff ice", "xeque mate", "cerveja", "chope", "vinho",
            "espumante", "frisante", "whisky", "whiskey", "vodka", "gin", "rum",
            "tequila", "cachaça", "aguardente", "conhaque", "licor", "vermute",
            "beats", "corote"
        ]
    },
    {
        categoria: "🥤 Bebidas",
        termos: [
            "água mineral", "água com gás", "água de coco", "suco integral",
            "chá gelado", "água tônica", "bebida não alcoólica", "água",
            "refrigerante", "suco", "néctar", "refresco", "isotônico", "bebida"
        ]
    },
    {
        categoria: "🌾 Grãos",
        termos: [
            "arroz branco", "arroz integral", "arroz parboilizado", "arroz arbóreo",
            "feijão carioca", "feijão preto", "feijão branco", "feijão fradinho",
            "grão-de-bico", "ervilha seca", "aveia em grãos", "arroz", "feijão",
            "lentilha", "soja", "quinoa", "chia", "linhaça"
        ]
    },
    {
        categoria: "🍚 Mercearia",
        termos: [
            "massa para preparo", "massa para lasanha", "farinha de trigo",
            "farinha de mandioca", "farinha de milho", "farinha de rosca",
            "goma de tapioca", "açúcar cristal", "açúcar refinado", "açúcar demerara",
            "açúcar mascavo", "café solúvel", "óleo de soja", "óleo de milho",
            "molho inglês", "molho barbecue", "extrato de tomate", "amido de milho",
            "manteiga com sal", "manteiga sem sal", "manteiga de garrafa",
            "creme vegetal", "papel filme", "filme plástico", "cacau em pó",
            "chocolate em pó", "leite de coco", "coco ralado", "macarrão", "espaguete",
            "penne", "parafuso", "talharim", "massa", "lasanha", "farinha", "fubá",
            "flocão", "tapioca", "polvilho", "açúcar", "adoçante", "café", "cappuccino",
            "óleo", "azeite", "vinagre", "molho", "extrato", "ketchup", "catchup",
            "mostarda", "maionese", "shoyu", "fermento", "cuscuz", "granola",
            "margarina", "manteiga", "cacau", "achocolatado", "palito de dente",
            "palitos de dente", "papel toalha", "papel-toalha"
        ]
    },
    {
        categoria: "🍪 Doces e Snacks",
        termos: [
            "goma de mascar", "pé de moleque", "doce de leite", "barra de cereal",
            "barra de proteína", "batata chips", "chocolate", "bombom", "trufa", "bala",
            "chiclete", "pirulito", "doce", "paçoca", "cocada", "goiabada", "geleia",
            "biscoito", "bolacha", "cookie", "wafer", "salgadinho", "chips", "pipoca",
            "snack", "amendoim", "castanha", "sorvete"
        ]
    },
    {
        categoria: "🧼 Limpeza",
        termos: [
            "detergente líquido", "água sanitária", "sabão em pó", "sabão líquido",
            "sabão em barra", "lava-roupas", "limpa-vidros", "limpador multiuso",
            "limpa piso", "esponja de aço", "palha de aço", "pano de chão",
            "pano multiuso", "saco de lixo", "lustra-móveis", "detergente", "desinfetante",
            "alvejante", "amaciante", "desengordurante", "limpador", "esponja", "álcool",
            "inseticida"
        ]
    },
    {
        categoria: "🪥 Higiene",
        termos: [
            "sabonete líquido", "pasta de dente", "creme dental", "escova de dente",
            "fio dental", "enxaguante bucal", "papel higiênico", "protetor diário",
            "lenço umedecido", "aparelho de barbear", "espuma de barbear",
            "creme para cabelo", "hidratante corporal", "shampoo", "condicionador",
            "sabonete", "desodorante", "absorvente", "fralda", "cotonete", "barbeador"
        ]
    },
    {
        categoria: "🐶 Pet",
        termos: [
            "ração para cachorro", "ração para gato", "sachê para cachorro",
            "sachê para gato", "areia para gato", "tapete higiênico", "brinquedo pet",
            "shampoo pet", "ração", "petisco", "coleira", "cachorro", "gato", "pet"
        ]
    },
    {
        categoria: "💊 Farmácia",
        termos: [
            "suplemento vitamínico", "água oxigenada", "remédio", "medicamento",
            "analgésico", "antialérgico", "antitérmico", "vitamina", "curativo",
            "bandagem", "gaze", "algodão", "antisséptico", "termômetro", "farmácia"
        ]
    },
    {
        categoria: "🥫 Enlatados e Conservas",
        termos: [
            "milho verde", "milho em lata", "ervilha em lata", "seleta de legumes",
            "atum em lata", "atum enlatado", "sardinha em lata", "sardinha enlatada",
            "cogumelo em conserva", "pepino em conserva", "molho de tomate",
            "extrato de tomate", "enlatado", "conserva", "milho", "ervilha", "palmito",
            "azeitona", "champignon"
        ]
    },
    {
        categoria: "❄️ Congelados",
        termos: [
            "pizza congelada", "pão de queijo", "batata congelada", "batata pré-frita",
            "polpa de fruta", "lasanha congelada", "escondidinho congelado",
            "almôndega congelada", "legumes congelados", "açaí congelado",
            "refeição congelada", "congelado", "pizza", "hambúrguer", "nugget", "nuggets",
            "empanado", "steak"
        ]
    },
    {
        categoria: "🌶️ Temperos",
        termos: [
            "pimenta-do-reino", "pimenta calabresa", "páprica doce", "páprica picante",
            "noz-moscada", "caldo de carne", "caldo de galinha", "caldo de legumes",
            "tempero pronto", "tempero", "pimenta", "colorau", "orégano", "cominho",
            "canela", "açafrão", "cúrcuma", "páprica", "cravo", "louro", "sal"
        ]
    },
    {
        categoria: "🍽️ Descartáveis",
        termos: [
            "papel-alumínio", "papel-manteiga", "copo descartável", "prato descartável",
            "talher descartável", "garfo descartável", "faca descartável",
            "colher descartável", "pote descartável", "saco zip", "sacola plástica",
            "guardanapo", "canudo", "marmita"
        ]
    },
    {
        categoria: "🔌 Utilidades",
        termos: [
            "filtro de linha", "fita adesiva", "pilha", "bateria", "lâmpada", "extensão",
            "carvão", "acendedor", "gelo", "espeto", "fósforo", "isqueiro", "vela",
            "supercola", "cola", "barbante", "pregador", "organizador"
        ]
    }
];

function normalizarTexto(valor) {
    return String(valor || "")
        .trim()
        .toLocaleLowerCase("pt-BR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function singularSeguro(token) {
    return token.length > 3 && token.endsWith("s")
        ? token.slice(0, -1)
        : token;
}

function tokensCorrespondem(tokenNome, tokenTermo) {
    return tokenNome === tokenTermo
        || singularSeguro(tokenNome) === singularSeguro(tokenTermo);
}

function localizarTermo(nomeNormalizado, termo) {
    const tokensNome = nomeNormalizado.split(" ").filter(Boolean);
    const termoNormalizado = normalizarTexto(termo);
    const tokensTermo = termoNormalizado.split(" ").filter(Boolean);

    if (!tokensTermo.length || tokensTermo.length > tokensNome.length) {
        return null;
    }

    for (let inicio = 0; inicio <= tokensNome.length - tokensTermo.length; inicio += 1) {
        const corresponde = tokensTermo.every(
            (token, indice) => tokensCorrespondem(tokensNome[inicio + indice], token)
        );

        if (corresponde) {
            return {
                inicio,
                quantidadeTokens: tokensTermo.length,
                tamanho: termoNormalizado.length
            };
        }
    }

    return null;
}

function melhorCorrespondencia(nomeNormalizado, regras) {
    const encontradas = [];

    regras.forEach((regra, prioridadeCategoria) => {
        regra.termos.forEach(termo => {
            const local = localizarTermo(nomeNormalizado, termo);
            if (local) {
                encontradas.push({
                    categoria: regra.categoria,
                    prioridadeCategoria,
                    ...local
                });
            }
        });
    });

    encontradas.sort((a, b) =>
        b.quantidadeTokens - a.quantidadeTokens
        || b.tamanho - a.tamanho
        || a.inicio - b.inicio
        || a.prioridadeCategoria - b.prioridadeCategoria
    );

    return encontradas[0]?.categoria || null;
}

function normalizarMedida(medida) {
    const valor = normalizarTexto(
        typeof medida === "object"
            ? medida?.medida || medida?.unidade || medida?.tipoMedida
            : medida
    );

    if (["kg", "quilo", "quilos", "quilograma", "quilogramas"].includes(valor)) {
        return "kg";
    }

    if (["un", "und", "unid", "unidade", "unidades"].includes(valor)) {
        return "unidade";
    }

    return "";
}

function aplicarRegraDaUnidade(categoria, medida) {
    const categoriasPorPeso = new Set([
        "🥩 Carnes bovinas",
        "🐖 Carnes suínas",
        "🐟 Peixes e Frutos do Mar"
    ]);

    return categoriasPorPeso.has(categoria) && normalizarMedida(medida) === "unidade"
        ? "❄️ Congelados"
        : categoria;
}

export function listarCategorias() {
    return [...CATEGORIAS];
}

export function categoriaExiste(categoria) {
    const categoriaNormalizada = normalizarTexto(categoria);
    return CATEGORIAS.some(
        item => normalizarTexto(item) === categoriaNormalizada
    );
}

export const categoriaValida = categoriaExiste;

export function categoriaEhHortifruti(categoria) {
    return normalizarTexto(categoria).includes("hortifruti");
}

export function normalizarCategoria(categoria) {
    const categoriaNormalizada = normalizarTexto(categoria);

    // Mantém compatibilidade com listas criadas antes da divisão das carnes.
    if (categoriaNormalizada === normalizarTexto("🥩 Carnes")) {
        return "🥩 Carnes bovinas";
    }
    if (categoriaNormalizada === normalizarTexto("🍗 Frango")) {
        return "🍗 Aves";
    }

    if (!categoriaNormalizada || categoriaNormalizada === CATEGORIA_AUTOMATICA) {
        return CATEGORIA_OUTROS;
    }

    const encontrada = CATEGORIAS.find(item => {
        const itemNormalizado = normalizarTexto(item);
        return itemNormalizado === categoriaNormalizada
            || itemNormalizado.includes(categoriaNormalizada)
            || categoriaNormalizada.includes(itemNormalizado);
    });

    return encontrada || CATEGORIA_OUTROS;
}

export function identificarCategoria(nomeProduto, medida = "") {
    const nomeNormalizado = normalizarTexto(nomeProduto);

    if (!nomeNormalizado) {
        return CATEGORIA_OUTROS;
    }

    const excecao = melhorCorrespondencia(nomeNormalizado, EXCECOES_CATEGORIZACAO);
    if (excecao) {
        return aplicarRegraDaUnidade(excecao, medida);
    }

    const categoria = melhorCorrespondencia(nomeNormalizado, REGRAS_CATEGORIZACAO);
    return categoria
        ? aplicarRegraDaUnidade(categoria, medida)
        : CATEGORIA_OUTROS;
}

export function resolverCategoriaSelecionada(
    nomeProduto,
    categoriaSelecionada = CATEGORIA_AUTOMATICA,
    medida = ""
) {
    return normalizarTexto(categoriaSelecionada) === CATEGORIA_AUTOMATICA
        ? identificarCategoria(nomeProduto, medida)
        : normalizarCategoria(categoriaSelecionada);
}

export const detectarCategoria = identificarCategoria;
export const descobrirCategoria = identificarCategoria;

export function montarOpcoesCategorias(categoriaSelecionada = "") {
    return CATEGORIAS.map(categoria => {
        const selecionada = categoria === categoriaSelecionada
            ? "selected"
            : "";

        return `
            <option value="${categoria}" ${selecionada}>
                ${categoria}
            </option>
        `;
    }).join("");
}

