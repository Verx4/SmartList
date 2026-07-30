import { carregarGsap } from "./animations.js";

const CHAVE_PENDENTE = "smartListIntroPending";
const CHAVE_EXECUTADA = "smartListIntroPlayed";
const CLASSE_PENDENTE = "smart-list-intro-pending";
const CLASSE_ATIVA = "smart-list-intro-active";
const REDUZIR_MOVIMENTO = window.matchMedia("(prefers-reduced-motion: reduce)");

let camada = null;
let timeline = null;
let elementosBloqueados = [];
let elementosPainel = [];
let logoDestino = null;
let gsapAtivo = null;

const deveExecutar = lerSessao(CHAVE_PENDENTE) === "true"
    && lerSessao(CHAVE_EXECUTADA) !== "true";

if (!deveExecutar) {
    document.documentElement.classList.remove(CLASSE_PENDENTE);
} else {
    gravarSessao(CHAVE_EXECUTADA, "true");
    removerSessao(CHAVE_PENDENTE);
    prepararCamada();
    window.requestAnimationFrame(() => iniciarAbertura().catch(finalizarSemAnimacao));
}

function lerSessao(chave) {
    try {
        return sessionStorage.getItem(chave);
    } catch (_erro) {
        return null;
    }
}

function gravarSessao(chave, valor) {
    try {
        sessionStorage.setItem(chave, valor);
    } catch (_erro) {
        // A abertura continua mesmo quando o armazenamento estÃ¡ indisponÃ­vel.
    }
}

function removerSessao(chave) {
    try {
        sessionStorage.removeItem(chave);
    } catch (_erro) {
        // NÃ£o bloqueia a navegaÃ§Ã£o quando o armazenamento estÃ¡ indisponÃ­vel.
    }
}

function prepararCamada() {
    camada = document.createElement("div");
    camada.className = "smart-list-intro-overlay";
    camada.setAttribute("role", "status");
    camada.setAttribute("aria-label", "Abrindo o Smart List");
    camada.innerHTML = `
        <div class="smart-list-intro-stage">
            <div class="smart-list-intro-particles" aria-hidden="true"></div>

            <div class="smart-list-intro-cart verde" aria-hidden="true">
                <span class="smart-list-intro-cart-glyph">
                    <span class="smart-list-intro-cart-handle"></span>
                    <span class="smart-list-intro-cart-basket"></span>
                    <span class="smart-list-intro-cart-wheel"></span>
                </span>
            </div>

            <div class="smart-list-intro-cart azul" aria-hidden="true">
                <span class="smart-list-intro-cart-glyph">
                    <span class="smart-list-intro-cart-handle"></span>
                    <span class="smart-list-intro-cart-basket"></span>
                    <span class="smart-list-intro-cart-wheel"></span>
                </span>
            </div>

            <span class="smart-list-intro-flash" aria-hidden="true"></span>
            <span class="smart-list-intro-wave" aria-hidden="true"></span>

            <div class="smart-list-intro-logo-wrap">
                <img class="smart-list-intro-logo" src="./assets/logo/logo.png" alt="Logo Smart List">
            </div>

            <p class="smart-list-intro-brand" aria-hidden="true">
                <span class="smart-list-intro-smart">SMART</span>
                <span class="smart-list-intro-list">LIST</span>
            </p>
        </div>`;

    document.body.appendChild(camada);
    document.body.classList.add(CLASSE_ATIVA);
    bloquearDashboard();
    window.addEventListener("pagehide", encerrar, { once: true });
}

function bloquearDashboard() {
    elementosBloqueados = [...document.body.children].filter(elemento => elemento !== camada);
    elementosBloqueados.forEach(elemento => {
        elemento.inert = true;
        elemento.setAttribute("aria-hidden", "true");
    });
}

function liberarDashboard() {
    elementosBloqueados.forEach(elemento => {
        elemento.inert = false;
        elemento.removeAttribute("aria-hidden");
    });
    elementosBloqueados = [];
}

async function iniciarAbertura() {
    if (!camada) return;

    logoDestino = document.querySelector(".logo-dashboard");
    const gsap = await Promise.race([
        carregarGsap(),
        new Promise(resolve => window.setTimeout(() => resolve(null), 1800))
    ]);

    if (!gsap || !logoDestino) {
        await executarFallback();
        return;
    }

    gsapAtivo = gsap;
    elementosPainel = coletarElementosPainel();

    if (REDUZIR_MOVIMENTO.matches) {
        executarAberturaReduzida(gsap);
        return;
    }

    executarAberturaCompleta(gsap);
}

function coletarElementosPainel() {
    return [
        document.querySelector(".site-header"),
        document.querySelector(".dashboard-cabecalho"),
        ...document.querySelectorAll(".dashboard-grid-superior > *"),
        document.querySelector("#comparacaoCompra"),
        document.querySelector(".acoes"),
        document.querySelector('section[aria-labelledby="tituloListaProdutos"]'),
        document.querySelector(".acoes-compra"),
        document.querySelector(".site-footer"),
        document.querySelector(".app-bottom-nav")
    ].filter(Boolean);
}

function criarParticulas() {
    const recipiente = camada.querySelector(".smart-list-intro-particles");
    const dispositivoLimitado = (navigator.hardwareConcurrency || 8) <= 4
        || (navigator.deviceMemory || 8) <= 4
        || window.innerWidth <= 480;
    const quantidade = dispositivoLimitado ? 28 : 46;
    const fragmento = document.createDocumentFragment();
    const dados = [];

    for (let indice = 0; indice < quantidade; indice += 1) {
        const particula = document.createElement("span");
        const verde = indice % 2 === 0;
        const angulo = (Math.PI * 2 * indice) / quantidade;
        const raioExplosao = 72
            + pseudoAleatorio(indice + 5) * Math.min(210, window.innerWidth * 0.28);
        const formaLogo = indice < Math.round(quantidade * 0.66);
        const anguloLogo = (Math.PI * 2 * indice) / Math.max(1, Math.round(quantidade * 0.66));
        const raioLogo = 62 + pseudoAleatorio(indice + 17) * 32;

        particula.className = "smart-list-intro-particle";
        particula.style.setProperty(
            "--particle-size",
            `${3 + Math.round(pseudoAleatorio(indice + 29) * 4)}px`
        );
        particula.style.setProperty("--particle-color", verde ? "#22c55e" : "#3b82f6");
        particula.style.setProperty(
            "--particle-glow",
            verde ? "rgba(34, 197, 94, .76)" : "rgba(59, 130, 246, .78)"
        );
        fragmento.appendChild(particula);

        dados.push({
            elemento: particula,
            explosaoX: Math.cos(angulo) * raioExplosao,
            explosaoY: Math.sin(angulo) * raioExplosao,
            formacaoX: formaLogo
                ? Math.cos(anguloLogo) * raioLogo
                : ((indice / Math.max(1, quantidade - 1)) - 0.5)
                    * Math.min(310, window.innerWidth * 0.72),
            formacaoY: formaLogo
                ? -54 + Math.sin(anguloLogo) * raioLogo
                : 94 + (pseudoAleatorio(indice + 41) - 0.5) * 22
        });
    }

    recipiente.appendChild(fragmento);
    return dados;
}

function pseudoAleatorio(semente) {
    const valor = Math.sin(semente * 12.9898) * 43758.5453;
    return valor - Math.floor(valor);
}

function executarAberturaCompleta(gsap) {
    const logoWrap = camada.querySelector(".smart-list-intro-logo-wrap");
    const logo = camada.querySelector(".smart-list-intro-logo");
    const brand = camada.querySelector(".smart-list-intro-brand");
    const cartGreen = camada.querySelector(".smart-list-intro-cart.verde");
    const cartBlue = camada.querySelector(".smart-list-intro-cart.azul");
    const flash = camada.querySelector(".smart-list-intro-flash");
    const wave = camada.querySelector(".smart-list-intro-wave");
    const particulas = criarParticulas();
    const alvosParticulas = particulas.map(item => item.elemento);
    const distanciaCarrinho = Math.min(520, Math.max(175, window.innerWidth * 0.48));
    const encaixe = { x: 0, y: 0, escala: 1 };

    gsap.set(logoWrap, { xPercent: -50, yPercent: -50 });
    gsap.set(alvosParticulas, { x: 0, y: 0, scale: 0.2, opacity: 0 });

    timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: finalizar
    });

    timeline
        .fromTo(
            cartGreen,
            { opacity: 0, x: -distanciaCarrinho - 72, scale: 0.78 },
            { opacity: 1, x: -distanciaCarrinho, scale: 1, duration: 0.5 },
            0.08
        )
        .fromTo(
            cartBlue,
            { opacity: 0, x: distanciaCarrinho + 72, scale: 0.78 },
            { opacity: 1, x: distanciaCarrinho, scale: 1, duration: 0.5 },
            0.08
        )
        .to(cartGreen, {
            x: -distanciaCarrinho + 34,
            duration: 0.4,
            ease: "sine.inOut"
        }, 0.52)
        .to(cartBlue, {
            x: distanciaCarrinho - 34,
            duration: 0.4,
            ease: "sine.inOut"
        }, 0.52)
        .call(() => {
            cartGreen.classList.add("correndo");
            cartBlue.classList.add("correndo");
        }, [], 0.86)
        .to(cartGreen, {
            x: -18,
            scale: 1.08,
            filter: "blur(.65px) drop-shadow(0 0 19px currentColor)",
            duration: 0.78,
            ease: "power4.in"
        }, 0.86)
        .to(cartBlue, {
            x: 18,
            scale: 1.08,
            filter: "blur(.65px) drop-shadow(0 0 19px currentColor)",
            duration: 0.78,
            ease: "power4.in"
        }, 0.86)
        .fromTo(
            flash,
            { opacity: 0, scale: 0.18 },
            { opacity: 1, scale: 2.25, duration: 0.1, yoyo: true, repeat: 1 },
            1.6
        )
        .fromTo(
            wave,
            { opacity: 0.96, scale: 0.28 },
            { opacity: 0, scale: 7.2, duration: 0.42, ease: "power2.out" },
            1.6
        )
        .set(alvosParticulas, { x: 0, y: 0, opacity: 1, scale: 0.6 }, 1.6)
        .to(alvosParticulas, {
            x: indice => particulas[indice].explosaoX,
            y: indice => particulas[indice].explosaoY,
            rotation: indice => indice * 17,
            duration: 0.28,
            ease: "power3.out"
        }, 1.6)
        .to([cartGreen, cartBlue], { opacity: 0, scale: 0.72, duration: 0.16 }, 1.62)
        .to(alvosParticulas, {
            x: indice => particulas[indice].formacaoX,
            y: indice => particulas[indice].formacaoY,
            scale: 0.38,
            opacity: 0.72,
            duration: 0.36,
            ease: "power2.inOut"
        }, 1.86)
        .fromTo(
            logoWrap,
            { opacity: 0, scale: 0.58, filter: "brightness(1.7) blur(5px)" },
            {
                opacity: 1,
                scale: 1,
                filter: "brightness(1) blur(0px)",
                duration: 0.56,
                ease: "back.out(1.55)"
            },
            2.05
        )
        .fromTo(
            brand,
            { opacity: 0, scale: 0.74, y: 10, filter: "blur(6px)" },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.52,
                ease: "back.out(1.45)"
            },
            2.06
        )
        .to(logo, {
            filter: "brightness(1.22) drop-shadow(0 0 30px rgba(59,130,246,.56))",
            duration: 0.24,
            repeat: 1,
            yoyo: true,
            ease: "sine.inOut"
        }, 2.16)
        .to(alvosParticulas, { opacity: 0, scale: 0, duration: 0.34 }, 2.38)
        .to(brand, {
            opacity: 0,
            scale: 0.92,
            y: -4,
            filter: "blur(4px)",
            duration: 0.3,
            ease: "power1.in"
        }, 3.28)
        .call(() => prepararEncaixe(gsap, logoWrap, encaixe), [], 3.42)
        .to(logoWrap, {
            x: () => Number(gsap.getProperty(logoWrap, "x")) + encaixe.x,
            y: () => Number(gsap.getProperty(logoWrap, "y")) + encaixe.y,
            scale: () => encaixe.escala,
            duration: 0.76,
            ease: "power3.inOut",
            onComplete: () => {
                gsap.set(logoDestino, { opacity: 1 });
                gsap.set(logoWrap, { opacity: 0 });
            }
        }, 3.44)
        .to(elementosPainel, {
            opacity: 1,
            y: 0,
            duration: 0.62,
            stagger: 0.025,
            ease: "power2.out"
        }, 3.5)
        .to(camada, { opacity: 0, duration: 0.3, ease: "power1.out" }, 4.25);
}

function executarAberturaReduzida(gsap) {
    const logoWrap = camada.querySelector(".smart-list-intro-logo-wrap");
    const encaixe = { x: 0, y: 0, escala: 1 };

    gsap.set(logoWrap, { xPercent: -50, yPercent: -50 });
    timeline = gsap.timeline({ onComplete: finalizar });
    timeline
        .fromTo(
            logoWrap,
            { opacity: 0, scale: 0.96 },
            { opacity: 1, scale: 1, duration: 0.18, ease: "power1.out" }
        )
        .call(() => prepararEncaixe(gsap, logoWrap, encaixe), [], 0.2)
        .to(logoWrap, {
            x: () => Number(gsap.getProperty(logoWrap, "x")) + encaixe.x,
            y: () => Number(gsap.getProperty(logoWrap, "y")) + encaixe.y,
            scale: () => encaixe.escala,
            duration: 0.32,
            ease: "power1.inOut",
            onComplete: () => {
                gsap.set(logoDestino, { opacity: 1 });
                gsap.set(logoWrap, { opacity: 0 });
            }
        }, 0.22)
        .to(elementosPainel, {
            opacity: 1,
            y: 0,
            duration: 0.3,
            stagger: 0.015,
            ease: "power1.out"
        }, 0.24)
        .to(camada, { opacity: 0, duration: 0.18 }, 0.58);
}

function prepararEncaixe(gsap, logoWrap, encaixe) {
    prepararRevelacao(gsap);
    const origem = logoWrap.getBoundingClientRect();
    const destino = logoDestino.getBoundingClientRect();
    encaixe.x = destino.left + destino.width / 2 - (origem.left + origem.width / 2);
    encaixe.y = destino.top + destino.height / 2 - (origem.top + origem.height / 2);
    encaixe.escala = origem.width > 0 ? destino.width / origem.width : 1;
}

function prepararRevelacao(gsap) {
    elementosPainel = coletarElementosPainel();
    gsap.set(elementosPainel, { visibility: "visible", opacity: 0, y: 18 });
    gsap.set(logoDestino, { opacity: 0 });
    document.documentElement.classList.remove(CLASSE_PENDENTE);
}

async function executarFallback() {
    const logoWrap = camada?.querySelector(".smart-list-intro-logo-wrap");
    if (logoWrap) {
        logoWrap.style.opacity = "1";
        logoWrap.style.transition = "opacity .18s ease";
    }
    await new Promise(resolve => window.setTimeout(resolve, 220));
    document.documentElement.classList.remove(CLASSE_PENDENTE);
    finalizarSemAnimacao();
}

function finalizar() {
    window.removeEventListener("pagehide", encerrar);
    document.documentElement.classList.remove(CLASSE_PENDENTE);
    document.body.classList.remove(CLASSE_ATIVA);
    liberarDashboard();

    if (gsapAtivo) {
        gsapAtivo.set(elementosPainel, { clearProps: "opacity,transform,visibility" });
        if (logoDestino) gsapAtivo.set(logoDestino, { clearProps: "opacity" });
    }

    camada?.remove();
    camada = null;
    timeline = null;
    devolverFoco();
}

function finalizarSemAnimacao() {
    window.removeEventListener("pagehide", encerrar);
    timeline?.kill();
    timeline = null;
    document.documentElement.classList.remove(CLASSE_PENDENTE);
    document.body.classList.remove(CLASSE_ATIVA);
    liberarDashboard();
    elementosPainel.forEach(elemento => elemento.removeAttribute("style"));
    logoDestino?.style.removeProperty("opacity");
    camada?.remove();
    camada = null;
}

function devolverFoco() {
    const principal = document.querySelector("main");
    if (!principal) return;
    principal.setAttribute("tabindex", "-1");
    principal.focus({ preventScroll: true });
    window.setTimeout(() => principal.removeAttribute("tabindex"), 0);
}

function encerrar() {
    timeline?.kill();
    timeline = null;
    finalizarSemAnimacao();
}

