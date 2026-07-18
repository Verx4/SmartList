import { api } from "./api.js";

import {
    escaparHTML
} from "./utils.js";

export function listarSupermercados(
    cidade = ""
) {
    const parametro = cidade
        ? `?cidade=${
            encodeURIComponent(cidade)
        }`
        : "";

    return api.get(
        `/supermercados${parametro}`
    );
}

export function cadastrarSupermercado(dados) {
    return api.post(
        "/admin/supermercados",
        dados
    );
}

export function atualizarSupermercado(
    id,
    dados
) {
    return api.put(
        `/admin/supermercados/${id}`,
        dados
    );
}

export function removerSupermercado(id) {
    return api.delete(
        `/admin/supermercados/${id}`
    );
}

export function renderizarSelecaoSupermercados(
    container,
    supermercados
) {
    if (!container) return;

    container.innerHTML =
        supermercados.length
            ? supermercados.map(mercado => `
                <label class="card-selecao">

                    <input
                        type="checkbox"
                        name="supermercados"
                        value="${mercado.id}"
                    >

                    <span>
                        ${escaparHTML(
                            mercado.nome
                        )}
                    </span>

                    <small>
                        ${escaparHTML(
                            mercado.cidade
                            || ""
                        )}
                    </small>

                </label>
            `).join("")

            : `
                <p>
                    Nenhum supermercado encontrado.
                </p>
            `;
}