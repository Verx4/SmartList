(function () {
    "use strict";

    if (window.TemaMinhaLista?.paletasPremium) {
        return;
    }

    const CHAVE_APARENCIA = "aparenciaPreferida";
    const CHAVE_COR_PERSONALIZADA = "corTemaPersonalizada";
    const APARENCIA_PADRAO = "padrao";
    const APARENCIAS_VALIDAS = [
        "padrao",
        "claro",
        "escuro",
        "amarelo",
        "vermelho",
        "verde",
        "roxo",
        "personalizada"
    ];
    const APARENCIAS_PREMIUM = new Set([
        "amarelo",
        "vermelho",
        "verde",
        "roxo",
        "personalizada"
    ]);
    const CONFIGURACOES = {
        padrao: { paleta: "azul", tema: "escuro", corNavegador: "#0b1220" },
        claro: { paleta: "claro", tema: "claro", corNavegador: "#f3f6fb" },
        escuro: { paleta: "preto", tema: "escuro", corNavegador: "#050505" },
        amarelo: { paleta: "amarelo", tema: "escuro", corNavegador: "#171305" },
        vermelho: { paleta: "vermelho", tema: "escuro", corNavegador: "#18090b" },
        verde: { paleta: "verde", tema: "escuro", corNavegador: "#07150f" },
        roxo: { paleta: "roxo", tema: "escuro", corNavegador: "#120a1f" },
        personalizada: { paleta: "personalizada", tema: "escuro", corNavegador: "#071520" }
    };

    const VARIAVEIS_PERSONALIZADAS = [
        "--cor-fundo", "--cor-fundo-rgb", "--cor-superficie", "--cor-superficie-rgb",
        "--cor-superficie-secundaria", "--cor-superficie-hover", "--cor-texto",
        "--cor-texto-secundario", "--cor-borda", "--cor-primaria", "--cor-primaria-hover",
        "--cor-primaria-rgb", "--cor-destaque", "--cor-destaque-rgb", "--cor-texto-botao"
    ];

    function corPersonalizada() {
        const cor = localStorage.getItem(CHAVE_COR_PERSONALIZADA) || "#0ea5e9";
        return /^#[0-9a-f]{6}$/i.test(cor) ? cor : "#0ea5e9";
    }

    function rgb(hex) {
        const valor = parseInt(hex.slice(1), 16);
        return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
    }

    function misturar(hex, destino, proporcao) {
        const origem = rgb(hex);
        const alvo = rgb(destino);
        const canais = origem.map((canal, indice) => Math.round(canal * (1 - proporcao) + alvo[indice] * proporcao));
        return `#${canais.map(canal => canal.toString(16).padStart(2, "0")).join("")}`;
    }

    function limparEstiloPersonalizado() {
        VARIAVEIS_PERSONALIZADAS.forEach(nome => document.documentElement.style.removeProperty(nome));
    }

    function aplicarEstiloPersonalizado(hex) {
        const primariaRgb = rgb(hex);
        const fundo = misturar(hex, "#030712", 0.88);
        const superficie = misturar(hex, "#08111f", 0.78);
        const secundaria = misturar(hex, "#111827", 0.68);
        const destaque = misturar(hex, "#ffffff", 0.24);
        const luminosidade = primariaRgb.reduce((soma, canal, indice) => soma + canal * [0.299, 0.587, 0.114][indice], 0);
        const valores = {
            "--cor-fundo": fundo,
            "--cor-fundo-rgb": rgb(fundo).join(", "),
            "--cor-superficie": superficie,
            "--cor-superficie-rgb": rgb(superficie).join(", "),
            "--cor-superficie-secundaria": secundaria,
            "--cor-superficie-hover": misturar(secundaria, "#ffffff", 0.08),
            "--cor-texto": "#ffffff",
            "--cor-texto-secundario": "#b7c2d0",
            "--cor-borda": misturar(hex, "#64748b", 0.62),
            "--cor-primaria": hex,
            "--cor-primaria-hover": misturar(hex, "#000000", 0.18),
            "--cor-primaria-rgb": primariaRgb.join(", "),
            "--cor-destaque": destaque,
            "--cor-destaque-rgb": rgb(destaque).join(", "),
            "--cor-texto-botao": luminosidade > 155 ? "#071018" : "#ffffff"
        };
        Object.entries(valores).forEach(([nome, valor]) => document.documentElement.style.setProperty(nome, valor));
        atualizarCorNavegador(fundo);
    }

    function obterUsuario() {
        for (const chave of ["usuarioAtual", "usuarioLogado"]) {
            try {
                const usuario = JSON.parse(localStorage.getItem(chave));
                if (usuario) {
                    return usuario;
                }
            } catch (_erro) {
                // Continua procurando outra chave de sessão.
            }
        }

        return null;
    }

    function possuiCoresPremium(usuario = obterUsuario()) {
        const tipoAcesso = String(usuario?.tipoAcesso || "").toUpperCase();

        return tipoAcesso === "PREMIUM"
            || tipoAcesso === "CORTESIA"
            || usuario?.assinaturaAtiva === true;
    }

    function migrarPreferenciaAnterior() {
        const anterior = localStorage.getItem("paletaPreferida");
        const migracoes = {
            azul: "padrao",
            preto: "escuro",
            amarelo: "amarelo",
            vermelho: "vermelho",
            verde: "verde",
            roxo: "roxo"
        };

        return migracoes[anterior] || APARENCIA_PADRAO;
    }

    function obterAparenciaSalva() {
        const aparencia = localStorage.getItem(CHAVE_APARENCIA)
            || migrarPreferenciaAnterior();

        return APARENCIAS_VALIDAS.includes(aparencia)
            ? aparencia
            : APARENCIA_PADRAO;
    }

    function obterAparenciaPermitida() {
        const aparencia = obterAparenciaSalva();

        return APARENCIAS_PREMIUM.has(aparencia) && !possuiCoresPremium()
            ? APARENCIA_PADRAO
            : aparencia;
    }

    function atualizarCorNavegador(cor) {
        const meta = document.querySelector('meta[name="theme-color"]');

        if (meta) {
            meta.content = cor;
        }
    }

    function atualizarOpcaoAtiva(aparencia) {
        document.querySelectorAll("[data-aparencia]").forEach((opcao) => {
            const ativa = opcao.dataset.aparencia === aparencia;
            opcao.classList.toggle("ativa", ativa);
            opcao.setAttribute("aria-pressed", String(ativa));
        });
    }

    function aplicarAparencia(aparencia, salvar = true) {
        const aparenciaValida = APARENCIAS_VALIDAS.includes(aparencia)
            ? aparencia
            : APARENCIA_PADRAO;
        const permitida = APARENCIAS_PREMIUM.has(aparenciaValida)
            && !possuiCoresPremium()
            ? APARENCIA_PADRAO
            : aparenciaValida;
        const configuracao = CONFIGURACOES[permitida];

        limparEstiloPersonalizado();

        document.documentElement.dataset.theme = configuracao.tema;
        document.documentElement.dataset.palette = configuracao.paleta;
        document.documentElement.dataset.aparencia = permitida;
        document.documentElement.dataset.coresPremium = String(possuiCoresPremium());
        atualizarCorNavegador(configuracao.corNavegador);
        if (permitida === "personalizada") {
            aplicarEstiloPersonalizado(corPersonalizada());
        }
        atualizarOpcaoAtiva(permitida);

        if (salvar) {
            localStorage.setItem(CHAVE_APARENCIA, permitida);
        }

        window.dispatchEvent(new CustomEvent("temaalterado", {
            detail: {
                preferencia: permitida,
                tema: configuracao.tema,
                paleta: configuracao.paleta,
                premium: possuiCoresPremium()
            }
        }));

        return permitida;
    }

    function linhaOpcao(valor, icone, titulo, descricao, premium = false) {
        const bloqueada = premium && !possuiCoresPremium();

        return [
            `<button type="button" class="opcao-aparencia`,
            bloqueada ? " bloqueada" : "",
            `" data-aparencia="`, valor, `"`,
            bloqueada ? " disabled" : "",
            ` aria-pressed="false">`,
            `<span class="icone-opcao-aparencia" aria-hidden="true">`, icone, "</span>",
            `<span class="texto-opcao-aparencia"><strong>`, titulo, "</strong>",
            "<small>", descricao, "</small></span>",
            premium
                ? `<span class="selo-opcao-premium">` + (bloqueada ? "🔒" : "Premium") + "</span>"
                : "",
            "</button>"
        ].join("");
    }

    function fecharMenu(controle) {
        const botao = controle.querySelector("#botaoTemaGlobal");
        const menu = controle.querySelector("#menuTemaGlobal");

        menu.hidden = true;
        botao.setAttribute("aria-expanded", "false");
        controle.classList.remove("aberto");
    }

    function deveExibirControleTema() {
        return document.body
            && (
                document.body.querySelector(".inicio-shell")
                || document.body.dataset.controleTema === "global"
            )
            && !document.body.classList.contains("sem-controle-tema")
            && document.body.dataset.controleTema !== "oculto";
    }

    function criarControleTema() {
        if (!deveExibirControleTema() || document.getElementById("controleTemaGlobal")) {
            return;
        }

        const controle = document.createElement("div");
        controle.id = "controleTemaGlobal";
        controle.className = "controle-tema-global";
        const opcoesPremium = possuiCoresPremium()
            ? [
                `<div class="divisor-menu-tema"></div>`,
                `<div class="cor-personalizada-premium"><label for="corTemaPersonalizada">Escolha seu novo tema</label>`,
                `<div><input id="corTemaPersonalizada" type="color" value="`, corPersonalizada(), `">`,
                `<button id="aplicarCorPersonalizada" type="button">APLICAR TEMA</button></div></div>`
            ]
            : [];
        controle.innerHTML = [
            `<button type="button" id="botaoTemaGlobal" class="botao-tema-global"`,
            ` aria-label="Abrir opções de aparência" aria-controls="menuTemaGlobal"`,
            ` aria-expanded="false">🎨</button>`,
            `<div id="menuTemaGlobal" class="menu-tema-global" hidden>`,
            `<p class="titulo-menu-tema">Aparência</p>`,
            linhaOpcao("padrao", "🔵", "Padrão do app", "Volta às cores originais"),
            linhaOpcao("claro", "☀️", "Modo claro", "Interface branca"),
            linhaOpcao("escuro", "🌙", "Modo escuro", "Interface preta"),
            ...opcoesPremium,
            "</div>"
        ].join("");

        document.body.appendChild(controle);

        const botao = controle.querySelector("#botaoTemaGlobal");
        const menu = controle.querySelector("#menuTemaGlobal");

        botao.addEventListener("click", () => {
            const abrir = menu.hidden;
            menu.hidden = !abrir;
            botao.setAttribute("aria-expanded", String(abrir));
            controle.classList.toggle("aberto", abrir);
        });

        menu.addEventListener("click", (evento) => {
            if (evento.target.closest("#aplicarCorPersonalizada")) {
                const seletor = menu.querySelector("#corTemaPersonalizada");
                localStorage.setItem(CHAVE_COR_PERSONALIZADA, seletor.value);
                aplicarAparencia("personalizada");
                fecharMenu(controle);
                botao.focus();
                return;
            }
            const opcao = evento.target.closest("[data-aparencia]");

            if (!opcao || opcao.disabled) {
                return;
            }

            aplicarAparencia(opcao.dataset.aparencia);
            fecharMenu(controle);
            botao.focus();
        });

        document.addEventListener("click", (evento) => {
            if (!controle.contains(evento.target)) {
                fecharMenu(controle);
            }
        });

        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && !menu.hidden) {
                fecharMenu(controle);
                botao.focus();
            }
        });

        atualizarOpcaoAtiva(obterAparenciaPermitida());
    }

    function atualizarAcesso() {
        document.getElementById("controleTemaGlobal")?.remove();
        aplicarAparencia(obterAparenciaSalva(), false);
        criarControleTema();
    }

    aplicarAparencia(obterAparenciaPermitida(), false);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", criarControleTema, { once: true });
    } else {
        criarControleTema();
    }

    window.addEventListener("storage", function (evento) {
        if (
            evento.key === "usuarioAtual"
            || evento.key === "usuarioLogado"
            || evento.key === CHAVE_APARENCIA
            || evento.key === CHAVE_COR_PERSONALIZADA
        ) {
            atualizarAcesso();
        }
    });
    window.addEventListener("usuarioatualizado", atualizarAcesso);

    window.TemaMinhaLista = {
        aplicar: aplicarAparencia,
        obterPreferencia: obterAparenciaPermitida,
        obterTemaAplicado: obterAparenciaPermitida,
        obterPaleta: obterAparenciaPermitida,
        possuiCoresPremium,
        paletasPremium: true
    };
})();
