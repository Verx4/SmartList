const CHAVES = Object.freeze({
    produtos: "produtos",
    historico: "historicoCompras",
    ultimaCompra: "ultimaCompra",
    favoritos: "favoritos",
    preferencias: "preferencias"
});

function lerJSON(chave, padrao) {
    try {
        const valor =
            localStorage.getItem(chave);

        return valor === null
            ? padrao
            : JSON.parse(valor);
    } catch (erro) {
        console.warn(
            `Não foi possível ler ${chave}.`,
            erro
        );

        return padrao;
    }
}

function lerNumero(chave) {
    const valor =
        Number(
            localStorage.getItem(chave)
        );

    return (
        Number.isFinite(valor)
        && valor >= 0
            ? valor
            : 0
    );
}

export const estado = {
    produtos:
        lerJSON(
            CHAVES.produtos,
            []
        ),

    historico:
        lerJSON(
            CHAVES.historico,
            []
        ),

    ultimaCompra:
        lerNumero(
            CHAVES.ultimaCompra
        ),

    favoritos:
        lerJSON(
            CHAVES.favoritos,
            {
                produtos: [],
                supermercados: []
            }
        ),

    preferencias:
        lerJSON(
            CHAVES.preferencias,
            {}
        )
};

export function salvarDados() {
    localStorage.setItem(
        CHAVES.produtos,
        JSON.stringify(
            estado.produtos
        )
    );

    localStorage.setItem(
        CHAVES.historico,
        JSON.stringify(
            estado.historico
        )
    );

    localStorage.setItem(
        CHAVES.ultimaCompra,
        String(
            estado.ultimaCompra
        )
    );

    localStorage.setItem(
        CHAVES.favoritos,
        JSON.stringify(
            estado.favoritos
        )
    );

    localStorage.setItem(
        CHAVES.preferencias,
        JSON.stringify(
            estado.preferencias
        )
    );
}

export function limparDadosLocais() {
    Object.values(CHAVES)
        .forEach(chave => {
            localStorage.removeItem(chave);
        });
}

export function exportarDadosLocais() {
    return {
        produtos: estado.produtos,
        historico: estado.historico,
        ultimaCompra:
            estado.ultimaCompra,
        favoritos: estado.favoritos,
        preferencias:
            estado.preferencias
    };
}