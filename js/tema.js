(function () {

    "use strict";

    const CHAVE_TEMA = "temaPreferido";

    const TEMAS_VALIDOS = [
        "padrao",
        "claro",
        "escuro"
    ];


    function obterPreferenciaSistema() {

        return window.matchMedia("(prefers-color-scheme: light)").matches
            ? "claro"
            : "escuro";

    }


    function obterTemaPreferido() {

        const tema = localStorage.getItem(CHAVE_TEMA);

        return TEMAS_VALIDOS.includes(tema)
            ? tema
            : "padrao";

    }


    function obterTemaAplicado(preferencia = obterTemaPreferido()) {

        return preferencia === "padrao"
            ? obterPreferenciaSistema()
            : preferencia;

    }


    function aplicarTema(preferencia, salvar = true) {

        const preferenciaValida = TEMAS_VALIDOS.includes(preferencia)
            ? preferencia
            : "padrao";

        const temaAplicado = obterTemaAplicado(preferenciaValida);

        document.documentElement.dataset.theme = temaAplicado;
        document.documentElement.dataset.temaPreferido = preferenciaValida;

        if (salvar) {

            localStorage.setItem(CHAVE_TEMA, preferenciaValida);

        }

        const seletor = document.getElementById("seletorTemaGlobal");

        if (seletor) {

            seletor.value = preferenciaValida;

        }

        window.dispatchEvent(
            new CustomEvent("temaalterado", {
                detail: {
                    preferencia: preferenciaValida,
                    tema: temaAplicado
                }
            })
        );

    }


    function criarControleTema() {

        if (document.getElementById("controleTemaGlobal")) {

            return;

        }

        const controle = document.createElement("div");

        controle.id = "controleTemaGlobal";
        controle.className = "controle-tema-global";

        controle.innerHTML = `
            <label for="seletorTemaGlobal">
                <span aria-hidden="true">🎨</span>
                <span class="texto-controle-tema">Tema</span>
            </label>

            <select
                id="seletorTemaGlobal"
                aria-label="Selecionar tema do site"
            >
                <option value="padrao">Padrão do sistema</option>
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
            </select>
        `;

        document.body.appendChild(controle);

        const seletor = document.getElementById("seletorTemaGlobal");

        seletor.value = obterTemaPreferido();

        seletor.addEventListener("change", function () {

            aplicarTema(seletor.value);

        });

    }


    const mediaTema = window.matchMedia(
        "(prefers-color-scheme: light)"
    );

    mediaTema.addEventListener("change", function () {

        if (obterTemaPreferido() === "padrao") {

            aplicarTema("padrao", false);

        }

    });


    aplicarTema(obterTemaPreferido(), false);


    document.addEventListener("DOMContentLoaded", function () {

        criarControleTema();
        aplicarTema(obterTemaPreferido(), false);

    });


    window.TemaMinhaLista = {

        aplicar: aplicarTema,
        obterPreferencia: obterTemaPreferido,
        obterTemaAplicado

    };

})();