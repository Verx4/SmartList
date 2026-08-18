import { api } from "./api.js";
import {
    adicionarProduto,
    criarListaSalva,
    obterListaAtualSalva
} from "./produtos.js";
import { obterMercadoAtual, salvarMercadoAtual } from "./mercado-atual.js";
import {
    MEDIDA_KG,
    MEDIDA_UNIDADE
} from "./medidas-produtos.js";
import { identificarCategoria } from "./categorias.js";

const URL_JS_QR = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

ativarScannerNota();

function ativarScannerNota() {
    const botaoAntigo = document.getElementById("btnLeitorNota");
    if (!botaoAntigo) return;

    const botao = botaoAntigo.cloneNode(true);
    botaoAntigo.replaceWith(botao);
    botao.setAttribute("aria-label", "Escanear nota fiscal e importar produtos");
    botao.setAttribute("title", "Importar produtos da nota fiscal");
    botao.addEventListener("click", abrirScannerNota);

    if (!document.querySelector('link[data-scanner-nota="true"]')) {
        const estilo = document.createElement("link");
        estilo.rel = "stylesheet";
        estilo.href = "./css/scanner-nota.css?v=1";
        estilo.dataset.scannerNota = "true";
        document.head.appendChild(estilo);
    }
}

function criarModal() {
    let modal = document.getElementById("scannerNotaCompleto");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "scannerNotaCompleto";
    modal.className = "scanner-nota-overlay";
    modal.hidden = true;
    modal.innerHTML = `
        <section class="scanner-nota-sheet" role="dialog" aria-modal="true" aria-labelledby="scannerNotaTitulo">
            <header class="scanner-nota-header">
                <div><small>Importação automática</small><h2 id="scannerNotaTitulo">Ler QR Code da NFC-e</h2></div>
                <button type="button" class="scanner-nota-fechar" aria-label="Fechar">×</button>
            </header>

            <div class="scanner-nota-captura">
                <div class="scanner-nota-camera">
                    <video playsinline muted autoplay></video>
                    <canvas hidden></canvas>
                    <span class="scanner-nota-mira" aria-hidden="true"></span>
                </div>
                <p class="scanner-nota-status" role="status">Aponte a câmera para o QR Code da nota.</p>
                <div class="scanner-nota-acoes">
                    <button type="button" class="btn btn-secondary scanner-nota-foto">Escolher foto</button>
                    <button type="button" class="btn btn-secondary scanner-nota-camera-tentar">Abrir câmera</button>
                </div>
                <details class="scanner-nota-manual">
                    <summary>Digitar o endereço da nota</summary>
                    <div><input type="url" inputmode="url" placeholder="Cole o endereço lido no QR Code"><button type="button" class="btn btn-primary">Consultar</button></div>
                </details>
                <input class="scanner-nota-arquivo" type="file" accept="image/*" capture="environment" hidden>
            </div>

            <div class="scanner-nota-revisao" hidden>
                <div class="scanner-nota-resumo">
                    <div><small>Estabelecimento</small><strong class="scanner-nota-mercado-label">Mercado da nota</strong></div>
                    <div><small>Total</small><strong class="scanner-nota-total">R$ 0,00</strong></div>
                </div>
                <label class="scanner-nota-mercado-campo">Mercado da lista<input type="text" maxlength="120"></label>
                <div class="scanner-nota-selecao">
                    <strong class="scanner-nota-contagem">0 itens encontrados</strong>
                    <button type="button" class="scanner-nota-alternar">Desmarcar todos</button>
                </div>
                <div class="scanner-nota-itens"></div>
                <div class="scanner-nota-destino">
                    <strong>Onde deseja salvar estes itens?</strong>
                    <button type="button" class="btn btn-primary scanner-nota-importar-atual">Adicionar à lista atual</button>
                    <div class="scanner-nota-nova-lista">
                        <input type="text" maxlength="80" placeholder="Nome da nova lista" aria-label="Nome da nova lista">
                        <button type="button" class="btn btn-secondary scanner-nota-importar-nova">Criar nova lista</button>
                    </div>
                    <small>Suas listas ficam salvas e podem ser trocadas na tela Lista.</small>
                </div>
                <div class="scanner-nota-rodape">
                    <button type="button" class="btn btn-secondary scanner-nota-voltar">Ler novamente</button>
                </div>
            </div>
        </section>`;
    document.body.appendChild(modal);
    return modal;
}

async function abrirScannerNota() {
    const modal = criarModal();
    modal._encerrar?.();

    const captura = modal.querySelector(".scanner-nota-captura");
    const revisao = modal.querySelector(".scanner-nota-revisao");
    const video = modal.querySelector("video");
    const canvas = modal.querySelector("canvas");
    const status = modal.querySelector(".scanner-nota-status");
    const arquivo = modal.querySelector(".scanner-nota-arquivo");
    const campoManual = modal.querySelector(".scanner-nota-manual input");
    let stream = null;
    let quadro = 0;
    let ativo = true;
    let consultando = false;
    let notaAtual = null;

    const pararCamera = () => {
        cancelAnimationFrame(quadro);
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
    };
    const fechar = () => {
        ativo = false;
        pararCamera();
        modal.hidden = true;
        document.body.classList.remove("scanner-nota-aberto");
    };
    modal._encerrar = fechar;
    modal.querySelector(".scanner-nota-fechar").onclick = fechar;
    modal.onclick = evento => { if (evento.target === modal) fechar(); };
    modal.hidden = false;
    captura.hidden = false;
    revisao.hidden = true;
    arquivo.value = "";
    status.textContent = "Aponte a câmera para o QR Code da nota.";
    status.className = "scanner-nota-status";
    document.body.classList.add("scanner-nota-aberto");

    const mostrarErro = mensagem => {
        status.textContent = mensagem;
        status.className = "scanner-nota-status erro";
    };

    const consultar = async valor => {
        const url = String(valor || "").trim();
        if (consultando) return;
        if (!/^https?:\/\//i.test(url)) {
            mostrarErro("O QR Code lido não contém o endereço de uma NFC-e.");
            return;
        }

        consultando = true;
        pararCamera();
        status.textContent = "QR Code lido. Buscando os produtos da nota…";
        status.className = "scanner-nota-status carregando";

        try {
            notaAtual = await api.post("/notas/consultar", { url });
            exibirRevisao(modal, notaAtual);
            status.textContent = "Nota localizada. Escolha em qual lista deseja salvar os itens.";
        } catch (erro) {
            const mensagem = erro?.status === 401
                ? "Entre na sua conta para importar uma nota fiscal."
                : erro?.message || "Não foi possível consultar esta nota agora.";
            mostrarErro(mensagem);
        } finally {
            consultando = false;
        }
    };

    const abrirCamera = async () => {
        pararCamera();
        if (!navigator.mediaDevices?.getUserMedia) {
            mostrarErro("A câmera não está disponível neste navegador. Escolha uma foto do QR Code.");
            return;
        }

        try {
            const leitor = await criarLeitorQr(canvas);
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [{ focusMode: "continuous" }]
                },
                audio: false
            });
            video.srcObject = stream;
            await video.play();
            status.textContent = "Aponte a câmera para o QR Code da nota.";
            status.className = "scanner-nota-status";
            let ultimaLeitura = 0;
            const ler = async tempo => {
                if (!ativo || !stream || consultando) return;
                if (tempo - ultimaLeitura > 180 && video.readyState >= 2) {
                    ultimaLeitura = tempo;
                    const valor = await leitor(video).catch(() => "");
                    if (valor) return consultar(valor);
                }
                quadro = requestAnimationFrame(ler);
            };
            quadro = requestAnimationFrame(ler);
        } catch (erro) {
            mostrarErro("Não foi possível abrir a câmera. Autorize o acesso ou escolha uma foto do QR Code.");
        }
    };

    modal.querySelector(".scanner-nota-foto").onclick = () => arquivo.click();
    modal.querySelector(".scanner-nota-camera-tentar").onclick = abrirCamera;
    modal.querySelector(".scanner-nota-manual button").onclick = () => consultar(campoManual.value);
    campoManual.onkeydown = evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            consultar(campoManual.value);
        }
    };
    arquivo.onchange = async () => {
        const imagem = arquivo.files?.[0];
        if (!imagem) return;
        status.textContent = "Analisando a imagem…";
        status.className = "scanner-nota-status carregando";
        try {
            const leitor = await criarLeitorQr(canvas);
            const fonte = await carregarImagem(imagem);
            const valor = await leitor(fonte);
            fonte.close?.();
            if (valor) consultar(valor);
            else mostrarErro("Não foi possível ler o QR Code. Aproxime a câmera, mantenha a nota reta e evite sombras ou reflexos.");
        } catch (erro) {
            mostrarErro("Não foi possível analisar essa imagem. Tente outra foto.");
        }
    };

    modal.querySelector(".scanner-nota-voltar").onclick = () => {
        notaAtual = null;
        captura.hidden = false;
        revisao.hidden = true;
        abrirCamera();
    };
    modal.querySelector(".scanner-nota-alternar").onclick = evento => {
        const caixas = [...modal.querySelectorAll(".scanner-nota-item input")];
        const marcar = caixas.some(caixa => !caixa.checked);
        caixas.forEach(caixa => { caixa.checked = marcar; });
        evento.currentTarget.textContent = marcar ? "Desmarcar todos" : "Marcar todos";
    };
    modal.querySelector(".scanner-nota-importar-atual").onclick = () => importarSelecionados(modal, notaAtual, fechar, false);
    modal.querySelector(".scanner-nota-importar-nova").onclick = () => importarSelecionados(modal, notaAtual, fechar, true);
    abrirCamera();
}

function exibirRevisao(modal, nota) {
    const itens = Array.isArray(nota?.itens) ? nota.itens : [];
    modal.querySelector(".scanner-nota-captura").hidden = true;
    modal.querySelector(".scanner-nota-revisao").hidden = false;
    const mercado = nota?.mercado || obterMercadoAtual() || "Mercado da nota";
    modal.querySelector(".scanner-nota-mercado-label").textContent = mercado;
    modal.querySelector(".scanner-nota-total").textContent = FORMATADOR_MOEDA.format(Number(nota?.valorTotal || 0));
    modal.querySelector(".scanner-nota-mercado-campo input").value = mercado;
    modal.querySelector(".scanner-nota-contagem").textContent = `${itens.length} ${itens.length === 1 ? "item encontrado" : "itens encontrados"}`;
    const atual = obterListaAtualSalva();
    modal.querySelector(".scanner-nota-importar-atual").textContent = `Adicionar à “${atual?.nome || "Minha lista"}”`;
    modal.querySelector(".scanner-nota-nova-lista input").value = `Compra ${new Date().toLocaleDateString("pt-BR")}`;
    modal.querySelector(".scanner-nota-itens").innerHTML = itens.map((item, indice) => `
        <label class="scanner-nota-item">
            <input type="checkbox" data-indice="${indice}" checked>
            <span><strong>${escaparHtml(item.nome)}</strong><small>${formatarQuantidade(item)} × ${FORMATADOR_MOEDA.format(Number(item.valorUnitario || 0))}</small></span>
            <b>${FORMATADOR_MOEDA.format(Number(item.valorTotal || 0))}</b>
        </label>`).join("");
}

function importarSelecionados(modal, nota, fechar, criarNova) {
    const itens = Array.isArray(nota?.itens) ? nota.itens : [];
    const indices = [...modal.querySelectorAll(".scanner-nota-item input:checked")]
        .map(caixa => Number(caixa.dataset.indice));
    if (!indices.length) return;

    const mercado = modal.querySelector(".scanner-nota-mercado-campo input").value.trim()
        || nota?.mercado
        || obterMercadoAtual()
        || "Mercado da nota";

    if (criarNova) {
        const campoNome = modal.querySelector(".scanner-nota-nova-lista input");
        const nome = campoNome.value.trim();
        if (!nome) {
            campoNome.focus();
            campoNome.setCustomValidity("Digite um nome para a nova lista.");
            campoNome.reportValidity();
            return;
        }
        campoNome.setCustomValidity("");
        criarListaSalva(nome, { ativar: true, mercado });
    }

    salvarMercadoAtual(mercado);

    indices.forEach(indice => {
        const item = itens[indice];
        if (!item) return;
        const quantidade = Math.max(0, Number(item.quantidade || 1));
        const unidade = String(item.unidade || "UN").toUpperCase();
        const porPeso = ["KG", "G", "GR"].includes(unidade) || !Number.isInteger(quantidade);
        const medida = porPeso ? MEDIDA_KG : MEDIDA_UNIDADE;
        adicionarProduto({
            nome: item.nome,
            categoria: identificarCategoria(item.nome, medida),
            precos: [{
                valor: Math.max(0, Number(item.valorUnitario || 0)),
                quantidade: porPeso ? quantidade : Math.max(1, Math.round(quantidade))
            }],
            medida,
            peso: porPeso ? quantidade : 0,
            supermercado: mercado,
            favorito: false
        });
    });

    fechar();
    window.location.assign("./dashboard.html");
}

async function criarLeitorQr(canvas) {
    let detectorNativo = null;

    if ("BarcodeDetector" in window) {
        try {
            detectorNativo = new BarcodeDetector({ formats: ["qr_code"] });
        } catch (_erro) {
            detectorNativo = null;
        }
    }

    try {
        await carregarJsQr();
    } catch (erro) {
        if (!detectorNativo) throw erro;
    }

    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    return async fonte => {
        if (detectorNativo) {
            try {
                const resultado = await detectorNativo.detect(fonte);
                const valor = resultado[0]?.rawValue || "";
                if (valor) return valor;
            } catch (_erro) {
                // Continua no leitor compatível quando o detector nativo falha.
            }
        }

        if (!window.jsQR) return "";

        const largura = fonte.videoWidth || fonte.width || fonte.naturalWidth;
        const altura = fonte.videoHeight || fonte.height || fonte.naturalHeight;
        if (!largura || !altura) return "";

        const ladoCentral = Math.min(largura, altura) * 0.92;
        const regioes = [
            { x: 0, y: 0, largura, altura, alvo: 1600, limiares: [112, 144, 176] },
            {
                x: (largura - ladoCentral) / 2,
                y: (altura - ladoCentral) / 2,
                largura: ladoCentral,
                altura: ladoCentral,
                alvo: 1600,
                limiares: [112, 144, 176]
            }
        ];

        if (!fonte.videoWidth) adicionarRegioesDeBusca(regioes, largura, altura);

        for (const regiao of regioes) {
            const maiorLado = Math.max(regiao.largura, regiao.altura);
            const escala = Math.min(3, regiao.alvo / maiorLado);
            canvas.width = Math.max(1, Math.round(regiao.largura * escala));
            canvas.height = Math.max(1, Math.round(regiao.altura * escala));
            contexto.drawImage(
                fonte,
                regiao.x,
                regiao.y,
                regiao.largura,
                regiao.altura,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const pixels = contexto.getImageData(0, 0, canvas.width, canvas.height);
            const valorDireto = decodificarPixelsQr(pixels);
            if (valorDireto) return valorDireto;

            for (const limiar of regiao.limiares) {
                const realcados = realcarContraste(pixels, limiar);
                const valorRealcado = decodificarPixelsQr(realcados);
                if (valorRealcado) return valorRealcado;
            }
        }

        return "";
    };
}

function adicionarRegioesDeBusca(regioes, largura, altura) {
    const lado = Math.min(largura, altura) * 0.35;
    const espacoX = largura - lado;
    const espacoY = altura - lado;

    for (const passoY of [0, 1 / 3, 2 / 3, 1]) {
        for (const passoX of [0, 0.5, 1]) {
            regioes.push({
                x: espacoX * passoX,
                y: espacoY * passoY,
                largura: lado,
                altura: lado,
                alvo: 900,
                limiares: [144]
            });
        }
    }
}

function decodificarPixelsQr(pixels) {
    return window.jsQR(pixels.data, pixels.width, pixels.height, {
        inversionAttempts: "attemptBoth"
    })?.data || "";
}

function realcarContraste(pixels, limiar) {
    const dados = new Uint8ClampedArray(pixels.data);

    for (let indice = 0; indice < dados.length; indice += 4) {
        const luminosidade = (
            dados[indice] * 299
            + dados[indice + 1] * 587
            + dados[indice + 2] * 114
        ) / 1000;
        const valor = luminosidade >= limiar ? 255 : 0;
        dados[indice] = valor;
        dados[indice + 1] = valor;
        dados[indice + 2] = valor;
    }

    return new ImageData(dados, pixels.width, pixels.height);
}

function carregarJsQr() {
    if (window.jsQR) return Promise.resolve();
    if (window._jsQrCarregando) return window._jsQrCarregando;
    window._jsQrCarregando = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = URL_JS_QR;
        script.crossOrigin = "anonymous";
        script.onload = resolve;
        script.onerror = () => {
            window._jsQrCarregando = null;
            reject(new Error("Leitor QR indisponível"));
        };
        document.head.appendChild(script);
    });
    return window._jsQrCarregando;
}

async function carregarImagem(arquivo) {
    if ("createImageBitmap" in window) return createImageBitmap(arquivo);
    const url = URL.createObjectURL(arquivo);
    try {
        const imagem = new Image();
        imagem.src = url;
        await imagem.decode();
        return imagem;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function formatarQuantidade(item) {
    const quantidade = Number(item.quantidade || 1).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
    return `${quantidade} ${item.unidade || "UN"}`;
}

function escaparHtml(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = String(valor || "Produto");
    return elemento.innerHTML;
}
