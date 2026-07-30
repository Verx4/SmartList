import "./animations.js";
import { ativarAtualizacaoLocalizacao } from "./localizacao-app.js";

const appRoot = new URL("../", import.meta.url);
const serviceWorkerUrl = new URL("service-worker.js", appRoot);
const manifestUrl = new URL("manifest.webmanifest", appRoot);
const iconUrl = new URL("assets/icons/icon-192.png", appRoot);
const themeStyleUrl = new URL("css/temas.css", appRoot);
const themeScriptUrl = new URL("js/tema.js?v=10", appRoot);

const PAGINAS_COM_RETORNO_AO_INICIO = new Set([
    "perfil.html",
    "assinatura.html",
    "sugestoes.html",
    "suporte.html",
    "termos.html",
    "privacidade.html"
]);

let installEvent = null;
let installButton = null;
let reloadingForUpdate = false;

garantirMetadadosPwa();
carregarAparencia();
configurarInstalacao();
configurarMenuMovel();
registrarServiceWorker();
ativarAtualizacaoLocalizacao();

function carregarAparencia() {
    const estilosCarregados = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
    ).some((link) => {
        try {
            return new URL(link.href).pathname === themeStyleUrl.pathname;
        } catch (_erro) {
            return false;
        }
    });

    if (!estilosCarregados) {
        const estilos = document.createElement("link");
        estilos.rel = "stylesheet";
        estilos.href = themeStyleUrl.href;
        estilos.dataset.smartListThemes = "true";
        document.head.append(estilos);
    }

    if (!window.TemaMinhaLista && !window.TemaMinhaListaCarregando) {
        window.TemaMinhaListaCarregando = import(themeScriptUrl.href)
            .catch((erro) => {
                console.warn("Não foi possível carregar as opções de aparência.", erro);
            });
    }
}

function configurarMenuMovel() {
    const cabecalho = document.querySelector(".site-header");
    const conteudo = cabecalho?.querySelector(".header-content");
    const navegacao = conteudo?.querySelector(".main-nav");

    if (!cabecalho || !conteudo || !navegacao) {
        return;
    }

    configurarRetornoAoInicio(conteudo);

    if (document.body.classList.contains("sem-menu-superior")) {
        cabecalho.classList.add("menu-superior-removido");
        return;
    }

    if (!navegacao.id) {
        navegacao.id = "menuPrincipal";
    }

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "mobile-menu-button";
    botao.setAttribute("aria-controls", navegacao.id);
    botao.setAttribute("aria-expanded", "false");
    botao.setAttribute("aria-label", "Abrir menu principal");
    botao.innerHTML = `
        <span class="mobile-menu-icon" aria-hidden="true">☰</span>
        <span>Menu</span>
    `;

    conteudo.insertBefore(botao, navegacao);
    cabecalho.classList.add("menu-ready");

    function definirEstado(aberto) {
        cabecalho.classList.toggle("menu-open", aberto);
        botao.setAttribute("aria-expanded", String(aberto));
        botao.setAttribute(
            "aria-label",
            aberto ? "Fechar menu principal" : "Abrir menu principal"
        );
    }

    botao.addEventListener("click", () => {
        definirEstado(!cabecalho.classList.contains("menu-open"));
    });

    navegacao.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            definirEstado(false);
        }
    });

    document.addEventListener("click", (event) => {
        if (!cabecalho.contains(event.target)) {
            definirEstado(false);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            definirEstado(false);
            botao.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 768) {
            definirEstado(false);
        }
    });
}

function configurarRetornoAoInicio(conteudo) {
    const pagina = window.location.pathname.split("/").pop() || "index.html";

    if (!PAGINAS_COM_RETORNO_AO_INICIO.has(pagina)) {
        return;
    }

    const marca = conteudo.querySelector(".brand");

    if (!marca || typeof window.matchMedia !== "function") {
        return;
    }

    const conteudoOriginal = marca.innerHTML;
    const destinoOriginal = marca.getAttribute("href");
    const classeOriginal = marca.className;
    const rotuloOriginal = marca.getAttribute("aria-label");
    const tituloOriginal = marca.getAttribute("title");
    const telaMovel = window.matchMedia("(max-width: 768px)");

    const atualizar = () => {
        if (telaMovel.matches) {
            marca.setAttribute("href", "./inicio.html");
            marca.className = `${classeOriginal} btn btn-secondary mobile-back-link`;
            marca.innerHTML = '<span aria-hidden="true">←</span><span>Voltar</span>';
            marca.setAttribute("aria-label", "Voltar à tela inicial");
            marca.setAttribute("title", "Voltar à tela inicial");
            return;
        }

        marca.innerHTML = conteudoOriginal;
        marca.className = classeOriginal;

        if (destinoOriginal === null) {
            marca.removeAttribute("href");
        } else {
            marca.setAttribute("href", destinoOriginal);
        }

        if (rotuloOriginal === null) {
            marca.removeAttribute("aria-label");
        } else {
            marca.setAttribute("aria-label", rotuloOriginal);
        }

        if (tituloOriginal === null) {
            marca.removeAttribute("title");
        } else {
            marca.setAttribute("title", tituloOriginal);
        }
    };

    atualizar();

    if (typeof telaMovel.addEventListener === "function") {
        telaMovel.addEventListener("change", atualizar);
    } else {
        telaMovel.addListener?.(atualizar);
    }
}


function garantirMetadadosPwa() {
    if (!document.querySelector('link[rel="manifest"]')) {
        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = manifestUrl.href;
        document.head.append(manifest);
    }

    if (!document.querySelector('meta[name="theme-color"]')) {
        const themeColor = document.createElement("meta");
        themeColor.name = "theme-color";
        themeColor.content = "#0b1220";
        document.head.append(themeColor);
    }

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = iconUrl.href;
        document.head.append(appleIcon);
    }
}

function configurarInstalacao() {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        installEvent = event;
        exibirBotaoInstalar();
    });

    window.addEventListener("appinstalled", () => {
        installEvent = null;
        installButton?.remove();
        installButton = null;
    });
}

function exibirBotaoInstalar() {
    if (installButton || !installEvent) {
        return;
    }

    installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "pwa-install-button";
    installButton.textContent = "Instalar aplicativo";
    installButton.setAttribute("aria-label", "Instalar Smart List neste dispositivo");

    installButton.addEventListener("click", async () => {
        if (!installEvent) {
            return;
        }

        installButton.disabled = true;
        await installEvent.prompt();
        const escolha = await installEvent.userChoice;

        if (escolha.outcome === "accepted") {
            installEvent = null;
            installButton.remove();
            installButton = null;
            return;
        }

        installButton.disabled = false;
    });

    document.body.append(installButton);
}

function registrarServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
        return;
    }

    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register(
                serviceWorkerUrl,
                { scope: appRoot.pathname }
            );

            ativarAtualizacao(registration);
            registration.addEventListener("updatefound", () => ativarAtualizacao(registration));

            window.setInterval(() => registration.update(), 60 * 60 * 1000);
        } catch (erro) {
            console.warn("Não foi possível ativar o modo aplicativo.", erro);
        }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadingForUpdate) {
            return;
        }

        reloadingForUpdate = true;
        window.location.reload();
    });
}

function ativarAtualizacao(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    const worker = registration.installing;

    if (!worker) {
        return;
    }

    worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
        }
    });
}
