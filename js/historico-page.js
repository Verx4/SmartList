import {
    listarHistorico
} from "./historico.js";

import {
    renderizarHistorico
} from "./render.js";

import {
    baixarJSON,
    moeda,
    normalizarTexto
} from "./utils.js";

const compras =
    listarHistorico();

const container =
    document.getElementById(
        "historicoCompleto"
    );

const busca =
    document.getElementById(
        "buscaHistorico"
    );

const periodo =
    document.getElementById(
        "periodoHistorico"
    );

function comprasFiltradas() {
    const termo =
        normalizarTexto(busca?.value);

    const dias =
        periodo?.value === "todos"
            ? Infinity
            : Number(periodo?.value || 30);

    const limite =
        Date.now() -
        dias * 86400000;

    return compras.filter(compra => {
        const dentroPeriodo =
            dias === Infinity
            || new Date(
                compra.data
            ).getTime() >= limite;

        const nomes =
            normalizarTexto(
                compra.itens
                    .map(item => item.nome)
                    .join(" ")
            );

        return (
            dentroPeriodo
            && (
                !termo
                || nomes.includes(termo)
            )
        );
    });
}

function atualizar() {
    const lista =
        comprasFiltradas();

    renderizarHistorico(
        container,
        lista
    );

    const total = lista.reduce(
        (soma, compra) =>
            soma + compra.total,
        0
    );

    const economia = lista.reduce(
        (soma, compra) =>
            soma +
            Math.max(
                0,
                -compra.diferenca
            ),
        0
    );

    const totalCampo =
        document.getElementById(
            "totalHistorico"
        );

    const economiaCampo =
        document.getElementById(
            "economiaHistorico"
        );

    const quantidadeCampo =
        document.getElementById(
            "quantidadeCompras"
        );

    if (totalCampo) {
        totalCampo.textContent =
            moeda(total);
    }

    if (economiaCampo) {
        economiaCampo.textContent =
            moeda(economia);
    }

    if (quantidadeCampo) {
        quantidadeCampo.textContent =
            String(lista.length);
    }
}

busca?.addEventListener(
    "input",
    atualizar
);

periodo?.addEventListener(
    "change",
    atualizar
);

document
    .getElementById(
        "btnExportarHistorico"
    )
    ?.addEventListener(
        "click",
        () => {
            baixarJSON(
                compras,
                "historico-compras.json"
            );
        }
    );

atualizar();