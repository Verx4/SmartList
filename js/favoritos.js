import {
    estado,
    salvarDados
} from "./storage.js";

import {
    escaparHTML,
    normalizarTexto
} from "./utils.js";

export function favoritarProduto(id) {
    if (
        !estado.favoritos.produtos
            .includes(id)
    ) {
        estado.favoritos.produtos.push(id);
        salvarDados();
    }
}

export function removerProdutoFavorito(id) {
    estado.favoritos.produtos =
        estado.favoritos.produtos.filter(
            favorito => favorito !== id
        );

    salvarDados();
}

export function favoritarSupermercado(id) {
    if (
        !estado.favoritos.supermercados
            .includes(id)
    ) {
        estado.favoritos.supermercados
            .push(id);

        salvarDados();
    }
}

export function removerSupermercadoFavorito(id) {
    estado.favoritos.supermercados =
        estado.favoritos.supermercados.filter(
            favorito => favorito !== id
        );

    salvarDados();
}

function renderizarProdutosFavoritos() {
    const container =
        document.getElementById(
            "listaProdutosFavoritos"
        );

    if (!container) return;

    const termo = normalizarTexto(
        document.getElementById(
            "buscarFavorito"
        )?.value
    );

    const produtos =
        estado.produtos.filter(produto =>
            estado.favoritos.produtos
                .includes(produto.id)
            && normalizarTexto(
                produto.nome
            ).includes(termo)
        );

    container.innerHTML = produtos.length
        ? produtos.map(produto => `
            <article
                class="card"
                data-favorito-id="${produto.id}"
            >

                <h3>
                    ${escaparHTML(produto.nome)}
                </h3>

                <p>
                    ${escaparHTML(
                        produto.categoria
                    )}
                </p>

                <button
                    type="button"
                    data-remover-favorito
                >
                    Remover dos favoritos
                </button>

            </article>
        `).join("")

        : `
            <p>
                Você ainda não favoritou produtos.
            </p>
        `;
}

document
    .querySelectorAll("[data-aba]")
    .forEach(botao => {
        botao.addEventListener(
            "click",
            () => {
                document
                    .querySelectorAll(
                        "[data-aba]"
                    )
                    .forEach(item => {
                        item.setAttribute(
                            "aria-selected",
                            String(item === botao)
                        );
                    });

                const produtos =
                    document.getElementById(
                        "favoritosProdutos"
                    );

                const supermercados =
                    document.getElementById(
                        "favoritosSupermercados"
                    );

                if (produtos) {
                    produtos.hidden =
                        botao.dataset.aba !==
                        "produtos";
                }

                if (supermercados) {
                    supermercados.hidden =
                        botao.dataset.aba !==
                        "supermercados";
                }
            }
        );
    });

document
    .getElementById("buscarFavorito")
    ?.addEventListener(
        "input",
        renderizarProdutosFavoritos
    );

document.addEventListener("click", evento => {
    const botao =
        evento.target.closest(
            "[data-remover-favorito]"
        );

    if (!botao) return;

    const id =
        botao.closest(
            "[data-favorito-id]"
        )?.dataset.favoritoId;

    removerProdutoFavorito(id);
    renderizarProdutosFavoritos();
});

renderizarProdutosFavoritos();