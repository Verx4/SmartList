(function () {
    "use strict";

    function obterUsuario() {
        try {
            return JSON.parse(
                localStorage.getItem("usuarioAtual")
                || localStorage.getItem("usuarioLogado")
                || "{}"
            );
        } catch {
            return {};
        }
    }

    function adicionarRetorno() {
        const usuario = obterUsuario();
        if (String(usuario?.perfil || "").toUpperCase() !== "ADMIN") {
            return;
        }

        const topoInicio = document.querySelector(".inicio-topbar-acoes");
        if (topoInicio && !document.getElementById("voltarPainelAdmin")) {
            const link = document.createElement("a");
            link.id = "voltarPainelAdmin";
            link.className = "admin-retorno-inicio";
            link.href = "./admin/index.html";
            link.title = "Voltar ao painel administrativo";
            link.setAttribute("aria-label", "Voltar ao painel ADM");
            link.textContent = "ADM";
            topoInicio.prepend(link);
        }

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", adicionarRetorno, { once: true });
    } else {
        adicionarRetorno();
    }
})();
