import { api, ApiError } from "./api.js";

const CICLOS = {
    mensal: {
        planId: "premium_monthly",
        nome: "Mensal",
        valorNormal: 9.97,
        desconto: 0,
        total: 9.97,
        periodo: "/mês",
        renovacao: "Acesso Premium por um mês, sem renovação automática."
    },
    trimestral: {
        planId: "premium_quarterly",
        nome: "Trimestral",
        valorNormal: 29.91,
        desconto: 3.00,
        total: 26.91,
        periodo: "/trimestre",
        renovacao: "Acesso Premium por três meses, sem renovação automática."
    },
    anual: {
        planId: "premium_yearly",
        nome: "Anual",
        valorNormal: 119.64,
        desconto: 24.00,
        total: 95.64,
        periodo: "/ano",
        renovacao: "Acesso Premium por doze meses, sem renovação automática."
    }
};

const CICLO_POR_PLAN_ID = Object.fromEntries(
    Object.entries(CICLOS).map(([chave, dados]) => [dados.planId, chave])
);
const INTERVALO_POLLING = 5000;
const MAXIMO_TENTATIVAS_POLLING = 360;
const STATUS_TERMINAIS = new Set([
    "approved",
    "rejected",
    "cancelled",
    "expired",
    "refunded"
]);

let pagamentoPixAtual = null;
let pollingPix = null;
let tentativasPolling = 0;
let consultandoStatus = false;

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(valor) {
    if (!valor) {
        return "";
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime())
        ? ""
        : data.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
}

function mostrarMensagem(texto, tipo = "sucesso") {
    let container = document.getElementById("mensagens");

    if (!container) {
        container = document.createElement("div");
        container.id = "mensagens";
        container.className = "mensagens-globais";
        container.setAttribute("aria-live", "polite");
        document.body.prepend(container);
    }

    const mensagem = document.createElement("div");
    mensagem.className = `mensagem mensagem-${tipo}`;
    mensagem.textContent = texto;
    container.appendChild(mensagem);
    window.setTimeout(() => mensagem.remove(), 7000);
}

function obterCicloSelecionado() {
    const selecionado = document.querySelector(
        'input[name="cicloPremium"]:checked'
    );
    const ciclo = selecionado?.value || "mensal";
    return CICLOS[ciclo] ? ciclo : "mensal";
}

function atualizarCardPremium() {
    const ciclo = obterCicloSelecionado();
    const dados = CICLOS[ciclo];
    const preco = document.getElementById("precoPremium");
    const periodo = document.getElementById("periodoPremium");
    const botao = document.getElementById("btnAssinarPremium");

    if (preco) {
        preco.textContent = formatarMoeda(dados.total);
    }
    if (periodo) {
        periodo.textContent = dados.periodo;
    }
    if (botao) {
        botao.textContent = `Assinar Premium ${dados.nome}`;
        if (botao.tagName === "A") {
            botao.href = `checkout.html?plano=premium&ciclo=${ciclo}`;
        }
        botao.dataset.ciclo = ciclo;
    }
}

function abrirCheckout() {
    const ciclo = obterCicloSelecionado();
    window.location.href = `checkout.html?plano=premium&ciclo=${ciclo}`;
}

function cicloDoCheckout() {
    const formulario = document.getElementById("formCheckout");
    const ciclo = formulario?.dataset.ciclo || "mensal";
    return CICLOS[ciclo] ? ciclo : "mensal";
}

function preencherCheckout() {
    const formulario = document.getElementById("formCheckout");

    if (!formulario) {
        return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const cicloParametro = parametros.get("ciclo") || "mensal";
    const ciclo = CICLOS[cicloParametro] ? cicloParametro : "mensal";
    const dados = CICLOS[ciclo];
    formulario.dataset.ciclo = ciclo;

    const campos = {
        checkoutPlano: "Plano Premium",
        checkoutCiclo: dados.nome,
        checkoutValorNormal: formatarMoeda(dados.valorNormal),
        checkoutDesconto: dados.desconto > 0
            ? `-${formatarMoeda(dados.desconto)}`
            : formatarMoeda(0),
        checkoutTotal: formatarMoeda(dados.total),
        textoRenovacao: dados.renovacao
    };

    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });
}

function formaPagamentoSelecionada() {
    return document.querySelector('input[name="formaPagamento"]:checked')?.value
        || "cartao";
}

function somenteDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function cpfValido(valor) {
    const cpf = somenteDigitos(valor);

    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const calcularDigito = (tamanho, pesoInicial) => {
        let soma = 0;

        for (let indice = 0; indice < tamanho; indice += 1) {
            soma += Number(cpf[indice]) * (pesoInicial - indice);
        }

        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return calcularDigito(9, 10) === Number(cpf[9])
        && calcularDigito(10, 11) === Number(cpf[10]);
}

function formatarCpf(valor) {
    const cpf = somenteDigitos(valor).slice(0, 11);
    return cpf
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function atualizarFormaPagamento() {
    const pix = formaPagamentoSelecionada() === "pix";
    const explicacaoCartao = document.getElementById("explicacaoCartao");
    const explicacaoPix = document.getElementById("explicacaoPix");
    const dadosPagadorPix = document.getElementById("dadosPagadorPix");
    const cpfPagadorPix = document.getElementById("cpfPagadorPix");
    const botao = document.getElementById("btnConfirmarPagamento");

    if (explicacaoCartao) {
        explicacaoCartao.hidden = pix;
    }
    if (explicacaoPix) {
        explicacaoPix.hidden = !pix;
    }
    if (dadosPagadorPix) {
        dadosPagadorPix.hidden = !pix;
    }
    if (cpfPagadorPix) {
        cpfPagadorPix.required = pix;
        cpfPagadorPix.setCustomValidity("");
    }
    if (botao && !botao.disabled) {
        botao.textContent = pix ? "Gerar PIX" : "Continuar com cartão";
    }
}

function urlMercadoPagoValida(valor) {
    try {
        const url = new URL(valor);
        const host = url.hostname.toLowerCase();

        return url.protocol === "https:"
            && (
                host === "mercadopago.com.br"
                || host.endsWith(".mercadopago.com.br")
                || host === "mercadopago.com"
                || host.endsWith(".mercadopago.com")
            );
    } catch {
        return false;
    }
}

async function enviarCheckout(evento) {
    evento.preventDefault();

    if (formaPagamentoSelecionada() === "pix") {
        await gerarPix();
        return;
    }

    await enviarCheckoutCartao(evento.currentTarget);
}

async function enviarCheckoutCartao(formulario) {
    const ciclo = cicloDoCheckout();
    const botao = formulario.querySelector('button[type="submit"]');
    let redirecionando = false;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Preparando pagamento seguro...";
    }

    try {
        const resposta = await api.post("/assinaturas/checkout", {
            ciclo: ciclo.toUpperCase()
        });
        const urlPagamento = resposta?.checkoutUrl
            || resposta?.urlPagamento
            || resposta?.initPoint;

        if (!urlMercadoPagoValida(urlPagamento)) {
            throw new Error("O servidor não retornou um endereço seguro do Mercado Pago.");
        }

        redirecionando = true;
        window.location.assign(urlPagamento);
    } catch (erro) {
        mostrarMensagem(mensagemDoErro(erro, "Não foi possível iniciar o pagamento."), "erro");
    } finally {
        if (botao && !redirecionando) {
            botao.disabled = false;
            atualizarFormaPagamento();
        }
    }
}

async function gerarPix() {
    const botao = document.getElementById("btnConfirmarPagamento");
    const campoCpf = document.getElementById("cpfPagadorPix");
    const dados = CICLOS[cicloDoCheckout()];
    const cpf = somenteDigitos(campoCpf?.value);

    if (!cpfValido(cpf)) {
        campoCpf?.setCustomValidity("Informe um CPF válido para gerar o PIX.");
        campoCpf?.reportValidity();
        campoCpf?.focus();
        return;
    }

    pararPollingPix();

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Gerando PIX...";
    }

    try {
        const resposta = await api.post("/payments/pix", {
            planId: dados.planId,
            cpf
        });
        exibirPix(resposta);
    } catch (erro) {
        mostrarMensagem(
            mensagemDoErro(erro, "Não foi possível gerar o PIX neste momento. Tente novamente."),
            "erro"
        );
    } finally {
        if (botao) {
            botao.disabled = false;
            atualizarFormaPagamento();
        }
    }
}

function normalizarBase64(valor) {
    const base64 = String(valor || "").replace(/\s+/g, "");
    return /^[A-Za-z0-9+/]+={0,2}$/.test(base64) ? base64 : "";
}

function exibirPix(pagamento) {
    if (!pagamento?.paymentId) {
        return;
    }

    pagamentoPixAtual = pagamento;
    const painel = document.getElementById("painelPix");
    const qrCode = document.getElementById("pixQrCode");
    const copiaCola = document.getElementById("pixCopiaCola");
    const expiracao = document.getElementById("pixExpiracao");
    const base64 = normalizarBase64(pagamento.qrCodeBase64);

    if (painel) {
        painel.hidden = false;
    }
    if (qrCode) {
        qrCode.hidden = !base64;
        if (base64) {
            qrCode.src = `data:image/png;base64,${base64}`;
        } else {
            qrCode.removeAttribute("src");
        }
    }
    if (copiaCola) {
        copiaCola.value = pagamento.qrCode || "";
    }
    if (expiracao) {
        const data = formatarData(pagamento.expiresAt);
        expiracao.textContent = data ? `Válido até ${data}.` : "";
    }

    atualizarEstadoPix(pagamento);
    painel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function atualizarEstadoPix(pagamento) {
    const status = String(pagamento?.status || "pending").toLowerCase();
    const titulo = document.getElementById("pixTitulo");
    const selo = document.getElementById("pixStatus");
    const conteudo = document.getElementById("pixConteudoPagamento");
    const resultado = document.getElementById("pixResultado");
    const verificar = document.getElementById("btnVerificarPix");
    const novo = document.getElementById("btnNovoPix");
    const cancelar = document.getElementById("btnCancelarPix");
    const configuracao = estadoVisual(status, pagamento);

    if (titulo) {
        titulo.textContent = configuracao.titulo;
    }
    if (selo) {
        selo.textContent = configuracao.selo;
        selo.dataset.status = status;
    }
    if (conteudo) {
        conteudo.hidden = configuracao.ocultarPagamento;
    }
    if (resultado) {
        resultado.hidden = !configuracao.mensagem;
        resultado.textContent = configuracao.mensagem;
    }
    if (verificar) {
        verificar.hidden = STATUS_TERMINAIS.has(status);
    }
    if (novo) {
        novo.hidden = !["rejected", "cancelled", "expired", "refunded"].includes(status);
    }
    if (cancelar) {
        cancelar.textContent = status === "approved" ? "Continuar" : "Cancelar";
    }

    if (STATUS_TERMINAIS.has(status)) {
        pararPollingPix();
    } else {
        iniciarPollingPix();
    }

    if (status === "approved") {
        void atualizarUsuarioServidor();
    }
}

function estadoVisual(status, pagamento) {
    const ate = formatarData(pagamento?.premiumUntil);
    const plano = pagamento?.planName || "Premium";
    const valor = formatarMoeda(pagamento?.amount);

    switch (status) {
        case "approved":
            return {
                titulo: "Pagamento confirmado",
                selo: "Aprovado",
                ocultarPagamento: true,
                mensagem: `Smart List Premium ativado. Plano ${plano}, ${valor}.${ate ? ` Ativo até ${ate}.` : ""}`
            };
        case "rejected":
            return {
                titulo: "Pagamento não aprovado",
                selo: "Rejeitado",
                ocultarPagamento: true,
                mensagem: "O Mercado Pago rejeitou este pagamento. Gere um novo PIX para tentar novamente."
            };
        case "cancelled":
            return {
                titulo: "Pagamento cancelado",
                selo: "Cancelado",
                ocultarPagamento: true,
                mensagem: "Este pagamento foi cancelado e não ativou o Premium."
            };
        case "expired":
            return {
                titulo: "PIX expirado",
                selo: "Expirado",
                ocultarPagamento: true,
                mensagem: "Este código PIX expirou e não pode mais ser utilizado."
            };
        case "refunded":
            return {
                titulo: "Pagamento estornado",
                selo: "Estornado",
                ocultarPagamento: true,
                mensagem: "O pagamento foi estornado pelo Mercado Pago."
            };
        case "created":
            return {
                titulo: "Gerando PIX",
                selo: "Criando",
                ocultarPagamento: false,
                mensagem: ""
            };
        default:
            return {
                titulo: "Aguardando pagamento",
                selo: "Pendente",
                ocultarPagamento: false,
                mensagem: ""
            };
    }
}

function iniciarPollingPix() {
    if (pollingPix || !pagamentoPixAtual?.paymentId) {
        return;
    }

    tentativasPolling = 0;
    pollingPix = window.setInterval(() => {
        if (document.hidden || consultandoStatus) {
            return;
        }

        tentativasPolling += 1;

        if (tentativasPolling > MAXIMO_TENTATIVAS_POLLING) {
            pararPollingPix();
            return;
        }

        void consultarStatusPix(false);
    }, INTERVALO_POLLING);
}

function pararPollingPix() {
    if (pollingPix) {
        window.clearInterval(pollingPix);
        pollingPix = null;
    }
}

async function consultarStatusPix(mostrarErro = true) {
    if (!pagamentoPixAtual?.paymentId || consultandoStatus) {
        return;
    }

    consultandoStatus = true;

    try {
        const resposta = await api.get(
            `/payments/${encodeURIComponent(pagamentoPixAtual.paymentId)}/status`
        );
        exibirPix(resposta);
    } catch (erro) {
        if (mostrarErro) {
            mostrarMensagem(
                mensagemDoErro(erro, "Não foi possível verificar o pagamento agora."),
                "erro"
            );
        }
    } finally {
        consultandoStatus = false;
    }
}

async function restaurarPixPendente() {
    if (!document.getElementById("formCheckout")) {
        return;
    }

    try {
        const pagamento = await api.get("/payments/pix/pending");
        if (pagamento?.paymentId) {
            const ciclo = CICLO_POR_PLAN_ID[pagamento.planId];
            if (ciclo) {
                document.getElementById("formCheckout").dataset.ciclo = ciclo;
                preencherResumoDoCiclo(ciclo);
            }
            const pix = document.querySelector('input[name="formaPagamento"][value="pix"]');
            if (pix) {
                pix.checked = true;
                atualizarFormaPagamento();
            }
            exibirPix(pagamento);
        }
    } catch (erro) {
        if (erro instanceof ApiError && [401, 404].includes(erro.status)) {
            return;
        }
    }
}

function preencherResumoDoCiclo(ciclo) {
    const atual = new URL(window.location.href);
    atual.searchParams.set("ciclo", ciclo);
    window.history.replaceState({}, "", atual);
    preencherCheckout();
}

async function copiarPix() {
    const campo = document.getElementById("pixCopiaCola");
    const botao = document.getElementById("btnCopiarPix");

    if (!campo?.value) {
        return;
    }

    try {
        await navigator.clipboard.writeText(campo.value);
    } catch {
        campo.focus();
        campo.select();
        document.execCommand("copy");
    }

    if (botao) {
        const texto = botao.textContent;
        botao.textContent = "PIX copiado";
        window.setTimeout(() => {
            botao.textContent = texto;
        }, 2200);
    }
}

function cancelarVisualizacaoPix() {
    if (pagamentoPixAtual?.status === "approved") {
        window.location.href = "./assinatura.html";
        return;
    }

    pararPollingPix();
    document.getElementById("painelPix")?.setAttribute("hidden", "");
}

async function atualizarUsuarioServidor() {
    try {
        const usuario = await api.get("/usuarios/me");
        localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
        window.dispatchEvent(new CustomEvent("usuarioatualizado", {
            detail: { usuario }
        }));
    } catch {
        // A confirmação visual continua baseada na resposta autenticada do backend.
    }
}

function usuarioLocal() {
    try {
        return JSON.parse(
            localStorage.getItem("usuarioAtual")
            || localStorage.getItem("usuarioLogado")
            || "null"
        );
    } catch {
        return null;
    }
}

function exibirPlano(usuario, assinatura, sincronizado = false) {
    const nomePlano = document.getElementById("nomePlanoAtual");
    const statusPlano = document.getElementById("statusPlanoAtual");
    const premium = Boolean(assinatura)
        || (sincronizado && usuario?.assinaturaAtiva === true);
    const cortesia = sincronizado && usuario?.tipoAcesso === "CORTESIA";

    if (nomePlano) {
        nomePlano.textContent = premium
            ? "Plano Premium"
            : cortesia
                ? "Premium Cortesia"
                : "Plano Free";
    }
    if (statusPlano) {
        statusPlano.textContent = "Ativo";
    }
}

async function preencherPlanoAtual() {
    exibirPlano(usuarioLocal(), null, false);

    try {
        const [assinatura, usuario] = await Promise.all([
            api.get("/assinaturas/atual"),
            api.get("/usuarios/me")
        ]);
        localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
        exibirPlano(usuario, assinatura, true);
    } catch {
        // A página de planos também pode ser visitada antes do login.
    }
}

function mostrarRetornoPagamento() {
    const status = new URLSearchParams(window.location.search).get("pagamento");
    const mensagens = {
        sucesso: "Pagamento enviado. O Premium será liberado após a confirmação automática do Mercado Pago.",
        pendente: "Pagamento pendente. Assim que o Mercado Pago confirmar, o Premium será liberado.",
        falha: "O pagamento não foi concluído. Nenhuma assinatura foi ativada."
    };

    if (mensagens[status]) {
        mostrarMensagem(mensagens[status], status === "falha" ? "erro" : "sucesso");
    }
}

function mensagemDoErro(erro, padrao) {
    return erro instanceof ApiError || erro instanceof Error
        ? erro.message
        : padrao;
}

async function iniciar() {
    atualizarCardPremium();
    preencherCheckout();
    atualizarFormaPagamento();
    mostrarRetornoPagamento();

    document.querySelectorAll('input[name="cicloPremium"]').forEach(opcao => {
        opcao.addEventListener("change", atualizarCardPremium);
    });
    document.querySelectorAll('input[name="formaPagamento"]').forEach(opcao => {
        opcao.addEventListener("change", atualizarFormaPagamento);
    });

    const cpfPagadorPix = document.getElementById("cpfPagadorPix");
    cpfPagadorPix?.addEventListener("input", () => {
        cpfPagadorPix.value = formatarCpf(cpfPagadorPix.value);
        cpfPagadorPix.setCustomValidity("");
    });

    const botaoAssinar = document.getElementById("btnAssinarPremium");
    if (botaoAssinar && botaoAssinar.tagName !== "A") {
        botaoAssinar.addEventListener("click", abrirCheckout);
    }

    document.getElementById("formCheckout")?.addEventListener("submit", enviarCheckout);
    document.getElementById("btnCopiarPix")?.addEventListener("click", copiarPix);
    document.getElementById("btnVerificarPix")?.addEventListener("click", () => {
        void consultarStatusPix(true);
    });
    document.getElementById("btnNovoPix")?.addEventListener("click", gerarPix);
    document.getElementById("btnCancelarPix")?.addEventListener("click", cancelarVisualizacaoPix);
    window.addEventListener("pagehide", pararPollingPix, { once: true });

    await Promise.allSettled([
        preencherPlanoAtual(),
        restaurarPixPendente()
    ]);
}

document.addEventListener("DOMContentLoaded", () => {
    void iniciar();
});

