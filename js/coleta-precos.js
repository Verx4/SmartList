import { api } from "./api.js";

const CHAVE_PENDENTES = "coletasPrecosPendentes";

function lerPendentes() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_PENDENTES));
        return Array.isArray(dados) ? dados : [];
    } catch {
        return [];
    }
}

function salvarPendentes(pendentes) {
    localStorage.setItem(CHAVE_PENDENTES, JSON.stringify(pendentes));
}

function possuiSessao() {
    return Boolean(
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token")
    );
}

function montarPayload(compra) {
    return {
        compraId: String(compra.id),
        realizadaEm: compra.data,
        mercado: compra.supermercado,
        economia: Number(compra.economia || 0),
        itens: (compra.itens || []).map(item => {
            const porPeso = String(item.medida || "").toLowerCase() === "kg";
            return {
                itemId: String(item.id),
                nome: item.nome,
                categoria: item.categoria,
                quantidade: porPeso ? Number(item.peso || 0) : Number(item.quantidade || 0),
                unidade: porPeso ? "kg" : "unidade",
                precoUnitario: Number(item.precoUnitario ?? item.preco ?? 0),
                subtotal: Number(item.subtotal || 0)
            };
        }).filter(item => item.nome && item.precoUnitario > 0 && item.subtotal > 0)
    };
}

export function enfileirarColetaPreco(compra) {
    const payload = montarPayload(compra);

    if (!payload.compraId || !payload.itens.length) return;

    const pendentes = lerPendentes().filter(item => item.compraId !== payload.compraId);
    pendentes.push(payload);
    salvarPendentes(pendentes.slice(-50));
}

export async function sincronizarColetasPendentes() {
    if (!possuiSessao()) return { sincronizadas: 0, pendentes: lerPendentes().length };

    const pendentes = lerPendentes();
    let sincronizadas = 0;

    for (const coleta of [...pendentes]) {
        const controlador = new AbortController();
        const limite = window.setTimeout(() => controlador.abort(), 12000);

        try {
            await api.post("/coleta-precos/compras", coleta, { signal: controlador.signal });
            const atuais = lerPendentes().filter(item => item.compraId !== coleta.compraId);
            salvarPendentes(atuais);
            sincronizadas += 1;
        } catch (erro) {
            const status = Number(erro?.status || 0);

            if (status >= 400 && status < 500 && status !== 401 && status !== 403) {
                const atuais = lerPendentes().filter(
                    item => item.compraId !== coleta.compraId
                );
                salvarPendentes(atuais);
                continue;
            }

            if (status === 401 || status === 403) {
                break;
            }

            // Falhas temporárias permanecem na fila, sem bloquear compras seguintes.
        } finally {
            window.clearTimeout(limite);
        }
    }

    return { sincronizadas, pendentes: lerPendentes().length };
}
