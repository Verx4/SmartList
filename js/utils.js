export function criarId(
    prefixo = "item"
) {
    if (
        globalThis.crypto?.randomUUID
    ) {
        return (
            `${prefixo}-`
            + crypto.randomUUID()
        );
    }

    return (
        `${prefixo}-`
        + `${Date.now()}-`
        + Math.random()
            .toString(16)
            .slice(2)
    );
}

export function numeroSeguro(
    valor,
    padrao = 0
) {
    const numero =
        Number(valor);

    return (
        Number.isFinite(numero)
        && numero >= 0
            ? numero
            : padrao
    );
}

export function moeda(valor) {
    return numeroSeguro(valor)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}

export function formatarData(
    valor = new Date()
) {
    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    ).format(
        new Date(valor)
    );
}

export function normalizarTexto(
    valor = ""
) {
    return String(valor)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}

export function escaparHTML(
    valor = ""
) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function arredondarMoeda(valor) {
    return (
        Math.round(
            (
                numeroSeguro(valor)
                + Number.EPSILON
            ) * 100
        ) / 100
    );
}

export function baixarJSON(
    dados,
    nomeArquivo
) {
    const arquivo = new Blob(
        [
            JSON.stringify(
                dados,
                null,
                2
            )
        ],
        {
            type: "application/json"
        }
    );

    const endereco =
        URL.createObjectURL(arquivo);

    const link =
        document.createElement("a");

    link.href = endereco;
    link.download = nomeArquivo;
    link.click();

    URL.revokeObjectURL(endereco);
}