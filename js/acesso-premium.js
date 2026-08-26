(function () {
    "use strict";

    const RECURSOS_PREMIUM = new Map([
        ["comparar-embalagens.html", "comparacao"],
        ["comparacao.html", "comparacao"],
        ["historico.html", "historico"],
        ["minha-economia.html", "minha-economia"]
    ]);

    function paginaAtual() {
        return window.location.pathname.split("/").pop() || "inicio.html";
    }

    function usuarioAtual() {
        try {
            return JSON.parse(
                localStorage.getItem("usuarioAtual")
                || localStorage.getItem("usuarioLogado")
                || "null"
            );
        } catch {
            return null;
        }
    }

    function possuiToken() {
        return Boolean(
            sessionStorage.getItem("accessToken")
            || sessionStorage.getItem("token")
            || localStorage.getItem("accessToken")
            || localStorage.getItem("token")
        );
    }

    function possuiPremium(usuario = usuarioAtual()) {
        const tipoAcesso = String(usuario?.tipoAcesso || "").toUpperCase();

        return tipoAcesso === "PREMIUM"
            || (tipoAcesso === "CORTESIA" && usuario?.assinaturaAtiva === true)
            || usuario?.assinaturaAtiva === true;
    }

    function urlPlanos(recurso) {
        const parametros = new URLSearchParams({
            acesso: "premium",
            recurso
        });

        return `./assinatura.html?${parametros}`;
    }

    function protegerPaginaAtual() {
        const recurso = RECURSOS_PREMIUM.get(paginaAtual());

        if (!recurso) {
            return;
        }

        if (!possuiToken()) {
            document.documentElement.style.visibility = "hidden";
            window.location.replace("./login.html");
            return;
        }

        if (!possuiPremium()) {
            document.documentElement.classList.add("acesso-pago-limitado");
        }
    }

    function recursoDoLink(link) {
        try {
            const destino = new URL(link.href, window.location.href);

            if (destino.origin !== window.location.origin) {
                return null;
            }

            return RECURSOS_PREMIUM.get(
                destino.pathname.split("/").pop()
            ) || null;
        } catch {
            return null;
        }
    }

    function sinalizarLinksPagos() {
        if (possuiPremium()) {
            return;
        }

        document.querySelectorAll("a[href]").forEach(link => {
            const recurso = recursoDoLink(link);

            if (!recurso) {
                return;
            }

            const nomeRecurso = link.textContent.trim() || "Recurso pago";
            link.classList.add("recurso-pago-bloqueado");
            link.dataset.recursoPago = recurso;
            link.title = "Abrir recurso e ver as opções de acesso";
            link.setAttribute(
                "aria-label",
                `${nomeRecurso}. Recurso disponível para Premium ou cortesia.`
            );
            link.querySelector(".premium-selo")?.remove();
        });
    }

    function abrirPlanos(recurso) {
        window.location.assign(urlPlanos(recurso));
    }

    function bloquearConteudoPagoInicio() {
        if (paginaAtual() !== "inicio.html" || possuiPremium()) {
            return;
        }

        document.querySelectorAll("[data-premium-content]")
            .forEach(elemento => {
                elemento.hidden = false;
                elemento.classList.add("conteudo-pago-bloqueado");
                elemento.tabIndex = 0;
                elemento.setAttribute("role", "link");
                elemento.setAttribute(
                    "aria-label",
                    "Recurso pago. Ver planos para liberar o acesso."
                );

                if (elemento.dataset.bloqueioPlanos === "true") {
                    return;
                }

                elemento.dataset.bloqueioPlanos = "true";
                elemento.addEventListener(
                    "click",
                    () => abrirPlanos("recursos")
                );
                elemento.addEventListener("keydown", evento => {
                    if (evento.key === "Enter" || evento.key === " ") {
                        evento.preventDefault();
                        abrirPlanos("recursos");
                    }
                });
            });

        document.querySelector(".premium-free-callout")?.remove();
    }

    function bloquearPaginaPaga() {
        const recurso = RECURSOS_PREMIUM.get(paginaAtual());

        if (!recurso || possuiPremium()) {
            return;
        }

        const conteudo = document.querySelector("main");

        if (!conteudo) {
            return;
        }

        document.body.classList.add("pagina-paga-bloqueada");
        conteudo.querySelectorAll(":scope > section, :scope > form, :scope > article, :scope > details")
            .forEach(elemento => {
                elemento.classList.add("conteudo-pago-bloqueado");
                elemento.tabIndex = 0;
                elemento.setAttribute("role", "link");
                elemento.setAttribute(
                    "aria-label",
                    "Conteúdo disponível para Premium ou cortesia. Ver planos."
                );

                if (elemento.dataset.bloqueioPlanos === "true") {
                    return;
                }

                elemento.dataset.bloqueioPlanos = "true";
                elemento.addEventListener("click", () => abrirPlanos(recurso));
                elemento.addEventListener("keydown", evento => {
                    if (evento.key === "Enter" || evento.key === " ") {
                        evento.preventDefault();
                        abrirPlanos(recurso);
                    }
                });
            });

        conteudo.querySelectorAll("button, input, select, textarea")
            .forEach(campo => {
                campo.disabled = true;
            });
    }

    function aplicar() {
        sinalizarLinksPagos();
        bloquearConteudoPagoInicio();
        bloquearPaginaPaga();
    }

    window.SmartListPremium = {
        aplicar,
        possuiPremium,
        protegerPaginaAtual
    };

    protegerPaginaAtual();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", aplicar, { once: true });
    } else {
        aplicar();
    }
})();
