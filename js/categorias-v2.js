const CATEGORIAS_SMART_LIST = [
  "🥬 Hortifruti",
  "🥩 Açougue",
  "🐟 Peixaria",
  "🧀 Frios e Laticínios",
  "🍞 Padaria",
  "🌾 Grãos",
  "☕ Mercearia",
  "🥫 Enlatados e Conservas",
  "❄️ Congelados",
  "🥤 Bebidas",
  "🍪 Doces e Snacks",
  "🌶️ Temperos",
  "🧼 Limpeza",
  "🪥 Higiene Pessoal",
  "👶 Bebê",
  "🐶 Pet",
  "💊 Farmácia",
  "🏠 Utilidades Domésticas",
  "📦 Outros"
];

const REGRAS_CATEGORIAS = [
  ["🥬 Hortifruti", [
    "abacate","abacaxi","abobora","abobrinha","acelga","acerola","agriao","alho fresco","alface","ameixa","banana","batata","berinjela","beterraba","brocolis","caqui","cara","cenoura","cebola","cebolinha","chuchu","coentro","coco verde","coco seco","couve","couve flor","espinafre","goiaba","gengibre","hortela","inhame","jilo","kiwi","laranja","limao","maca","mamao","mandioca","manga","manjericao","maracuja","maxixe","melancia","melao","milho verde","morango","nabo","pepino","pera","pimentao","pitaya","quiabo","rabanete","repolho","rucula","salsa","tangerina","tomate","uva","vagem","fruta","verdura","legume"
  ]],
  ["🥩 Açougue", [
    "acem","alcatra","asa de frango","bisteca","carne bovina","carne moida","carne suina","contrafile","costela","coxa de frango","coxao duro","coxao mole","coracao de frango","dobradinha","file mignon","figado","frango inteiro","linguica","mocoto","musculo","patinho","peito de frango","picanha","sobrecoxa","bife","charque","carne seca"
  ]],
  ["🐟 Peixaria", [
    "atum fresco","bacalhau","camarao","caranguejo","corvina","file de peixe","lula","marisco","merluza","ostra","peixe","pescada","polvo","salmao","sardinha fresca","siri","sururu","tilapia"
  ]],
  ["🧀 Frios e Laticínios", [
    "bebida lactea","coalhada","creme de leite","iogurte","leite","leite condensado","manteiga","margarina","mortadela","peito de peru","presunto","queijo","requeijao","salame","mussarela","parmesao"
  ]],
  ["🍞 Padaria", [
    "baguete","biscoito de padaria","bolo","croissant","pao","rosca","salgado","sonho","torrada","torta"
  ]],
  ["🌾 Grãos", [
    "amido de milho","arroz","aveia","canjica","ervilha seca","farinha de mandioca","farinha de trigo","feijao","flocao","fuba","grao de bico","lentilha","milho para pipoca","polvilho","tapioca"
  ]],
  ["☕ Mercearia", [
    "achocolatado","acucar","cafe","caldo","fermento","ketchup","macarrao","maionese","molho ingles","molho shoyu","mostarda","oleo","sal","sopa instantanea","vinagre","azeite"
  ]],
  ["🥫 Enlatados e Conservas", [
    "atum em lata","azeitona","cogumelo em conserva","ervilha em lata","extrato de tomate","milho em lata","molho de tomate","palmito","pepino em conserva","sardinha em lata","seleta de legumes","conserva","enlatado"
  ]],
  ["❄️ Congelados", [
    "acai","batata frita congelada","hamburguer","lasanha","legumes congelados","nuggets","pizza congelada","polpa de fruta","sorvete","congelado"
  ]],
  ["🥤 Bebidas", [
    "agua","agua de coco","cafe pronto","cha pronto","energetico","isotonico","refrigerante","suco","bebida"
  ]],
  ["🍪 Doces e Snacks", [
    "amendoim","bala","biscoito","bombom","chiclete","chocolate","pacoça","pe de moleque","pipoca pronta","salgadinho","snack","wafer"
  ]],
  ["🌶️ Temperos", [
    "acafrao","alho em po","cebola em po","chimichurri","colorau","cominho","curry","louro","oregano","paprica","pimenta do reino","tempero"
  ]],
  ["🧼 Limpeza", [
    "agua sanitaria","alcool de limpeza","amaciante","desinfetante","detergente","esponja","lava loucas","lava roupas","limpador","multiuso","pano de limpeza","sabao","saco para lixo"
  ]],
  ["🪥 Higiene Pessoal", [
    "absorvente","algodao","barbeador","condicionador","creme dental","cotonete","desodorante","escova de dente","fio dental","papel higienico","sabonete","shampoo"
  ]],
  ["👶 Bebê", [
    "chupeta","fralda","lenco umedecido","mamadeira","papinha","pomada para assadura","sabonete infantil","shampoo infantil","talco"
  ]],
  ["🐶 Pet", [
    "areia para gato","brinquedo pet","petisco","racao","shampoo pet","tapete higienico"
  ]],
  ["💊 Farmácia", [
    "alcool 70","curativo","dipirona","esparadrapo","gaze","ibuprofeno","paracetamol","soro fisiologico","vitamina"
  ]],
  ["🏠 Utilidades Domésticas", [
    "bateria","copo descartavel","filtro de cafe","filme pvc","fosforo","guardanapo","papel aluminio","pilha","prato descartavel","pregador","vela"
  ]]
];

function normalizar(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferirCategoriaSmartList(nome) {
  const texto = normalizar(nome);
  if (!texto) return "📦 Outros";

  for (const [categoria, palavras] of REGRAS_CATEGORIAS) {
    if (palavras.some((palavra) => texto.includes(normalizar(palavra)))) {
      return categoria;
    }
  }
  return "📦 Outros";
}

function preencherSelect(select, incluirAutomatico = false) {
  if (!select) return;
  const valorAtual = select.value;
  select.replaceChildren();

  if (incluirAutomatico) {
    const automatico = document.createElement("option");
    automatico.value = "automatico";
    automatico.textContent = "🤖 Automático";
    select.appendChild(automatico);
  } else {
    const todas = document.createElement("option");
    todas.value = "";
    todas.textContent = "Todas as categorias";
    select.appendChild(todas);
  }

  CATEGORIAS_SMART_LIST.forEach((categoria) => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    select.appendChild(option);
  });

  if (Array.from(select.options).some((option) => option.value === valorAtual)) {
    select.value = valorAtual;
  } else {
    select.value = incluirAutomatico ? "automatico" : "";
  }
}

function configurarCategoriaAutomatica() {
  const nome = document.getElementById("novoNome");
  const categoria = document.getElementById("novaCategoria");
  if (!nome || !categoria) return;

  categoria.dataset.modoCategoria = "automatico";

  categoria.addEventListener("change", () => {
    categoria.dataset.modoCategoria = categoria.value === "automatico" ? "automatico" : "manual";
  });

  nome.addEventListener("input", () => {
    if (categoria.dataset.modoCategoria !== "automatico") return;
    const inferida = inferirCategoriaSmartList(nome.value);
    categoria.value = inferida;
  });

  nome.addEventListener("focus", () => {
    if (!nome.value.trim() && categoria.value === "automatico") {
      categoria.dataset.modoCategoria = "automatico";
    }
  });

  document.getElementById("btnAdicionarProduto")?.addEventListener("click", () => {
    if (!nome.value.trim()) {
      categoria.value = "automatico";
      categoria.dataset.modoCategoria = "automatico";
    }
  });
}

function iniciarCategorias() {
  preencherSelect(document.getElementById("filtroCategoria"), false);
  preencherSelect(document.getElementById("novaCategoria"), true);
  configurarCategoriaAutomatica();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarCategorias);
} else {
  iniciarCategorias();
}
