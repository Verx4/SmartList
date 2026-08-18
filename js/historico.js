import {
    categoriaValida,
    detectarCategoria
} from "./categorias.js";

import {
    estado,
    salvarDados
} from "./storage.js";

import {
    criarId,
    numeroSeguro
} from "./utils.js";

import {
    totalItensComprados
} from "./historico-calculos.js";

export function migrarHistoricoAntigo() {
    if (!Array.isArray(estado.historico)) {
        estado.historico = [];
    }

    estado.historico =
        estado.historico.map(compra => ({
            id:
                compra.id
                || criarId("compra"),

            data:
                compra.data
                || new Date().toISOString(),

            total:
                numeroSeguro(compra.total),

            totalItens:
                totalItensComprados(compra)
                || numeroSeguro(compra.totalItens),

            totalPeso:
                numeroSeguro(
                    compra.totalPeso
                ),

            diferenca:
                Number(compra.diferenca) || 0,

            percentual:
                Number(compra.percentual) || 0,

            itens:
                Array.isArray(compra.itens)
                    ? compra.itens.map(
                        item => ({
                            ...item,

                            categoria:
                                categoriaValida(
                                    item.categoria
                                )
                                    ? item.categoria
                                    : detectarCategoria(
                                        item.nome,
                                        item.medida || (
                                            numeroSeguro(item.peso) > 0
                                                ? "kg"
                                                : "unidade"
                                        )
                                    ),

                            quantidade:
                                numeroSeguro(
                                    item.quantidade
                                ),

                            peso:
                                numeroSeguro(
                                    item.peso
                                ),

                            preco:
                                numeroSeguro(
                                    item.preco
                                    ?? item.precoAtual
                                ),

                            precoUnitario:
                                numeroSeguro(
                                    item.precoUnitario
                                    ?? item.preco
                                    ?? item.precoAtual
                                )
                        })
                    )
                    : []
        }));

    salvarDados();
}

export function listarHistorico() {
    return [
        ...estado.historico
    ].reverse();
}

export function limparHistorico() {
    estado.historico = [];
    salvarDados();
}

export function zerarUltimaCompra() {
    estado.ultimaCompra = 0;
    salvarDados();
}
