import { api } from "./api.js";

export function definirQuantidadeSugestoes(quantidade) {
    const total = Math.max(0, Number(quantidade) || 0);

    document.querySelectorAll("[data-badge-sugestoes]").forEach(badge => {
        badge.hidden = total === 0;
        badge.textContent = total > 9 ? "9+" : String(total);
        badge.setAttribute(
            "aria-label",
            `${total} ${total === 1 ? "nova resposta" : "novas respostas"}`
        );
    });
}

export async function atualizarBadgeSugestoes() {
    if (!document.querySelector("[data-badge-sugestoes]")) {
        return;
    }

    try {
        const resposta = await api.get("/sugestoes/nao-lidas");
        definirQuantidadeSugestoes(resposta?.quantidade);
    } catch {
        definirQuantidadeSugestoes(0);
    }
}

void atualizarBadgeSugestoes();

window.addEventListener("focus", atualizarBadgeSugestoes);
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        void atualizarBadgeSugestoes();
    }
});
window.setInterval(() => {
    if (!document.hidden) {
        void atualizarBadgeSugestoes();
    }
}, 30000);
