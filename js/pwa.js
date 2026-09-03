import "./animations.js";

const appRoot = new URL("../", import.meta.url);
const serviceWorkerUrl = new URL("service-worker.js", appRoot);
const manifestUrl = new URL("manifest.webmanifest", appRoot);
const iconUrl = new URL("assets/icons/icon-192.png", appRoot);
const themeStyleUrl = new URL("css/temas.css?v=12", appRoot);
const themeScriptUrl = new URL("js/tema.js?v=12", appRoot);

const DESTINOS_RETORNO = new Map([
    ["checkout.html", "./assinatura.html"]
]);

const ROTAS_MENU_PRINCIPAL = Object.freeze([
    ["dashboard.html", "Minha lista"],
    ["comparar-embalagens.html", "Comparação"],
    ["historico.html", "Histórico"],
    ["favoritos.html", "Favoritos"],
    ["relatorios.html", "Relatórios"],
    ["sugestoes.html", "Sugestões"],
    ["modo-de-usar.html", "Modo de usar"],
    ["suporte.html", "Suporte"],
    ["assinatura.html", "Planos"],
    ["perfil.html", "Perfil"]
]);

const PAGINAS_MENU_APP = new Set([
    "perfil.html", "assinatura.html", "sugestoes.html", "modo-de-usar.html", "suporte.html",
    "termos.html", "privacidade.html", "minha-economia.html", "configuracoes.html"
]);

let installEvent = null;
let installButton = null;
let reloadingForUpdate = false;

garantirMetadadosPwa();
carregarAparencia();
configurarInstalacao();
configurarMenuMovel();
garantirNavegacaoInferior();
registrarServiceWorker();

function carregarAparencia() {
    const estilosCarregados = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(link => { try { return new URL(link.href).href === themeStyleUrl.href; } catch { return false; } });
    if (!estilosCarregados) {
        const estilos = document.createElement("link");
        estilos.rel = "stylesheet";
        estilos.href = themeStyleUrl.href;
        estilos.dataset.smartListThemes = "true";
        document.head.append(estilos);
    }
    if (!window.TemaMinhaLista && !window.TemaMinhaListaCarregando) {
        window.TemaMinhaListaCarregando = import(themeScriptUrl.href).catch(erro => console.warn("Não foi possível carregar as opções de aparência.", erro));
    }
}

function garantirNavegacaoInferior() {
    const pagina = window.location.pathname.split("/").pop() || "index.html";
    if (!PAGINAS_MENU_APP.has(pagina)) return;
    if (document.querySelector('script[src*="mobile-nav.js"]')) return;
    const script = document.createElement("script");
    script.src = "./js/mobile-nav.js?v=6";
    document.body.appendChild(script);
}

function configurarMenuMovel() {
    const cabecalho = document.querySelector(".site-header");
    const conteudo = cabecalho?.querySelector(".header-content");
    const navegacao = conteudo?.querySelector(".main-nav");
    if (!cabecalho || !conteudo || !navegacao) return;

    const paginaAtual = window.location.pathname.split("/").pop() || "index.html";

    configurarRetornoAoInicio(conteudo);
    sincronizarMenuPrincipal(navegacao);

    if (
        PAGINAS_MENU_APP.has(paginaAtual)
        || document.body.classList.contains("sem-menu-superior")
    ) {
        cabecalho.classList.add("menu-superior-removido");
        return;
    }

    if (!navegacao.id) navegacao.id = "menuPrincipal";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "mobile-menu-button";
    botao.setAttribute("aria-controls", navegacao.id);
    botao.setAttribute("aria-expanded", "false");
    botao.setAttribute("aria-label", "Abrir menu principal");
    botao.innerHTML = '<span class="mobile-menu-icon" aria-hidden="true">☰</span><span>Menu</span>';
    conteudo.insertBefore(botao, navegacao);
    cabecalho.classList.add("menu-ready");
    function definirEstado(aberto) {
        cabecalho.classList.toggle("menu-open", aberto);
        botao.setAttribute("aria-expanded", String(aberto));
        botao.setAttribute("aria-label", aberto ? "Fechar menu principal" : "Abrir menu principal");
    }
    botao.addEventListener("click", () => definirEstado(!cabecalho.classList.contains("menu-open")));
    navegacao.addEventListener("click", event => { if (event.target.closest("a")) definirEstado(false); });
    document.addEventListener("click", event => { if (!cabecalho.contains(event.target)) definirEstado(false); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { definirEstado(false); botao.focus(); } });
    window.addEventListener("resize", () => { if (window.innerWidth > 768) definirEstado(false); });
}

function sincronizarMenuPrincipal(navegacao) {
    const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
    const fragmento = document.createDocumentFragment();
    for (const [arquivo, rotulo] of ROTAS_MENU_PRINCIPAL) {
        const link = document.createElement("a");
        link.href = `./${arquivo}`;
        link.textContent = rotulo;
        if (arquivo === paginaAtual) { link.classList.add("active"); link.setAttribute("aria-current", "page"); }
        if (arquivo === "sugestoes.html") {
            link.classList.add("link-sugestoes-notificacao");
            link.dataset.sugestoesLink = "";
            const badge = document.createElement("span");
            badge.className = "badge-sugestoes";
            badge.dataset.badgeSugestoes = "";
            badge.hidden = true;
            badge.setAttribute("aria-label", "Nova resposta");
            link.append(badge);
        }
        fragmento.append(link);
    }
    navegacao.replaceChildren(fragmento);
}

function configurarRetornoAoInicio(conteudo) {
    const pagina = window.location.pathname.split("/").pop() || "index.html";
    const destinoRetorno = DESTINOS_RETORNO.get(pagina);
    if (!destinoRetorno) return;
    const marca = conteudo.querySelector(".brand");
    if (!marca || typeof window.matchMedia !== "function") return;
    const conteudoOriginal = marca.innerHTML;
    const destinoOriginal = marca.getAttribute("href");
    const classeOriginal = marca.className;
    const telaMovel = window.matchMedia("(max-width: 768px)");
    const atualizar = () => {
        if (telaMovel.matches) {
            marca.setAttribute("href", destinoRetorno);
            marca.className = `${classeOriginal} btn btn-secondary mobile-back-link`;
            marca.innerHTML = '<span aria-hidden="true">←</span><span>Voltar</span>';
        } else {
            marca.innerHTML = conteudoOriginal;
            marca.className = classeOriginal;
            if (destinoOriginal !== null) marca.setAttribute("href", destinoOriginal);
        }
    };
    atualizar();
    telaMovel.addEventListener?.("change", atualizar);
}

function garantirMetadadosPwa() {
    if (!document.querySelector('link[rel="manifest"]')) { const el = document.createElement("link"); el.rel = "manifest"; el.href = manifestUrl.href; document.head.append(el); }
    if (!document.querySelector('meta[name="theme-color"]')) { const el = document.createElement("meta"); el.name = "theme-color"; el.content = "#0b1220"; document.head.append(el); }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) { const el = document.createElement("link"); el.rel = "apple-touch-icon"; el.href = iconUrl.href; document.head.append(el); }
}

function configurarInstalacao() {
    window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); installEvent = event; exibirBotaoInstalar(); });
    window.addEventListener("appinstalled", () => { installEvent = null; installButton?.remove(); installButton = null; });
}
function exibirBotaoInstalar() {
    if (installButton || !installEvent) return;
    installButton = document.createElement("button"); installButton.type = "button"; installButton.className = "pwa-install-button"; installButton.textContent = "Instalar aplicativo";
    installButton.addEventListener("click", async () => { if (!installEvent) return; installButton.disabled = true; await installEvent.prompt(); const escolha = await installEvent.userChoice; if (escolha.outcome === "accepted") { installEvent = null; installButton.remove(); installButton = null; } else installButton.disabled = false; });
    document.body.append(installButton);
}
function registrarServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register(serviceWorkerUrl, { scope: appRoot.pathname });
            ativarAtualizacao(registration); registration.addEventListener("updatefound", () => ativarAtualizacao(registration)); window.setInterval(() => registration.update(), 60 * 60 * 1000);
        } catch (erro) { console.warn("Não foi possível ativar o modo aplicativo.", erro); }
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloadingForUpdate) { reloadingForUpdate = true; window.location.reload(); } });
}
function ativarAtualizacao(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) registration.waiting.postMessage({ type: "SKIP_WAITING" });
    const worker = registration.installing; if (!worker) return;
    worker.addEventListener("statechange", () => { if (worker.state === "installed" && navigator.serviceWorker.controller) worker.postMessage({ type: "SKIP_WAITING" }); });
}
