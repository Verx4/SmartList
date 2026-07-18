import {
    estado
} from "./storage.js";

import {
    moeda
} from "./utils.js";

function comprasDoPeriodo(periodo) {
    const dias = {
        mes: 30,
        trimestre: 90,
        ano: 365
    }[periodo] || 30;

    const limite =
        Date.now() -
        dias * 86400000;

    return estado.historico.filter(
        compra =>
            new Date(
                compra.data
            ).getTime() >= limite
    );
}

function atualizar() {
    const periodo =
        document.getElementById(
            "periodoRelatorio"
        )?.value || "mes";

    const compras =
        comprasDoPeriodo(periodo);

    const gasto = compras.reduce(
        (soma, compra) =>
            soma + compra.total,
        0
    );

    const economia = compras.reduce(
        (soma, compra) =>
            soma +
            Math.max(
                0,
                -compra.diferenca
            ),
        0
    );

    const itens = compras.reduce(
        (soma, compra) =>
            soma +
            compra.totalItens,
        0
    );

    const totalCampo =
        document.getElementById(
            "relatorioTotalGasto"
        );

    const economiaCampo =
        document.getElementById(
            "relatorioEconomia"
        );

    const mediaCampo =
        document.getElementById(
            "relatorioMedia"
        );

    if (totalCampo) {
        totalCampo.textContent =
            moeda(gasto);
    }

    if (economiaCampo) {
        economiaCampo.textContent =
            moeda(economia);
    }

    if (mediaCampo) {
        mediaCampo.textContent =
            moeda(
                itens
                    ? gasto / itens
                    : 0
            );
    }
}

document
    .getElementById(
        "periodoRelatorio"
    )
    ?.addEventListener(
        "change",
        atualizar
    );

document
    .getElementById(
        "btnExportarRelatorio"
    )
    ?.addEventListener(
        "click",
        () => print()
    );

atualizar();