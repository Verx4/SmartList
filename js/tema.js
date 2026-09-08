(function () {
    "use strict";

    const CHAVE_PROTECAO_ZOOM = "__smartListProtecaoZoomAtiva";

    function impedirZoom(evento) {
        if (evento.cancelable) {
            evento.preventDefault();
        }
    }

    function configurarProtecaoZoom() {
        if (window[CHAVE_PROTECAO_ZOOM]) {
            return;
        }

        window[CHAVE_PROTECAO_ZOOM] = true;

        const seletorInterativo = [
            "button",
            "a",
            "input",
            "select",
            "textarea",
            "label",
            "summary",
            "details",
            "[role='button']",
            "[onclick]",
            "[tabindex]",
            "[contenteditable='true']",
            "[data-acao]",
            "[data-action]"
        ].join(",");
        let ultimoToque = 0;
        let ultimoAlvo = null;

        const bloquearMultitoque = (evento) => {
            if (evento.touches?.length > 1) {
                impedirZoom(evento);
            }
        };

        document.addEventListener("touchstart", bloquearMultitoque, {
            passive: false,
            capture: true
        });
        document.addEventListener("touchmove", bloquearMultitoque, {
            passive: false,
            capture: true
        });

        ["gesturestart", "gesturechange", "gestureend"].forEach((tipo) => {
            document.addEventListener(tipo, impedirZoom, { passive: false });
        });

        document.addEventListener("dblclick", impedirZoom, { passive: false });
        document.addEventListener("wheel", (evento) => {
            if (evento.ctrlKey) {
                impedirZoom(evento);
            }
        }, { passive: false });

        document.addEventListener("touchend", (evento) => {
            const agora = Date.now();
            const alvo = evento.target instanceof Element
                ? evento.target
                : null;
            const toqueDuploNaoInterativo = alvo
                && alvo === ultimoAlvo
                && agora - ultimoToque <= 300
                && !alvo.closest(seletorInterativo);

            if (toqueDuploNaoInterativo) {
                impedirZoom(evento);
            }

            ultimoToque = agora;
            ultimoAlvo = alvo;
        }, { passive: false });
    }

    configurarProtecaoZoom();
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

    function limitar(valor, minimo, maximo) {
        return Math.min(maximo, Math.max(minimo, valor));
    }

    function hexParaHsv(hex) {
        const [vermelho, verde, azul] = rgb(hex).map(canal => canal / 255);
        const maximo = Math.max(vermelho, verde, azul);
        const minimo = Math.min(vermelho, verde, azul);
        const diferenca = maximo - minimo;
        let matiz = 0;

        if (diferenca) {
            if (maximo === vermelho) {
                matiz = 60 * (((verde - azul) / diferenca) % 6);
            } else if (maximo === verde) {
                matiz = 60 * ((azul - vermelho) / diferenca + 2);
            } else {
                matiz = 60 * ((vermelho - verde) / diferenca + 4);
            }
        }

        return {
            h: (matiz + 360) % 360,
            s: maximo ? diferenca / maximo : 0,
            v: maximo
        };
    }

    function hsvParaHex(h, s, v) {
        const matiz = ((h % 360) + 360) % 360;
        const saturacao = limitar(s, 0, 1);
        const brilho = limitar(v, 0, 1);
        const croma = brilho * saturacao;
        const intermediario = croma * (1 - Math.abs((matiz / 60) % 2 - 1));
        const ajuste = brilho - croma;
        let canais;

        if (matiz < 60) canais = [croma, intermediario, 0];
        else if (matiz < 120) canais = [intermediario, croma, 0];
        else if (matiz < 180) canais = [0, croma, intermediario];
        else if (matiz < 240) canais = [0, intermediario, croma];
        else if (matiz < 300) canais = [intermediario, 0, croma];
        else canais = [croma, 0, intermediario];

        return `#${canais.map(canal => Math.round((canal + ajuste) * 255)
            .toString(16).padStart(2, "0")).join("")}`;
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
        const seletor = controle.querySelector("#modalSeletorCor");

        menu.hidden = true;
        if (seletor) {
            seletor.hidden = true;
        }
        botao.setAttribute("aria-expanded", "false");
        controle.classList.remove("aberto");
        document.body.classList.remove("seletor-cor-aberto");
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
                `<div class="cor-personalizada-premium"><span class="titulo-cor-personalizada">Escolha seu novo tema</span>`,
                `<button id="abrirSeletorCor" class="abrir-seletor-cor" type="button"`,
                ` aria-haspopup="dialog" aria-controls="modalSeletorCor"`,
                ` style="--cor-selecionada:`, corPersonalizada(), `"`,
                ` aria-label="Escolher uma cor personalizada"><span aria-hidden="true"></span>`,
                `<small>Toque para escolher a cor</small></button></div>`
            ]
            : [];
        const seletorPremium = possuiCoresPremium()
            ? [
                `<div id="modalSeletorCor" class="modal-seletor-cor" hidden>`,
                `<section class="painel-seletor-cor" role="dialog" aria-modal="true" aria-labelledby="tituloSeletorCor">`,
                `<header class="cabecalho-seletor-cor"><span aria-hidden="true">🎨</span>`,
                `<h2 id="tituloSeletorCor">Cores</h2>`,
                `<button id="fecharSeletorCor" type="button" aria-label="Cancelar e fechar o seletor">×</button></header>`,
                `<div class="abas-seletor-cor" role="tablist" aria-label="Formas de escolher a cor">`,
                `<button type="button" role="tab" data-aba-cor="grade" aria-selected="false">Grade</button>`,
                `<button type="button" role="tab" data-aba-cor="espectro" aria-selected="true">Espectro</button>`,
                `<button type="button" role="tab" data-aba-cor="controles" aria-selected="false">Controles</button></div>`,
                `<div class="conteudo-seletor-cor">`,
                `<div class="painel-cor painel-grade-cor" data-painel-cor="grade" role="tabpanel" hidden>`,
                `<div class="grade-cores-prontas" aria-label="Cores prontas">`,
                ...["#111827", "#2563eb", "#16a34a", "#eab308", "#ef4444", "#9333ea", "#0891b2", "#ea580c", "#db2777", "#65a30d", "#0f766e", "#4f46e5"]
                    .map(cor => `<button type="button" class="cor-rapida" data-cor-rapida="${cor}" style="--cor-rapida:${cor}" aria-label="Selecionar a cor ${cor}"></button>`),
                `</div></div>`,
                `<div class="painel-cor painel-espectro-cor" data-painel-cor="espectro" role="tabpanel">`,
                `<div id="espectroCor" class="espectro-cor" role="slider" tabindex="0"`,
                ` aria-label="Saturação e brilho" aria-valuemin="0" aria-valuemax="100">`,
                `<span class="ponteiro-espectro-cor" aria-hidden="true"></span></div>`,
                `<label class="controle-matiz-cor"><span>Matiz</span>`,
                `<input id="matizCor" type="range" min="0" max="359" step="1" aria-label="Matiz da cor"></label>`,
                `</div>`,
                `<div class="painel-cor painel-controles-cor" data-painel-cor="controles" role="tabpanel" hidden>`,
                `<label>Matiz <input id="controleMatizCor" type="range" min="0" max="359" step="1"></label>`,
                `<label>Saturação <input id="controleSaturacaoCor" type="range" min="0" max="100" step="1"></label>`,
                `<label>Brilho <input id="controleBrilhoCor" type="range" min="0" max="100" step="1"></label>`,
                `<label class="campo-hex-cor">Código da cor <input id="codigoHexCor" type="text" inputmode="text" maxlength="7" spellcheck="false"></label>`,
                `</div></div>`,
                `<footer class="rodape-seletor-cor"><div class="amostra-cor-pendente">`,
                `<span id="amostraCorPendente" aria-hidden="true"></span><strong id="textoCorPendente"></strong></div>`,
                `<button id="aplicarCorPersonalizada" type="button">APLICAR</button></footer>`,
                `</section></div>`
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
            "</div>",
            ...seletorPremium
        ].join("");

        document.body.appendChild(controle);

        const botao = controle.querySelector("#botaoTemaGlobal");
        const menu = controle.querySelector("#menuTemaGlobal");
        const abrirSeletorCor = menu.querySelector("#abrirSeletorCor");
        const modalSeletorCor = controle.querySelector("#modalSeletorCor");
        const espectroCor = controle.querySelector("#espectroCor");
        const matizCor = controle.querySelector("#matizCor");
        const controleMatiz = controle.querySelector("#controleMatizCor");
        const controleSaturacao = controle.querySelector("#controleSaturacaoCor");
        const controleBrilho = controle.querySelector("#controleBrilhoCor");
        const codigoHex = controle.querySelector("#codigoHexCor");
        const amostraPendente = controle.querySelector("#amostraCorPendente");
        const textoPendente = controle.querySelector("#textoCorPendente");
        let corPendente = corPersonalizada();
        let hsvPendente = hexParaHsv(corPendente);
        let arrastandoEspectro = false;

        function atualizarSeletorCor() {
            corPendente = hsvParaHex(hsvPendente.h, hsvPendente.s, hsvPendente.v);

            espectroCor?.style.setProperty("--matiz-selecionada", `hsl(${hsvPendente.h} 100% 50%)`);
            const ponteiro = espectroCor?.querySelector(".ponteiro-espectro-cor");
            if (ponteiro) {
                ponteiro.style.left = `${hsvPendente.s * 100}%`;
                ponteiro.style.top = `${(1 - hsvPendente.v) * 100}%`;
            }
            if (espectroCor) {
                espectroCor.setAttribute("aria-valuenow", String(Math.round(hsvPendente.v * 100)));
                espectroCor.setAttribute("aria-valuetext", `${Math.round(hsvPendente.s * 100)}% de saturação e ${Math.round(hsvPendente.v * 100)}% de brilho`);
            }
            [matizCor, controleMatiz].forEach(campo => {
                if (campo) campo.value = String(Math.round(hsvPendente.h));
            });
            if (controleSaturacao) controleSaturacao.value = String(Math.round(hsvPendente.s * 100));
            if (controleBrilho) controleBrilho.value = String(Math.round(hsvPendente.v * 100));
            if (codigoHex) codigoHex.value = corPendente.toUpperCase();
            if (amostraPendente) amostraPendente.style.background = corPendente;
            if (textoPendente) textoPendente.textContent = corPendente.toUpperCase();
        }

        function selecionarAbaCor(nome) {
            controle.querySelectorAll("[data-aba-cor]").forEach(aba => {
                const ativa = aba.dataset.abaCor === nome;
                aba.setAttribute("aria-selected", String(ativa));
                aba.classList.toggle("ativa", ativa);
            });
            controle.querySelectorAll("[data-painel-cor]").forEach(painel => {
                painel.hidden = painel.dataset.painelCor !== nome;
            });
        }

        function abrirPainelCor() {
            if (!modalSeletorCor) return;

            corPendente = corPersonalizada();
            hsvPendente = hexParaHsv(corPendente);
            atualizarSeletorCor();
            selecionarAbaCor("espectro");
            menu.hidden = true;
            modalSeletorCor.hidden = false;
            document.body.classList.add("seletor-cor-aberto");
            requestAnimationFrame(() => espectroCor?.focus());
        }

        function fecharPainelCor(retornarAoMenu = true) {
            if (!modalSeletorCor) return;

            modalSeletorCor.hidden = true;
            document.body.classList.remove("seletor-cor-aberto");
            if (retornarAoMenu) {
                menu.hidden = false;
                botao.setAttribute("aria-expanded", "true");
                controle.classList.add("aberto");
                abrirSeletorCor?.focus();
            }
        }

        function atualizarPeloEspectro(evento) {
            const area = espectroCor?.getBoundingClientRect();
            if (!area?.width || !area?.height) return;

            hsvPendente.s = limitar((evento.clientX - area.left) / area.width, 0, 1);
            hsvPendente.v = limitar(1 - (evento.clientY - area.top) / area.height, 0, 1);
            atualizarSeletorCor();
        }

        function aplicarCorEscolhida() {
            if (!modalSeletorCor) {
                return;
            }

            localStorage.setItem(CHAVE_COR_PERSONALIZADA, corPendente);
            aplicarAparencia("personalizada");
            fecharMenu(controle);
            if (abrirSeletorCor) {
                abrirSeletorCor.style.setProperty("--cor-selecionada", corPendente);
            }
            botao.focus();
        }

        botao.addEventListener("click", () => {
            const abrir = menu.hidden;
            menu.hidden = !abrir;
            botao.setAttribute("aria-expanded", String(abrir));
            controle.classList.toggle("aberto", abrir);
        });

        menu.addEventListener("click", (evento) => {
            if (evento.target.closest("#abrirSeletorCor")) {
                abrirPainelCor();
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

        modalSeletorCor?.addEventListener("click", (evento) => {
            const aba = evento.target.closest("[data-aba-cor]");
            const corRapida = evento.target.closest("[data-cor-rapida]");

            if (evento.target === modalSeletorCor || evento.target.closest("#fecharSeletorCor")) {
                fecharPainelCor(true);
            } else if (evento.target.closest("#aplicarCorPersonalizada")) {
                aplicarCorEscolhida();
            } else if (aba) {
                selecionarAbaCor(aba.dataset.abaCor);
            } else if (corRapida) {
                corPendente = corRapida.dataset.corRapida;
                hsvPendente = hexParaHsv(corPendente);
                atualizarSeletorCor();
            }
        });

        espectroCor?.addEventListener("pointerdown", (evento) => {
            arrastandoEspectro = true;
            espectroCor.setPointerCapture?.(evento.pointerId);
            atualizarPeloEspectro(evento);
        });
        espectroCor?.addEventListener("pointermove", (evento) => {
            if (arrastandoEspectro) atualizarPeloEspectro(evento);
        });
        ["pointerup", "pointercancel"].forEach(tipo => {
            espectroCor?.addEventListener(tipo, () => {
                arrastandoEspectro = false;
            });
        });
        espectroCor?.addEventListener("keydown", (evento) => {
            const passo = evento.shiftKey ? 0.1 : 0.02;
            if (evento.key === "ArrowLeft") hsvPendente.s = limitar(hsvPendente.s - passo, 0, 1);
            else if (evento.key === "ArrowRight") hsvPendente.s = limitar(hsvPendente.s + passo, 0, 1);
            else if (evento.key === "ArrowUp") hsvPendente.v = limitar(hsvPendente.v + passo, 0, 1);
            else if (evento.key === "ArrowDown") hsvPendente.v = limitar(hsvPendente.v - passo, 0, 1);
            else return;
            evento.preventDefault();
            atualizarSeletorCor();
        });

        matizCor?.addEventListener("input", () => {
            hsvPendente.h = Number(matizCor.value);
            atualizarSeletorCor();
        });
        [controleMatiz, controleSaturacao, controleBrilho].forEach(campo => {
            campo?.addEventListener("input", () => {
                hsvPendente.h = Number(controleMatiz.value);
                hsvPendente.s = Number(controleSaturacao.value) / 100;
                hsvPendente.v = Number(controleBrilho.value) / 100;
                atualizarSeletorCor();
            });
        });
        codigoHex?.addEventListener("change", () => {
            const valor = codigoHex.value.trim();
            if (/^#[0-9a-f]{6}$/i.test(valor)) {
                corPendente = valor;
                hsvPendente = hexParaHsv(corPendente);
            }
            atualizarSeletorCor();
        });

        document.addEventListener("click", (evento) => {
            if (!controle.contains(evento.target)) {
                fecharMenu(controle);
            }
        });

        document.addEventListener("keydown", (evento) => {
            if (evento.key === "Escape" && modalSeletorCor && !modalSeletorCor.hidden) {
                fecharPainelCor(true);
            } else if (evento.key === "Escape" && !menu.hidden) {
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
