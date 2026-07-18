import {
    configurarModais,
    fecharModal
} from "./modal.js";

import {
    criarId,
    escaparHTML,
    normalizarTexto
} from "./utils.js";

const CHAVE =
    "sugestoesLocais";

let sugestoes;

try {
    sugestoes =
        JSON.parse(
            localStorage.getItem(CHAVE)
        ) || [];
} catch {
    sugestoes = [];
}

function salvar() {
    localStorage.setItem(
        CHAVE,
        JSON.stringify(sugestoes)
    );
}

function renderizar() {
    const termo =
        normalizarTexto(
            document.getElementById(
                "buscarSugestao"
            )?.value
        );

    const ordem =
        document.getElementById(
            "ordenarSugestoes"
        )?.value;

    const lista =
        sugestoes.filter(item =>
            normalizarTexto(
                `${item.titulo} ${item.descricao}`
            ).includes(termo)
        );

    if (ordem === "recentes") {
        lista.sort(
            (a, b) =>
                new Date(b.data)
                - new Date(a.data)
        );
    } else {
        lista.sort(
            (a, b) =>
                b.votos - a.votos
        );
    }

    const container =
        document.getElementById(
            "listaSugestoes"
        );

    if (!container) return;

    container.innerHTML =
        lista.length
            ? lista.map(item => `
                <article
                    class="card sugestao"
                    data-sugestao-id="${item.id}"
                >

                    <span>
                        ${escaparHTML(
                            item.categoria
                        )}
                    </span>

                    <h3>
                        ${escaparHTML(
                            item.titulo
                        )}
                    </h3>

                    <p>
                        ${escaparHTML(
                            item.descricao
                        )}
                    </p>

                    <button
                        type="button"
                        data-votar
                    >
                        👍
                        <span>
                            ${item.votos}
                        </span>
                    </button>

                </article>
            `).join("")

            : `
                <p>
                    Nenhuma sugestão enviada.
                </p>
            `;
}

document
    .getElementById("formSugestao")
    ?.addEventListener(
        "submit",
        evento => {
            evento.preventDefault();

            const dados =
                Object.fromEntries(
                    new FormData(
                        evento.currentTarget
                    )
                );

            sugestoes.push({
                id:
                    criarId("sugestao"),

                ...dados,

                votos: 0,

                data:
                    new Date()
                        .toISOString()
            });

            salvar();

            evento.currentTarget.reset();

            fecharModal(
                "modalSugestao"
            );

            renderizar();
        }
    );

document.addEventListener(
    "click",
    evento => {
        const botao =
            evento.target.closest(
                "[data-votar]"
            );

        if (!botao) return;

        const id =
            botao.closest(
                "[data-sugestao-id]"
            )?.dataset.sugestaoId;

        const sugestao =
            sugestoes.find(
                item =>
                    item.id === id
            );

        if (!sugestao) return;

        sugestao.votos++;

        salvar();
        renderizar();
    }
);

document
    .getElementById(
        "buscarSugestao"
    )
    ?.addEventListener(
        "input",
        renderizar
    );

document
    .getElementById(
        "ordenarSugestoes"
    )
    ?.addEventListener(
        "change",
        renderizar
    );

configurarModais();
renderizar();