import {
    animarAberturaModal,
    animarFechamentoModal
} from "./animations.js";

let modaisConfigurados = false;

function obterModal(id) {
    return document.getElementById(id);
}

export function abrirModal(id = "modal") {
    const modal = obterModal(id);

    if (!modal) {
        console.warn(
            `Modal "${id}" não encontrado.`
        );

        return;
    }

    modal.focoAnterior =
        document.activeElement;

    modal.hidden = false;
    modal.style.display = "flex";

    modal.removeAttribute("aria-hidden");

    document.body.classList.add(
        "modal-aberto"
    );

    animarAberturaModal(modal);

    setTimeout(() => {
        modal
            .querySelector(
                "input:not([disabled]), "
                + "select:not([disabled]), "
                + "textarea:not([disabled]), "
                + "button:not([disabled])"
            )
            ?.focus();
    }, 0);
}

export async function fecharModal(
    id = "modal",
    limparFormulario = true
) {
    const modal = obterModal(id);

    if (!modal) {
        return;
    }

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    await animarFechamentoModal(modal);
    modal.hidden = true;
    modal.style.display = "none";

    if (limparFormulario) {
        modal
            .querySelector("form")
            ?.reset();
    }

    const existeOutroModalAberto =
        document.querySelector(
            ".modal:not([hidden])"
        );

    if (!existeOutroModalAberto) {
        document.body.classList.remove(
            "modal-aberto"
        );
    }

    if (
        modal.focoAnterior
        && typeof modal.focoAnterior.focus
            === "function"
    ) {
        modal.focoAnterior.focus();
    }
}

function idModalParaAbrir(elemento) {
    if (elemento.dataset.abrirModal) {
        return elemento.dataset.abrirModal;
    }

    const botoesConhecidos = {
        btnAdicionarProduto: "modal"
    };

    return botoesConhecidos[elemento.id] || null;
}

function idModalParaFechar(elemento) {
    if (elemento.dataset.fecharModal) {
        return elemento.dataset.fecharModal;
    }

    const botoesConhecidos = {
        btnFecharModal: "modal",
        btnCancelarModal: "modal"
    };

    return botoesConhecidos[elemento.id] || null;
}

export function configurarModais() {
    if (modaisConfigurados) {
        return;
    }

    modaisConfigurados = true;

    document.addEventListener(
        "click",
        evento => {
            const botaoAbrir =
                evento.target.closest(
                    "[data-abrir-modal], "
                    + "#btnAdicionarProduto"
                );

            if (botaoAbrir) {
                const id =
                    idModalParaAbrir(
                        botaoAbrir
                    );

                if (id) {
                    evento.preventDefault();
                    abrirModal(id);
                }

                return;
            }

            const botaoFechar =
                evento.target.closest(
                    "[data-fechar-modal], "
                    + "#btnFecharModal, "
                    + "#btnCancelarModal"
                );

            if (botaoFechar) {
                const id =
                    idModalParaFechar(
                        botaoFechar
                    );

                if (id) {
                    evento.preventDefault();
                    fecharModal(id);
                }

                return;
            }

            if (
                evento.target.classList
                    .contains("modal")
            ) {
                fecharModal(
                    evento.target.id
                    || "modal"
                );
            }
        }
    );

    document.addEventListener(
        "keydown",
        evento => {
            if (evento.key !== "Escape") {
                return;
            }

            document
                .querySelectorAll(
                    ".modal:not([hidden])"
                )
                .forEach(modal => {
                    fecharModal(modal.id);
                });
        }
    );
}
