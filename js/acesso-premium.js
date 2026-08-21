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
        return usuario?.assinaturaAtiva === true
            || String(usuario?.tipoAcesso || "").toUpperCase() === "PREMIUM";
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
            document.documentElement.style.visibility = "hidden";
            window.location.replace(urlPlanos(recurso));
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

    function bloquearLinksPremium() {
        if (possuiPremium()) {
            return;
        }

        document.querySelectorAll("a[href]").forEach(link => {
            const recurso = recursoDoLink(link);

            if (!recurso) {
                return;
            }

            link.href = urlPlanos(recurso);
            link.classList.add("premium-link-bloqueado");
            link.dataset.recursoPremium = recurso;

            if (!link.querySelector(".premium-selo")) {
                const selo = document.createElement("small");
                selo.className = "premium-selo";
                selo.textContent = "Premium";
                link.appendChild(selo);
            }
        });
    }

    function aplicarInicioFree() {
        if (paginaAtual() !== "inicio.html" || possuiPremium()) {
            return;
        }

        document.querySelectorAll("[data-premium-content]")
            .forEach(elemento => {
                elemento.hidden = true;
            });

        if (document.querySelector(".premium-free-callout")) {
            return;
        }

        const referencia = document.querySelector(".inicio-saudacao");

        if (!referencia) {
            return;
        }

        const aviso = document.createElement("section");
        aviso.className = "premium-free-callout";
        aviso.innerHTML = `
            <span>Recursos Premium</span>
            <h2>Histórico, Comparação e Minha Economia</h2>
            <p>No plano Free, você cria e organiza sua lista. Assine o Premium para acessar análises e comparações.</p>
            <a href="./assinatura.html?acesso=premium&recurso=recursos">Conhecer o Premium</a>
        `;
        referencia.insertAdjacentElement("afterend", aviso);
    }

    function aplicar() {
        bloquearLinksPremium();
        aplicarInicioFree();
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
