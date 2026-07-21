(function () {
    "use strict";

    const form = document.getElementById("formComparacao");
    const mercados = Array.from(document.querySelectorAll('input[name="supermercados"]'));
    const modos = Array.from(document.querySelectorAll('input[name="modoMercados"]'));
    const mensagem = document.getElementById("mensagemSelecaoMercados");

    if (!form || !mercados.length || !modos.length) {
        return;
    }

    function modoAtual() {
        return modos.find((campo) => campo.checked)?.value || "dois";
    }

    function selecionados() {
        return mercados.filter((campo) => campo.checked);
    }

    function atualizarCardsModo() {
        document.querySelectorAll(".modo-card").forEach((card) => {
            const radio = card.querySelector('input[name="modoMercados"]');
            card.classList.toggle("ativo", Boolean(radio?.checked));
        });
    }

    function atualizarMensagem(texto, erro = false) {
        if (!mensagem) return;
        mensagem.textContent = texto;
        mensagem.classList.toggle("erro", erro);
    }

    function aplicarModo() {
        atualizarCardsModo();

        if (modoAtual() === "todos") {
            mercados.forEach((campo) => {
                campo.checked = true;
                campo.disabled = true;
            });
            atualizarMensagem(`${mercados.length} mercados serão comparados.`);
            return;
        }

        mercados.forEach((campo) => {
            campo.disabled = false;
        });

        const quantidade = selecionados().length;
        atualizarMensagem(
            quantidade === 2
                ? "Os 2 mercados estão prontos para comparação."
                : `Escolha exatamente 2 mercados. Selecionados: ${quantidade}.`,
            quantidade > 2
        );
    }

    mercados.forEach((campo) => {
        campo.addEventListener("change", () => {
            if (modoAtual() !== "dois") return;

            const lista = selecionados();
            if (lista.length > 2) {
                campo.checked = false;
                atualizarMensagem("No modo de dois mercados, selecione somente 2 opções.", true);
                return;
            }

            aplicarModo();
        });
    });

    modos.forEach((campo) => {
        campo.addEventListener("change", aplicarModo);
    });

    form.addEventListener("submit", (evento) => {
        if (modoAtual() === "dois" && selecionados().length !== 2) {
            evento.preventDefault();
            evento.stopImmediatePropagation();
            atualizarMensagem("Selecione exatamente 2 mercados antes de comparar.", true);
            document.getElementById("listaSupermercados")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, true);

    form.addEventListener("reset", () => {
        window.setTimeout(() => {
            modos.forEach((campo) => {
                campo.checked = campo.value === "dois";
            });
            mercados.forEach((campo) => {
                campo.checked = false;
                campo.disabled = false;
            });
            aplicarModo();
        }, 0);
    });

    aplicarModo();
})();