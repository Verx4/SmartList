(() => {
    const CHAVE = "smartListSplashExibida";
    const pagina = window.location.pathname.split("/").pop() || "index.html";

    if (pagina !== "login.html" || sessionStorage.getItem(CHAVE) === "1") {
        return;
    }

    sessionStorage.setItem(CHAVE, "1");

    const splash = document.createElement("div");
    splash.className = "smart-splash";
    splash.setAttribute("role", "status");
    splash.setAttribute("aria-label", "Carregando Smart List");
    splash.innerHTML = `
        <div class="smart-splash-particulas" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
        </div>
        <div class="smart-splash-conteudo">
            <div class="smart-splash-nome smart-splash-brilho" aria-hidden="true">
                <span class="smart-splash-smart">Smart</span>
                <span class="smart-splash-list">List</span>
            </div>
            <img class="smart-splash-logo smart-splash-brilho" src="./assets/logo/logo.png" alt="Logo Smart List">
            <p class="smart-splash-slogan">Compare preços<br>e economize sempre!</p>
            <div class="smart-splash-loader" aria-hidden="true"></div>
        </div>`;

    document.body.prepend(splash);
    document.body.style.overflow = "hidden";

    window.setTimeout(() => {
        splash.classList.add("saindo");
        document.body.style.overflow = "";
        window.setTimeout(() => splash.remove(), 500);
    }, 2400);
})();