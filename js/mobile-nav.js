(function () {
    "use strict";

    const itens = [
        ["inicio.html", "⌂", "Início"],
        ["dashboard.html", "☷", "Lista"],
        ["comparar-embalagens.html", "⚖", "Comparação"],
        ["historico.html", "◷", "Histórico"],
        ["menu.html", "☰", "Menu"]
    ];

    function paginaAtual() {
        const nome = location.pathname.split("/").pop() || "inicio.html";

        if (nome === "index.html" || nome === "") {
            return "inicio.html";
        }

        if (nome === "comparacao.html") {
            return "comparar-embalagens.html";
        }

        if (nome === "minha-economia.html") {
            return "historico.html";
        }

        return nome;
    }

    function criar() {
        document.body.classList.add("app-mobile");
        document.querySelectorAll(".mobile-nav,.app-bottom-nav")
            .forEach(elemento => elemento.remove());

        const atual = paginaAtual();
        const nav = document.createElement("nav");
        nav.className = "app-bottom-nav";
        nav.setAttribute("aria-label", "Navegação principal");
        nav.innerHTML = itens.map(([href, icone, texto]) => `
            <a href="./${href}" class="${atual === href ? "active" : ""}" ${atual === href ? 'aria-current="page"' : ""}>
                <span class="nav-icon" aria-hidden="true">${icone}</span>
                <span>${texto}</span>
            </a>
        `).join("");
        document.body.appendChild(nav);
        window.SmartListPremium?.aplicar();
    }

    function iniciar() {
        if (window.SmartListPremium) {
            criar();
            return;
        }

        const script = document.createElement("script");
        script.src = "./js/acesso-premium.js?v=4";
        script.onload = criar;
        script.onerror = criar;
        document.head.appendChild(script);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
