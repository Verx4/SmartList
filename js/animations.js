const DURACOES = {
    rapida: 0.16,
    padrao: 0.22,
    modal: 0.26
};

const URL_GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js";
const idsProdutosConhecidos = new Set();
let promessaGsap;

export function movimentoReduzido() {
    return window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
}

export function carregarGsap() {
    if (window.gsap) {
        return Promise.resolve(window.gsap);
    }

    if (promessaGsap) {
        return promessaGsap;
    }

    promessaGsap = new Promise(resolve => {
        const scriptExistente = document.querySelector(
            `script[src="${URL_GSAP}"]`
        );

        if (scriptExistente) {
            scriptExistente.addEventListener(
                "load",
                () => resolve(window.gsap || null),
                { once: true }
            );
            scriptExistente.addEventListener(
                "error",
                () => resolve(null),
                { once: true }
            );
            return;
        }

        const script = document.createElement("script");
        script.src = URL_GSAP;
        script.async = true;
        script.dataset.animacoesGsap = "true";
        script.addEventListener(
            "load",
            () => resolve(window.gsap || null),
            { once: true }
        );
        script.addEventListener(
            "error",
            () => resolve(null),
            { once: true }
        );
        document.head.appendChild(script);
    });

    return promessaGsap;
}

function animacaoNativa(elemento, quadros, opcoes) {
    if (!elemento?.animate || movimentoReduzido()) {
        return Promise.resolve();
    }

    const animacao = elemento.animate(quadros, {
        fill: "both",
        easing: "cubic-bezier(.2,.8,.2,1)",
        ...opcoes
    });

    return animacao.finished.catch(() => undefined);
}

async function gsapDisponivel() {
    if (movimentoReduzido()) {
        return null;
    }

    return Promise.race([
        carregarGsap(),
        new Promise(resolve => {
            window.setTimeout(() => resolve(null), 350);
        })
    ]);
}

export async function animarAberturaModal(modal) {
    if (!modal || movimentoReduzido()) {
        return;
    }

    const conteudo = modal.querySelector(".modal-content");
    const gsap = await gsapDisponivel();

    if (gsap) {
        gsap.killTweensOf([modal, conteudo]);
        gsap.timeline()
            .fromTo(
                modal,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: DURACOES.padrao,
                    ease: "power1.out"
                }
            )
            .fromTo(
                conteudo,
                { opacity: 0, y: 14, scale: 0.98 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: DURACOES.modal,
                    ease: "power2.out"
                },
                0.02
            );
        return;
    }

    await Promise.all([
        animacaoNativa(
            modal,
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 220 }
        ),
        animacaoNativa(
            conteudo,
            [
                { opacity: 0, transform: "translateY(14px) scale(.98)" },
                { opacity: 1, transform: "translateY(0) scale(1)" }
            ],
            { duration: 260 }
        )
    ]);
}

export async function animarFechamentoModal(modal) {
    if (!modal || movimentoReduzido()) {
        return;
    }

    const conteudo = modal.querySelector(".modal-content");
    const gsap = await gsapDisponivel();

    if (gsap) {
        await new Promise(resolve => {
            gsap.killTweensOf([modal, conteudo]);
            gsap.timeline({ onComplete: resolve })
                .to(conteudo, {
                    opacity: 0,
                    y: 10,
                    scale: 0.985,
                    duration: DURACOES.rapida,
                    ease: "power1.in"
                })
                .to(modal, {
                    opacity: 0,
                    duration: DURACOES.rapida,
                    ease: "power1.in"
                }, 0);
        });
        return;
    }

    await Promise.all([
        animacaoNativa(
            modal,
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 160 }
        ),
        animacaoNativa(
            conteudo,
            [
                { opacity: 1, transform: "translateY(0) scale(1)" },
                { opacity: 0, transform: "translateY(10px) scale(.985)" }
            ],
            { duration: 160 }
        )
    ]);
}

export async function abrirPainel(painel) {
    if (!painel) {
        return;
    }

    painel.hidden = false;

    if (movimentoReduzido()) {
        return;
    }

    const gsap = await gsapDisponivel();

    if (gsap) {
        gsap.fromTo(
            painel,
            { opacity: 0, y: -6, scaleY: 0.98 },
            {
                opacity: 1,
                y: 0,
                scaleY: 1,
                transformOrigin: "top",
                duration: DURACOES.padrao,
                ease: "power2.out",
                clearProps: "transform,opacity"
            }
        );
        return;
    }

    await animacaoNativa(
        painel,
        [
            { opacity: 0, transform: "translateY(-6px) scaleY(.98)" },
            { opacity: 1, transform: "translateY(0) scaleY(1)" }
        ],
        { duration: 220 }
    );
}

export async function fecharPainel(painel) {
    if (!painel || painel.hidden) {
        return;
    }

    if (movimentoReduzido()) {
        painel.hidden = true;
        return;
    }

    const gsap = await gsapDisponivel();

    if (gsap) {
        await new Promise(resolve => {
            gsap.to(painel, {
                opacity: 0,
                y: -5,
                duration: DURACOES.rapida,
                ease: "power1.in",
                onComplete: resolve
            });
        });
        gsap.set(painel, { clearProps: "transform,opacity" });
    } else {
        await animacaoNativa(
            painel,
            [
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-5px)" }
            ],
            { duration: 160 }
        );
    }

    painel.hidden = true;
}

export async function animarEntradaNotificacao(elemento) {
    const gsap = await gsapDisponivel();

    if (gsap) {
        gsap.fromTo(
            elemento,
            { opacity: 0, x: 24, scale: 0.98 },
            {
                opacity: 1,
                x: 0,
                scale: 1,
                duration: DURACOES.padrao,
                ease: "power2.out"
            }
        );
        return;
    }

    return animacaoNativa(
        elemento,
        [
            { opacity: 0, transform: "translateX(24px) scale(.98)" },
            { opacity: 1, transform: "translateX(0) scale(1)" }
        ],
        { duration: 220 }
    );
}

export async function animarSaidaNotificacao(elemento) {
    const gsap = await gsapDisponivel();

    if (gsap) {
        await new Promise(resolve => {
            gsap.to(elemento, {
                opacity: 0,
                x: 18,
                duration: DURACOES.rapida,
                ease: "power1.in",
                onComplete: resolve
            });
        });
        return;
    }

    return animacaoNativa(
        elemento,
        [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: "translateX(18px)" }
        ],
        { duration: 160 }
    );
}

export async function animarProdutosNaLista(lista) {
    const elementos = [
        ...lista.querySelectorAll("[data-produto-id]")
    ].filter(elemento => {
        const id = String(elemento.dataset.produtoId || "");
        if (!id || idsProdutosConhecidos.has(id)) {
            return false;
        }
        idsProdutosConhecidos.add(id);
        return true;
    });

    if (!elementos.length || movimentoReduzido()) {
        return;
    }

    const gsap = await gsapDisponivel();

    if (gsap) {
        gsap.fromTo(
            elementos,
            { opacity: 0, y: 10 },
            {
                opacity: 1,
                y: 0,
                duration: DURACOES.padrao,
                stagger: 0.035,
                ease: "power2.out",
                clearProps: "transform,opacity"
            }
        );
        return;
    }

    elementos.slice(0, 12).forEach((elemento, indice) => {
        elemento.animate(
            [
                { opacity: 0, transform: "translateY(10px)" },
                { opacity: 1, transform: "translateY(0)" }
            ],
            {
                duration: 220,
                delay: indice * 35,
                easing: "cubic-bezier(.2,.8,.2,1)",
                fill: "both"
            }
        );
    });
}

export async function animarSaidaProduto(elemento) {
    if (!elemento || movimentoReduzido()) {
        return;
    }

    elemento.classList.add("produto-removendo");
    const gsap = await gsapDisponivel();

    if (gsap) {
        await new Promise(resolve => {
            gsap.to(elemento, {
                opacity: 0,
                y: -8,
                scale: 0.985,
                duration: DURACOES.padrao,
                ease: "power1.in",
                onComplete: resolve
            });
        });
        return;
    }

    return animacaoNativa(
        elemento,
        [
            { opacity: 1, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(-8px) scale(.985)" }
        ],
        { duration: 220 }
    );
}

export function destacarProduto(id) {
    requestAnimationFrame(() => {
        const seletor = `[data-produto-id="${CSS.escape(String(id))}"]`;
        const produto = document.querySelector(seletor);
        if (!produto || movimentoReduzido()) {
            return;
        }

        produto.classList.add("produto-atualizado");
        window.setTimeout(
            () => produto.classList.remove("produto-atualizado"),
            650
        );
    });
}

async function animarEntradaPagina() {
    if (
        document.documentElement.classList.contains("smart-list-intro-pending")
        || movimentoReduzido()
    ) {
        return;
    }

    const elementos = [
        ...document.querySelectorAll(
            "main > section, main > article, "
            + "main .page-eyebrow, main h1"
        )
    ].slice(0, 16);

    if (!elementos.length) {
        return;
    }

    const gsap = await gsapDisponivel();

    if (gsap) {
        const mm = gsap.matchMedia();
        mm.add(
            "(prefers-reduced-motion: no-preference)",
            () => {
                gsap.fromTo(
                    elementos,
                    { opacity: 0, y: 10 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: DURACOES.padrao,
                        stagger: 0.035,
                        ease: "power2.out",
                        clearProps: "transform,opacity"
                    }
                );
            }
        );
        return;
    }

    elementos.forEach((elemento, indice) => {
        elemento.animate(
            [
                { opacity: 0, transform: "translateY(10px)" },
                { opacity: 1, transform: "translateY(0)" }
            ],
            {
                duration: 220,
                delay: indice * 35,
                easing: "cubic-bezier(.2,.8,.2,1)",
                fill: "both"
            }
        );
    });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        animarEntradaPagina,
        { once: true }
    );
} else {
    animarEntradaPagina();
}

if (!movimentoReduzido()) {
    carregarGsap();
}
