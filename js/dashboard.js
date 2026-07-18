import {
    calcularResumo
} from "./resumo.js";

import {
    estado
} from "./storage.js";

import {
    moeda
} from "./utils.js";

export function obterDadosDashboard() {
    const resumo =
        calcularResumo(estado.produtos);

    const totalHistorico =
        estado.historico.reduce(
            (soma, compra) =>
                soma + compra.total,
            0
        );

    const economiaTotal =
        estado.historico.reduce(
            (soma, compra) =>
                soma +
                Math.max(
                    0,
                    -compra.diferenca
                ),
            0
        );

    return {
        totalAtual: resumo.total,
        totalHistorico,
        economiaTotal,
        totalCompras:
            estado.historico.length
    };
}

export function renderizarDashboard() {
    const dados =
        obterDadosDashboard();

    const campos = {
        dashboardTotalAtual:
            moeda(dados.totalAtual),

        dashboardTotalHistorico:
            moeda(dados.totalHistorico),

        dashboardEconomia:
            moeda(dados.economiaTotal),

        dashboardQuantidadeCompras:
            String(dados.totalCompras)
    };

    Object.entries(campos)
        .forEach(([id, valor]) => {
            const elemento =
                document.getElementById(id);

            if (elemento) {
                elemento.textContent = valor;
            }
        });
}

renderizarDashboard();