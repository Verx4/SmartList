const btnTemaTopoV3 = document.getElementById("btnTemaTopo");

if (btnTemaTopoV3) {
    const botaoNovo = btnTemaTopoV3.cloneNode(true);
    btnTemaTopoV3.replaceWith(botaoNovo);
    botaoNovo.addEventListener("click", abrirPainelTemaV3);
}

function obterUsuarioTemaV3() {
    try {
        return JSON.parse(localStorage.getItem("usuarioAtual"))
            || JSON.parse(localStorage.getItem("usuarioLogado"))
            || null;
    } catch (_erro) {
        return null;
    }
}

function usuarioPremiumTemaV3() {
    const usuario = obterUsuarioTemaV3();
    const tipo = String(usuario?.tipoAcesso || "").toUpperCase();
    return tipo === "PREMIUM" || tipo === "CORTESIA" || usuario?.assinaturaAtiva === true;
}

function criarPainelTemaV3() {
    let overlay = document.getElementById("themeSheetOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "themeSheetOverlay";
    overlay.className = "theme-sheet-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="theme-sheet" role="dialog" aria-modal="true" aria-labelledby="themeSheetTitle">
            <div class="theme-sheet-handle" aria-hidden="true"></div>
            <header class="theme-sheet-header">
                <h2 id="themeSheetTitle">Escolha seu tema</h2>
                <button type="button" class="theme-sheet-close" aria-label="Fechar">×</button>
            </header>

            <div class="theme-sheet-options">
                <button type="button" class="theme-sheet-option" data-theme-value="escuro">
                    <span class="theme-sheet-icon">🌙</span>
                    <span class="theme-sheet-copy"><strong>Modo escuro</strong><small>Tema com fundo escuro.</small></span>
                    <span class="theme-sheet-check"></span>
                </button>

                <button type="button" class="theme-sheet-option" data-theme-value="claro">
                    <span class="theme-sheet-icon">☀️</span>
                    <span class="theme-sheet-copy"><strong>Modo claro</strong><small>Tema com fundo claro.</small></span>
                    <span class="theme-sheet-check"></span>
                </button>

                <button type="button" class="theme-sheet-option" data-theme-value="padrao">
                    <span class="theme-sheet-icon">🔵</span>
                    <span class="theme-sheet-copy"><strong>Cor padrão</strong><small>Tema clássico do Smart List.</small></span>
                    <span class="theme-sheet-check"></span>
                </button>
            </div>

            <div class="theme-sheet-premium">
                <h3>🎨 Cores Premium</h3>
                <p>Temas exclusivos disponíveis para usuários Premium e Cortesia.</p>
                <div class="theme-sheet-colors">
                    <button type="button" class="theme-color-button" data-theme-value="roxo" aria-label="Tema roxo" style="background:#7c3aed"></button>
                    <button type="button" class="theme-color-button" data-theme-value="vermelho" aria-label="Tema vermelho" style="background:#ef4444"></button>
                    <button type="button" class="theme-color-button" data-theme-value="verde" aria-label="Tema verde" style="background:#22c55e"></button>
                    <button type="button" class="theme-color-button" data-theme-value="amarelo" aria-label="Tema amarelo" style="background:#f59e0b"></button>
                </div>
            </div>

            <p class="theme-sheet-note">✨ A mudança de tema é aplicada imediatamente.</p>
        </section>`;

    document.body.appendChild(overlay);

    const fechar = () => {
        overlay.hidden = true;
        document.body.style.overflow = "";
    };

    overlay.querySelector(".theme-sheet-close")?.addEventListener("click", fechar);
    overlay.addEventListener("click", (evento) => {
        if (evento.target === overlay) fechar();
    });
    document.addEventListener("keydown", (evento) => {
        if (evento.key === "Escape" && !overlay.hidden) fechar();
    });

    overlay.querySelectorAll("[data-theme-value]").forEach((botao) => {
        botao.addEventListener("click", () => {
            if (botao.disabled) return;
            const tema = botao.dataset.themeValue;
            if (window.TemaMinhaLista?.aplicar) {
                window.TemaMinhaLista.aplicar(tema);
                atualizarPainelTemaV3(overlay);
            }
        });
    });

    return overlay;
}

function atualizarPainelTemaV3(overlay) {
    const atual = window.TemaMinhaLista?.obterPreferencia?.() || "padrao";
    const premium = usuarioPremiumTemaV3();

    overlay.querySelectorAll(".theme-sheet-option").forEach((botao) => {
        const ativa = botao.dataset.themeValue === atual;
        botao.classList.toggle("ativa", ativa);
        const check = botao.querySelector(".theme-sheet-check");
        if (check) check.textContent = ativa ? "✓" : "";
    });

    overlay.querySelectorAll(".theme-color-button").forEach((botao) => {
        const ativa = botao.dataset.themeValue === atual;
        botao.classList.toggle("ativa", ativa);
        botao.disabled = !premium;
        botao.title = premium ? "Aplicar tema" : "Disponível no plano Premium";
    });
}

function abrirPainelTemaV3() {
    const overlay = criarPainelTemaV3();
    atualizarPainelTemaV3(overlay);
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
}

window.addEventListener("temaalterado", () => {
    const overlay = document.getElementById("themeSheetOverlay");
    if (overlay) atualizarPainelTemaV3(overlay);
});
