(function () {
    "use strict";

    const MAPA_PALETAS = {
        padrao: "azul",
        claro: "claro",
        escuro: "preto",
        amarelo: "amarelo",
        vermelho: "vermelho",
        verde: "verde",
        roxo: "roxo",
        personalizada: "personalizada"
    };

    try {
        const aparencia = localStorage.getItem("aparenciaPreferida") || "padrao";
        const paleta = MAPA_PALETAS[aparencia] || "azul";
        document.documentElement.dataset.palette = paleta;
        document.documentElement.dataset.theme = aparencia === "claro" ? "claro" : "escuro";
    } catch (_erro) {
        document.documentElement.dataset.palette = "azul";
        document.documentElement.dataset.theme = "escuro";
    }
})();
