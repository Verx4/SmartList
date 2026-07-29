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
        // A abertura continua mesmo quando o armazenamento está indisponível.
    }
}

function removerSessao(chave) {
    try {
        sessionStorage.removeItem(chave);
    } catch (_erro) {
        // Não bloqueia a navegação quando o armazenamento está indisponível.
    }
}

function prepararCamada() {
    camada = document.createElement("div");
    camada.className = "smart-list-intro-overlay";
    camada.setAttribute("role", "status");
    camada.setAttribute("aria-label", "Abrindo o Smart List");
    camada.innerHTML = `
        <div class="smart-list-intro-stage">
            <div class="smart-list-intro-lockup">
                <div class="smart-list-intro-energy" aria-hidden="true">
                    <span class="smart-list-intro-ring"></span>
                    <span class="smart-list-intro-ring"></span>
                    <span class="smart-list-intro-ring"></span>
                    <span class="smart-list-intro-core"></span>
                </div>
                <p class="smart-list-intro-brand" aria-hidden="true">
                    <span class="smart-list-intro-smart">SMART</span>
                    <span class="smart-list-intro-list">LIST</span>
                </p>
            </div>

            <div class="smart-list-intro-particles" aria-hidden="true"></div>

            <div class="smart-list-intro-logo-wrap">
                <img class="smart-list-intro-logo" src="./assets/logo/logo.png" alt="Logo Smart List">
            </div>

            <div class="smart-list-intro-progress" aria-hidden="true">
                <span class="smart-list-intro-progress-bar"></span>
            </div>

            <div class="smart-list-intro-cart verde" aria-hidden="true">
                <span class="smart-list-intro-cart-handle"></span>
                <span class="smart-list-intro-cart-basket"></span>
                <span class="smart-list-intro-cart-wheel"></span>
            </div>
            <div class="smart-list-intro-cart azul" aria-hidden="true">
                <span class="smart-list-intro-cart-handle"></span>
                <span class="smart-list-intro-cart-basket"></span>
                <span class="smart-list-intro-cart-wheel"></span>
            </div>

            <span class="smart-list-intro-flash" aria-hidden="true"></span>
            <span class="smart-list-intro-wave" aria-hidden="true"></span>

            <p class="smart-list-intro-final-brand" aria-hidden="true">
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
    const quantidade = dispositivoLimitado ? 30 : 52;
    const fragmento = document.createDocumentFragment();
    const dados = [];

    for (let indice = 0; indice < quantidade; indice += 1) {
        const particula = document.createElement("span");
        const verde = indice % 2 === 0;
        const angulo = (Math.PI * 2 * indice) / quantidade;
        const variacao = pseudoAleatorio(indice + 1);
        const raioInicial = 58 + variacao * 36;
        const raioExplosao = 125 + pseudoAleatorio(indice + 9) * Math.min(260, window.innerWidth * 0.3);
        const anguloColisao = angulo + pseudoAleatorio(indice + 23) * 0.55;
        const raioColisao = 55 + pseudoAleatorio(indice + 31) * 115;
        const tamanho = 3 + Math.round(pseudoAleatorio(indice + 41) * 4);

        particula.className = "smart-list-intro-particle";
        particula.style.setProperty("--particle-size", `${tamanho}px`);
        particula.style.setProperty("--particle-color", verde ? "#22c55e" : "#3b82f6");
        particula.style.setProperty(
            "--particle-glow",
            verde ? "rgba(34, 197, 94, .72)" : "rgba(59, 130, 246, .75)"
        );
        fragmento.appendChild(particula);

        dados.push({
            elemento: particula,
            inicialX: Math.cos(angulo) * raioInicial,
            inicialY: Math.sin(angulo) * raioInicial,
            explosaoX: Math.cos(angulo) * raioExplosao,
            explosaoY: Math.sin(angulo) * raioExplosao,
            colisaoX: Math.cos(anguloColisao) * raioColisao,
            colisaoY: Math.sin(anguloColisao) * raioColisao,
            palavraX: ((indice / Math.max(1, quantidade - 1)) - 0.5) * Math.min(360, window.innerWidth * 0.72),
            palavraY: 86 + (pseudoAleatorio(indice + 57) - 0.5) * 38
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
    const energy = camada.querySelector(".smart-list-intro-energy");
    const rings = [...camada.querySelectorAll(".smart-list-intro-ring")];
    const brand = camada.querySelector(".smart-list-intro-brand");
    const logoWrap = camada.querySelector(".smart-list-intro-logo-wrap");
    const logo = camada.querySelector(".smart-list-intro-logo");
    const progress = camada.querySelector(".smart-list-intro-progress");
    const progressBar = camada.querySelector(".smart-list-intro-progress-bar");
    const cartGreen = camada.querySelector(".smart-list-intro-cart.verde");
    const cartBlue = camada.querySelector(".smart-list-intro-cart.azul");
    const flash = camada.querySelector(".smart-list-intro-flash");
    const wave = camada.querySelector(".smart-list-intro-wave");
    const finalBrand = camada.querySelector(".smart-list-intro-final-brand");
    const particulas = criarParticulas();
    const alvosParticulas = particulas.map(item => item.elemento);
    const distanciaCarrinho = Math.min(430, Math.max(150, window.innerWidth * 0.39));
    const elevacaoLogo = window.innerWidth <= 640 ? -108 : -128;
    const encaixe = { x: 0, y: 0, escala: 1 };

    gsap.set(logoWrap, { xPercent: -50, yPercent: -50 });
    gsap.set(alvosParticulas, {
        x: indice => particulas[indice].inicialX,
        y: indice => particulas[indice].inicialY,
        scale: 0.25,
        opacity: 0
    });

    timeline = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: finalizar
    });

    timeline
        .fromTo(energy,
            { opacity: 0, scale: 0.54, rotation: -24 },
            { opacity: 1, scale: 1, rotation: 0, duration: 0.6 },
            0
        )
        .to(rings, {
            rotation: indice => indice % 2 ? -150 : 190,
            duration: 1.15,
            stagger: 0.04,
            ease: "none"
        }, 0)
        .fromTo(brand,
            { opacity: 0, x: 30, scale: 0.92, filter: "blur(7px)" },
            { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", duration: 0.5 },
            0.16
        )
        .to(alvosParticulas, {
            opacity: 1,
            scale: 1,
            duration: 0.18,
            stagger: 0.004
        }, 0.72)
        .to(alvosParticulas, {
            x: indice => particulas[indice].explosaoX,
            y: indice => particulas[indice].explosaoY,
            rotation: indice => indice * 19,
            duration: 0.42,
            ease: "power3.out"
        }, 0.82)
        .to([energy, brand], {
            opacity: 0,
            scale: 1.15,
            filter: "blur(9px)",
            duration: 0.35,
            ease: "power2.in"
        }, 0.84)
        .to(alvosParticulas, {
            x: 0,
            y: 0,
            scale: 0.18,
            opacity: 0.75,
            duration: 0.48,
            ease: "power3.in"
        }, 1.12)
        .fromTo(logoWrap,
            { opacity: 0, scale: 0.52, filter: "brightness(1.8) blur(5px)" },
            { opacity: 1, scale: 1, filter: "brightness(1) blur(0px)", duration: 0.7, ease: "back.out(1.55)" },
            1.34
        )
        .to(alvosParticulas, { opacity: 0, scale: 0, duration: 0.24 }, 1.55)
        .fromTo(progress,
            { opacity: 0, scaleX: 0.82 },
            { opacity: 1, scaleX: 1, duration: 0.24 },
            1.92
        )
        .to(progressBar, { width: "100%", duration: 1.2, ease: "power1.inOut" }, 2.02)
        .to(logo, {
            filter: "brightness(1.34) drop-shadow(0 0 34px rgba(34,197,94,.68))",
            duration: 0.22,
            repeat: 3,
            yoyo: true,
            ease: "sine.inOut"
        }, 2.08)
        .fromTo(cartGreen,
            { opacity: 0, x: -distanciaCarrinho, scale: 0.84 },
            { opacity: 1, x: -distanciaCarrinho, scale: 1, duration: 0.4, ease: "back.out(1.7)" },
            2.84
        )
        .fromTo(cartBlue,
            { opacity: 0, x: distanciaCarrinho, scale: 0.84 },
            { opacity: 1, x: distanciaCarrinho, scale: 1, duration: 0.4, ease: "back.out(1.7)" },
            2.84
        )
        .to(cartGreen, { x: -distanciaCarrinho - 14, duration: 0.18, ease: "power1.out" }, 3.16)
        .to(cartBlue, { x: distanciaCarrinho + 14, duration: 0.18, ease: "power1.out" }, 3.16)
        .call(() => {
            cartGreen.classList.add("correndo");
            cartBlue.classList.add("correndo");
        }, [], 3.34)
        .to(cartGreen, {
            x: -18,
            scale: 1.08,
            filter: "blur(.7px) drop-shadow(0 0 18px currentColor)",
            duration: 0.8,
            ease: "power4.in"
        }, 3.34)
        .to(cartBlue, {
            x: 18,
            scale: 1.08,
            filter: "blur(.7px) drop-shadow(0 0 18px currentColor)",
            duration: 0.8,
            ease: "power4.in"
        }, 3.34)
        .fromTo(flash,
            { opacity: 0, scale: 0.2 },
            { opacity: 1, scale: 2.2, duration: 0.1, yoyo: true, repeat: 1 },
            4.12
        )
        .fromTo(wave,
            { opacity: 0.95, scale: 0.3 },
            { opacity: 0, scale: 7.5, duration: 0.42, ease: "power2.out" },
            4.12
        )
        .set(alvosParticulas, { x: 0, y: 0, scale: 0.55, opacity: 0.95 }, 4.12)
        .to(alvosParticulas, {
            x: indice => particulas[indice].colisaoX,
            y: indice => particulas[indice].colisaoY,
            duration: 0.2,
            ease: "power3.out"
        }, 4.12)
        .to([cartGreen, cartBlue], { opacity: 0, scale: 0.7, duration: 0.16 }, 4.14)
        .to(logoWrap, { y: elevacaoLogo, duration: 0.42, ease: "power2.out" }, 4.12)
        .to(progress, { opacity: 0, y: 12, duration: 0.2 }, 4.12)
        .to(alvosParticulas, {
            x: indice => particulas[indice].palavraX,
            y: indice => particulas[indice].palavraY,
            scale: 0.35,
            opacity: 0.42,
            duration: 0.3,
            ease: "power2.inOut"
        }, 4.3)
        .fromTo(finalBrand,
            { opacity: 0, scale: 0.72, filter: "blur(7px)" },
            { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.5, ease: "back.out(1.5)" },
            4.32
        )
        .to(alvosParticulas, { opacity: 0, scale: 0, duration: 0.24 }, 4.54)
        .to(finalBrand, {
            opacity: 0,
            scale: 0.9,
            filter: "blur(4px)",
            duration: 0.35,
            ease: "power1.in"
        }, 5.18)
        .call(() => prepararEncaixe(gsap, logoWrap, encaixe), [], 5.26)
        .to(logoWrap, {
            x: () => Number(gsap.getProperty(logoWrap, "x")) + encaixe.x,
            y: () => Number(gsap.getProperty(logoWrap, "y")) + encaixe.y,
            scale: () => encaixe.escala,
            duration: 0.7,
            ease: "power3.inOut",
            onComplete: () => {
                gsap.set(logoDestino, { opacity: 1 });
                gsap.set(logoWrap, { opacity: 0 });
            }
        }, 5.28)
        .to(elementosPainel, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.035,
            ease: "power2.out"
        }, 5.3)
        .to(camada, { opacity: 0, duration: 0.28, ease: "power1.out" }, 5.92);
}

function executarAberturaReduzida(gsap) {
    const logoWrap = camada.querySelector(".smart-list-intro-logo-wrap");
    const encaixe = { x: 0, y: 0, escala: 1 };

    gsap.set(logoWrap, { xPercent: -50, yPercent: -50 });
    timeline = gsap.timeline({ onComplete: finalizar });
    timeline
        .fromTo(logoWrap,
            { opacity: 0, scale: 0.94 },
            { opacity: 1, scale: 1, duration: 0.2, ease: "power1.out" }
        )
        .call(() => prepararEncaixe(gsap, logoWrap, encaixe), [], 0.28)
        .to(logoWrap, {
            x: () => Number(gsap.getProperty(logoWrap, "x")) + encaixe.x,
            y: () => Number(gsap.getProperty(logoWrap, "y")) + encaixe.y,
            scale: () => encaixe.escala,
            duration: 0.38,
            ease: "power1.inOut",
            onComplete: () => {
                gsap.set(logoDestino, { opacity: 1 });
                gsap.set(logoWrap, { opacity: 0 });
            }
        }, 0.3)
        .to(elementosPainel, {
            opacity: 1,
            y: 0,
            duration: 0.32,
            stagger: 0.018,
            ease: "power1.out"
        }, 0.32)
        .to(camada, { opacity: 0, duration: 0.2 }, 0.63);
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
