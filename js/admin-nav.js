(function () {
    "use strict";

    const grupos = [
        {
            titulo: "Gestão",
            itens: [
                ["dashboard", "./index.html", "🏠", "Dashboard"],
                ["usuarios", "./usuarios.html", "👥", "Usuários"],
                ["coleta-precos", "./coleta-precos.html", "💲", "Coleta de Preços"],
                ["localizacao", "./localizacao.html", "🗺️", "Uso por região"]
            ]
        },
        {
            titulo: "Dados e integrações",
            itens: [
                ["banco-de-dados", "./monitoramento.html#banco-de-dados", "🗄️", "Banco de Dados"]
            ]
        },
        {
            titulo: "Operação",
            itens: [
                ["sugestoes", "./sugestoes.html", "💬", "Sugestões"],
                ["logs", "./logs.html", "📄", "Logs"],
                ["administradores", "./usuarios.html#administradores", "👨‍💼", "Administradores"]
            ]
        }
    ];

    function criarNavegacao() {
        const sidebar = document.querySelector(".admin-sidebar");
        const nav = sidebar?.querySelector(".admin-nav");

        if (!sidebar || !nav) {
            return;
        }

        const hash = location.hash.replace(/^#/, "");
        const paginasComSecao = new Set([
            "banco-de-dados",
            "administradores"
        ]);
        const paginaAtual = paginasComSecao.has(hash)
            ? hash
            : document.body.dataset.adminPage || "";
        const marca = sidebar.querySelector(".brand, .admin-logo");

        if (marca) {
            marca.href = "./index.html";
            marca.className = "brand admin-brand";
            marca.innerHTML = `
                <img class="brand-logo" src="../assets/logo/smart-list-app.png" alt="" width="38" height="38">
                <span>Smart List</span>
            `;
        }

        const botaoMenu = document.createElement("button");
        botaoMenu.type = "button";
        botaoMenu.className = "admin-menu-toggle";
        botaoMenu.setAttribute("aria-expanded", "false");
        botaoMenu.setAttribute("aria-controls", "adminNavegacao");
        botaoMenu.innerHTML = `<span aria-hidden="true">☰</span><span>Menu</span>`;
        marca?.after(botaoMenu);

        nav.id = "adminNavegacao";
        nav.innerHTML = grupos.map(grupo => `
            <section class="admin-nav-grupo">
                <p>${grupo.titulo}</p>
                ${grupo.itens.map(([pagina, href, icone, texto]) => `
                    <a
                        href="${href}"
                        class="${pagina === paginaAtual ? "active" : ""}"
                        ${pagina === paginaAtual ? 'aria-current="page"' : ""}
                    >
                        <span class="admin-nav-icone" aria-hidden="true">${icone}</span>
                        <span>${texto}</span>
                    </a>
                `).join("")}
            </section>
        `).join("") + `
            <a class="admin-abrir-app" href="../inicio.html">
                <span aria-hidden="true">🛒</span>
                <span>Abrir Smart List</span>
            </a>
        `;

        botaoMenu.addEventListener("click", () => {
            const aberto = sidebar.classList.toggle("admin-menu-aberto");
            botaoMenu.setAttribute("aria-expanded", String(aberto));
        });

        nav.addEventListener("click", event => {
            if (!event.target.closest("a")) {
                return;
            }

            sidebar.classList.remove("admin-menu-aberto");
            botaoMenu.setAttribute("aria-expanded", "false");
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", criarNavegacao, { once: true });
    } else {
        criarNavegacao();
    }
})();
