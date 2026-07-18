import { api } from "./api.js";


function preencherStatus(
    id,
    texto,
    tipo = "neutro"
) {

    const elemento =
        document.getElementById(id);

    if (!elemento) {

        return;

    }

    elemento.textContent = texto;

    elemento.classList.remove(
        "status-ok",
        "status-alerta",
        "status-erro",
        "status-neutro"
    );

    elemento.classList.add(
        `status-${tipo}`
    );

}


function preencherTexto(id, valor) {

    const elemento =
        document.getElementById(id);

    if (elemento) {

        elemento.textContent =
            valor ?? "-";

    }

}


async function verificarMonitoramento() {

    preencherTexto(
        "ultimaVerificacao",
        new Date().toLocaleString("pt-BR")
    );

    try {

        const dados =
            await api.get(
                "/admin/monitoramento"
            );

        preencherStatus(
            "statusBackend",
            dados?.backend?.status || "Online",
            "ok"
        );

        preencherStatus(
            "statusBanco",
            dados?.banco?.status || "Online",
            dados?.banco?.saudavel === false
                ? "erro"
                : "ok"
        );

        preencherStatus(
            "statusScraper",
            dados?.scraper?.status || "Aguardando",
            dados?.scraper?.erro
                ? "erro"
                : "neutro"
        );

        preencherStatus(
            "statusMercadoPago",
            dados?.mercadoPago?.status || "Não configurado",
            dados?.mercadoPago?.configurado
                ? "ok"
                : "alerta"
        );

        preencherTexto(
            "usoCpu",
            dados?.servidor?.cpu ?? "-"
        );

        preencherTexto(
            "usoMemoria",
            dados?.servidor?.memoria ?? "-"
        );

        preencherTexto(
            "tempoAtividade",
            dados?.servidor?.tempoAtividade ?? "-"
        );

        preencherTexto(
            "ultimaExecucaoScraper",
            dados?.scraper?.ultimaExecucao
                ? new Date(
                    dados.scraper.ultimaExecucao
                ).toLocaleString("pt-BR")
                : "-"
        );

    } catch {

        preencherStatus(
            "statusBackend",
            "Offline",
            "erro"
        );

        preencherStatus(
            "statusBanco",
            "Indisponível",
            "erro"
        );

        preencherStatus(
            "statusScraper",
            "Backend necessário",
            "alerta"
        );

        preencherStatus(
            "statusMercadoPago",
            "Backend necessário",
            "alerta"
        );

    }

}


function iniciar() {

    verificarMonitoramento();

    document
        .getElementById("btnAtualizarMonitoramento")
        ?.addEventListener(
            "click",
            verificarMonitoramento
        );

    window.setInterval(
        verificarMonitoramento,
        30000
    );

}


document.addEventListener(
    "DOMContentLoaded",
    iniciar
);