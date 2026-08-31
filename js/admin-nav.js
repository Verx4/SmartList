(function () {
    "use strict";

    const grupos = [
        {
            titulo: "Gestão",
            itens: [
                ["dashboard", "./index.html", "🏠", "Dashboard"],
                ["usuarios", "./usuarios.html", "👥", "Usuários"],
                ["planos", "./planos.html", "💳", "Gestão de Planos"],
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
                ["administradores", "./administradores.html", "👨‍💼", "Administradores"]
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
            <div class="admin-theme-selector">
                <label for="adminThemeSelect">
                    <span aria-hidden="true">🎨</span>
                    <span>Aparência</span>
                </label>
                <select id="adminThemeSelect" data-admin-theme-select>
                    <option value="padrao">Modo padrão</option>
                    <option value="escuro">Modo escuro</option>
                    <option value="claro">Modo claro</option>
                </select>
            </div>
            <a class="admin-abrir-app" href="../inicio.html">
                <span aria-hidden="true">🛒</span>
                <span>Abrir Smart List</span>
            </a>
            <a class="admin-abrir-app" href="../login.html" data-admin-logout>
                <span aria-hidden="true">🚪</span>
                <span>SAIR DA CONTA</span>
            </a>
        `;

        const seletorTema = nav.querySelector("[data-admin-theme-select]");

        function atualizarSeletorTema() {
            const aparencia = document.documentElement.dataset.aparencia || "padrao";
            seletorTema.value = ["padrao", "escuro", "claro"].includes(aparencia)
                ? aparencia
                : "padrao";
        }

        seletorTema.addEventListener("change", () => {
            window.TemaMinhaLista?.aplicar(seletorTema.value);
            atualizarSeletorTema();
        });
        window.addEventListener("temaalterado", atualizarSeletorTema);
        atualizarSeletorTema();

        nav.querySelector("[data-admin-logout]")?.addEventListener("click", event => {
            event.preventDefault();
            [localStorage, sessionStorage].forEach(armazenamento => {
                armazenamento.removeItem("token");
                armazenamento.removeItem("accessToken");
                armazenamento.removeItem("refreshToken");
            });
            localStorage.removeItem("usuarioAtual");
            location.assign("../login.html");
        });

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
