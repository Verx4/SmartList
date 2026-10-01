import { adicionarProduto, listarProdutos } from "./produtos.js";
import { CATEGORIAS, identificarCategoria } from "./categorias.js";
import { api } from "./api.js";

let itensConferencia = [];
let reconhecimentoVoz = null;
let ouvindoLista = false;
let usarDitadoDoTeclado = false;
let gravadorAudio = null;
let partesAudio = [];

function semAcentos(valor) {
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escaparHTML(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function categoriaAutomatica(nome) {
    return identificarCategoria(nome, "kg");
}

function capitalizar(nome) {
    const limpo = String(nome || "").trim().replace(/\s+/g, " ");
    return limpo ? limpo.charAt(0).toUpperCase() + limpo.slice(1) : "";
}

function interpretarLinha(linha) {
    let texto = String(linha || "").trim().replace(/^[-•*]+\s*/, "");
    if (!texto) return null;

    let quantidade = 1;
    let medida = "unidade";
    const inicio = texto.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|litros?|ml|un(?:idades?)?|x)?\s+(?:de\s+)?(.+)$/i);

    if (inicio) {
        quantidade = Number(inicio[1].replace(",", ".")) || 1;
        const unidade = semAcentos(inicio[2]);
        texto = inicio[3].trim();
        if (["kg", "g"].includes(unidade)) medida = "kg";
    } else {
        const final = texto.match(/^(.+?)\s+[xX](\d+)$/);
        if (final) {
            texto = final[1].trim();
            quantidade = Number(final[2]) || 1;
        }
    }

    const nome = capitalizar(texto);
    if (!nome) return null;
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nome,
        categoria: categoriaAutomatica(nome),
        quantidade: medida === "kg" ? quantidade : Math.max(1, Math.floor(quantidade)),
        medida
    };
}

function interpretarTexto(texto) {
    const candidatos = String(texto || "")
        .split(/\n|;|,(?=\s*[A-Za-zÀ-ÿ])/)
        .map(interpretarLinha)
        .filter(Boolean);

    const unicos = new Map();
    candidatos.forEach(item => {
        const chave = semAcentos(item.nome);
        const existente = unicos.get(chave);
        if (existente && existente.medida === item.medida) existente.quantidade += item.quantidade;
        else unicos.set(chave, item);
    });
    return [...unicos.values()];
}

function opcoesCategoria(selecionada) {
    return CATEGORIAS.map(categoria =>
        `<option value="${escaparHTML(categoria)}" ${categoria === selecionada ? "selected" : ""}>${escaparHTML(categoria)}</option>`
    ).join("");
}

function renderizarConferencia() {
    const lista = document.getElementById("listaRapidaConferencia");
    const etapa = document.getElementById("listaRapidaEtapaConferencia");
    const contador = document.getElementById("listaRapidaContador");
    if (!lista || !etapa || !contador) return;

    etapa.hidden = !itensConferencia.length;
    contador.textContent = `${itensConferencia.length} ${itensConferencia.length === 1 ? "item identificado" : "itens identificados"}`;
    lista.innerHTML = itensConferencia.map(item => `
        <article class="lista-rapida-item" data-lista-rapida-id="${escaparHTML(item.id)}">
            <label>
                <span>Produto</span>
                <input type="text" data-campo="nome" maxlength="100" value="${escaparHTML(item.nome)}">
            </label>
            <label>
                <span>Categoria</span>
                <select data-campo="categoria">${opcoesCategoria(item.categoria)}</select>
            </label>
            <label class="lista-rapida-campo-curto">
                <span>Quantidade</span>
                <span class="lista-rapida-quantidade">
                    <button type="button" data-ajustar-quantidade="-1" aria-label="Diminuir quantidade de ${escaparHTML(item.nome)}">−</button>
                    <input type="number" data-campo="quantidade" min="0.001" step="${item.medida === "kg" ? "0.1" : "1"}" value="${item.quantidade}">
                    <button type="button" data-ajustar-quantidade="1" aria-label="Aumentar quantidade de ${escaparHTML(item.nome)}">+</button>
                </span>
            </label>
            <label class="lista-rapida-campo-curto">
                <span>Unidade</span>
                <select data-campo="medida">
                    <option value="unidade" ${item.medida === "unidade" ? "selected" : ""}>Unidade</option>
                    <option value="kg" ${item.medida === "kg" ? "selected" : ""}>Kg</option>
                </select>
            </label>
            <button type="button" class="lista-rapida-remover" data-remover-item aria-label="Remover ${escaparHTML(item.nome)}">×</button>
        </article>
    `).join("");
}

function abrirModal() {
    const modal = document.getElementById("modalListaRapida");
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-aberto");
    requestAnimationFrame(() => document.getElementById("textoListaRapida")?.focus());
}

function fecharModal() {
    const modal = document.getElementById("modalListaRapida");
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-aberto");
    if (ouvindoLista) reconhecimentoVoz?.stop();
}

function atualizarEstadoVoz(mensagem = "", ativo = false) {
    ouvindoLista = ativo;
    const botao = document.getElementById("btnFalarListaRapida");
    const status = document.getElementById("statusVozListaRapida");
    if (botao) {
        botao.classList.toggle("esta-ouvindo", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
        botao.querySelector("span:last-child").textContent = ativo
            ? "Parar"
            : usarDitadoDoTeclado
                ? "Usar voz pelo teclado"
                : "Falar produtos";
    }
    if (status) status.textContent = mensagem;
}

function adicionarTextoFalado(transcricao) {
    const campo = document.getElementById("textoListaRapida");
    if (!campo) return;
    const itensFalados = String(transcricao || "")
        .trim()
        .replace(/[,.]+/g, "\n")
        .replace(/\s+e\s+/gi, "\n")
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean)
        .join("\n");
    if (!itensFalados) return;
    campo.value = [campo.value.trim(), itensFalados].filter(Boolean).join("\n");
    campo.dispatchEvent(new Event("input", { bubbles: true }));
}

async function solicitarMicrofone() {
    if (!navigator.mediaDevices?.getUserMedia) return true;
    try {
        const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
        fluxo.getTracks().forEach(trilha => trilha.stop());
        return true;
    } catch (_erro) {
        return false;
    }
}

function ativarDitadoDoTeclado() {
    usarDitadoDoTeclado = true;
    atualizarEstadoVoz("Toque no botão e depois no microfone do teclado do iPhone.", false);
}

function abrirDitadoDoTeclado() {
    const campo = document.getElementById("textoListaRapida");
    if (!campo) return;
    campo.focus({ preventScroll: false });
    campo.setSelectionRange(campo.value.length, campo.value.length);
    atualizarEstadoVoz("Agora toque no 🎙️ do teclado e fale os produtos.", false);
}

function tipoAudioSuportado() {
    return ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
        .find(tipo => window.MediaRecorder?.isTypeSupported?.(tipo)) || "";
}

async function enviarAudioParaTranscricao(blob) {
    atualizarEstadoVoz("Transformando sua voz em produtos…", true);
    const formulario = new FormData();
    const extensao = blob.type.includes("mp4") ? "m4a" : "webm";
    formulario.append("audio", blob, `lista-rapida.${extensao}`);
    try {
        const resposta = await api.post("/voz/transcrever", formulario);
        adicionarTextoFalado(resposta?.texto || "");
        atualizarEstadoVoz("Produtos registrados. Revise a lista antes de organizar.", false);
    } catch (erro) {
        atualizarEstadoVoz(erro?.message || "Não foi possível transcrever o áudio.", false);
    }
}

async function alternarGravacao() {
    if (gravadorAudio?.state === "recording") {
        gravadorAudio.stop();
        return;
    }
    try {
        const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
        partesAudio = [];
        const tipo = tipoAudioSuportado();
        gravadorAudio = new MediaRecorder(fluxo, tipo ? { mimeType: tipo } : undefined);
        gravadorAudio.ondataavailable = evento => {
            if (evento.data?.size) partesAudio.push(evento.data);
        };
        gravadorAudio.onstop = () => {
            fluxo.getTracks().forEach(trilha => trilha.stop());
            const blob = new Blob(partesAudio, { type: gravadorAudio.mimeType || tipo || "audio/mp4" });
            if (blob.size > 0) void enviarAudioParaTranscricao(blob);
            else atualizarEstadoVoz("Nenhum áudio foi gravado. Tente novamente.", false);
        };
        gravadorAudio.start();
        atualizarEstadoVoz("Gravando… fale os produtos e toque em Parar.", true);
    } catch (_erro) {
        atualizarEstadoVoz("Permita o acesso ao microfone nos Ajustes do iPhone.", false);
    }
}

function configurarEntradaPorVoz() {
    const campo = document.getElementById("textoListaRapida");
    if (!campo || document.getElementById("btnFalarListaRapida")) return;

    const area = document.createElement("div");
    area.className = "lista-rapida-voz";
    area.innerHTML = `
        <button id="btnFalarListaRapida" type="button" class="btn btn-voz-lista" aria-pressed="false">
            <span aria-hidden="true">🎙️</span><span>Falar produtos</span>
        </button>
        <small id="statusVozListaRapida" role="status" aria-live="polite"></small>
    `;
    campo.insertAdjacentElement("afterend", area);

    const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
    const botao = area.querySelector("#btnFalarListaRapida");
    const usarGravacao = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        && Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
    if (usarGravacao) {
        botao.addEventListener("click", alternarGravacao);
        return;
    }
    if (!Reconhecimento) {
        if (window.MediaRecorder && navigator.mediaDevices?.getUserMedia) {
            botao.addEventListener("click", alternarGravacao);
        } else {
            botao.disabled = true;
            atualizarEstadoVoz("Entrada por voz não disponível neste aparelho.");
        }
        return;
    }

    let recebeuResultado = false;
    let erroReconhecimento = false;
    const dispositivoMovel = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    reconhecimentoVoz = new Reconhecimento();
    reconhecimentoVoz.lang = "pt-BR";
    // O modo contínuo encerra prematuramente no Safari/iOS e em alguns WebViews.
    reconhecimentoVoz.continuous = !dispositivoMovel;
    reconhecimentoVoz.interimResults = false;
    reconhecimentoVoz.maxAlternatives = 1;
    reconhecimentoVoz.onstart = () => {
        erroReconhecimento = false;
        recebeuResultado = false;
        atualizarEstadoVoz("Preparando o microfone…", true);
    };
    reconhecimentoVoz.onaudiostart = () => {
        atualizarEstadoVoz("Pode falar agora — diga um ou mais produtos.", true);
    };
    reconhecimentoVoz.onresult = evento => {
        for (let indice = evento.resultIndex; indice < evento.results.length; indice += 1) {
            if (evento.results[indice].isFinal) {
                recebeuResultado = true;
                adicionarTextoFalado(evento.results[indice][0].transcript);
            }
        }
    };
    reconhecimentoVoz.onerror = evento => {
        erroReconhecimento = true;
        if (["service-not-allowed", "not-allowed"].includes(evento.error)) {
            ativarDitadoDoTeclado();
            return;
        }
        const mensagens = {
            "audio-capture": "O microfone não está disponível. Verifique a permissão do navegador.",
            "network": "A voz precisa de internet. Verifique sua conexão e tente novamente.",
            "no-speech": "Toque novamente e espere aparecer “Pode falar agora” antes de dizer o produto.",
            "aborted": "Escuta cancelada."
        };
        const mensagem = mensagens[evento.error] || "Não consegui reconhecer a voz. Tente novamente.";
        atualizarEstadoVoz(mensagem, false);
    };
    reconhecimentoVoz.onend = () => {
        if (erroReconhecimento) return;
        atualizarEstadoVoz(
            recebeuResultado
                ? "Produto registrado. Toque novamente para falar outro."
                : "Toque para falar e aguarde o aviso do microfone.",
            false
        );
    };
    botao.addEventListener("click", async () => {
        if (usarDitadoDoTeclado) {
            abrirDitadoDoTeclado();
            return;
        }
        if (ouvindoLista) {
            reconhecimentoVoz.stop();
            return;
        }
        const permitido = await solicitarMicrofone();
        if (!permitido) {
            ativarDitadoDoTeclado();
            return;
        }
        try {
            reconhecimentoVoz.start();
            atualizarEstadoVoz("Preparando o microfone…", true);
        } catch (_erro) {
            atualizarEstadoVoz("Aguarde um instante e tente novamente.", false);
        }
    });
}

function gerarConferencia() {
    const texto = document.getElementById("textoListaRapida")?.value;
    itensConferencia = interpretarTexto(texto);
    if (!itensConferencia.length) {
        document.getElementById("textoListaRapida")?.focus();
        return;
    }
    renderizarConferencia();
}

function atualizarItem(evento) {
    const card = evento.target.closest("[data-lista-rapida-id]");
    const campo = evento.target.dataset.campo;
    if (!card || !campo) return;
    const item = itensConferencia.find(atual => atual.id === card.dataset.listaRapidaId);
    if (!item) return;
    item[campo] = campo === "quantidade"
        ? Math.max(0.001, Number(evento.target.value) || 1)
        : evento.target.value;
}

function confirmarLista() {
    const existentes = new Set(listarProdutos().map(produto => semAcentos(produto.nome)));
    let adicionados = 0;

    itensConferencia.forEach(item => {
        const nome = capitalizar(item.nome);
        if (!nome || existentes.has(semAcentos(nome))) return;
        const porPeso = item.medida === "kg";
        adicionarProduto({
            nome,
            categoria: item.categoria || categoriaAutomatica(nome),
            medida: item.medida,
            preco: 0,
            quantidade: porPeso ? 0 : Math.max(1, Math.floor(Number(item.quantidade) || 1)),
            peso: porPeso ? Math.max(0.001, Number(item.quantidade) || 1) : 0,
            precos: [{ valor: 0, quantidade: porPeso ? 0 : Math.max(1, Math.floor(Number(item.quantidade) || 1)) }],
            supermercado: "",
            favorito: false
        });
        existentes.add(semAcentos(nome));
        adicionados += 1;
    });

    window.dispatchEvent(new CustomEvent("listarapida:concluida", { detail: { adicionados } }));
    fecharModal();
    itensConferencia = [];
    const texto = document.getElementById("textoListaRapida");
    if (texto) texto.value = "";
    renderizarConferencia();
}

function configurarCliqueNoProduto() {
    document.getElementById("listaProdutos")?.addEventListener("click", evento => {
        if (evento.target.closest("button, input, select, label, a, [data-acao]")) return;
        const produto = evento.target.closest(".produto");
        produto?.querySelector('[data-acao="editar"]')?.click();
    });
}

function iniciar() {
    document.getElementById("btnListaRapida")?.addEventListener("click", abrirModal);
    document.getElementById("btnFecharListaRapida")?.addEventListener("click", fecharModal);
    document.getElementById("btnCancelarListaRapida")?.addEventListener("click", fecharModal);
    document.getElementById("btnGerarListaRapida")?.addEventListener("click", gerarConferencia);
    document.getElementById("btnConfirmarListaRapida")?.addEventListener("click", confirmarLista);
    document.getElementById("listaRapidaConferencia")?.addEventListener("input", atualizarItem);
    document.getElementById("listaRapidaConferencia")?.addEventListener("change", atualizarItem);
    document.getElementById("listaRapidaConferencia")?.addEventListener("click", evento => {
        const ajuste = evento.target.closest("[data-ajustar-quantidade]");
        if (ajuste) {
            const cardAjuste = ajuste.closest("[data-lista-rapida-id]");
            const item = itensConferencia.find(atual => atual.id === cardAjuste?.dataset.listaRapidaId);
            const campo = cardAjuste?.querySelector('[data-campo="quantidade"]');
            if (!item || !campo) return;
            const direcao = Number(ajuste.dataset.ajustarQuantidade);
            const passo = item.medida === "kg" ? 0.1 : 1;
            const minimo = item.medida === "kg" ? 0.1 : 1;
            item.quantidade = Math.max(minimo, Math.round((Number(item.quantidade) + (direcao * passo)) * 1000) / 1000);
            campo.value = item.quantidade;
            return;
        }
        const botao = evento.target.closest("[data-remover-item]");
        const card = botao?.closest("[data-lista-rapida-id]");
        if (!card) return;
        itensConferencia = itensConferencia.filter(item => item.id !== card.dataset.listaRapidaId);
        renderizarConferencia();
    });
    document.getElementById("modalListaRapida")?.addEventListener("click", evento => {
        if (evento.target.id === "modalListaRapida") fecharModal();
    });
    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && !document.getElementById("modalListaRapida")?.hidden) fecharModal();
    });
    configurarEntradaPorVoz();
    configurarCliqueNoProduto();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();

export { interpretarTexto, categoriaAutomatica };
