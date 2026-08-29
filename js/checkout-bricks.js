import { api, ApiError } from "./api.js";

const CICLOS = {
    mensal: {
        nome: "Mensal",
        valorNormal: 9.97,
        desconto: 0,
        total: 9.97,
        renovacao: "Acesso Premium por um mês, sem renovação automática."
    },
    trimestral: {
        nome: "Trimestral",
        valorNormal: 26.91,
        desconto: 0,
        total: 26.91,
        renovacao: "Acesso Premium por três meses, sem renovação automática."
    },
    anual: {
        nome: "Anual",
        valorNormal: 95.64,
        desconto: 0,
        total: 95.64,
        renovacao: "Acesso Premium por doze meses, sem renovação automática."
    }
};

let cupomAplicado = null;
let mercadoPago = null;
let bricksBuilder = null;
let paymentBrickController = null;
let statusScreenBrickController = null;
let cicloAtual = "mensal";
let monitorPagamento = null;
let renderizacaoId = 0;

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarPercentual(valor) {
    return `${Number(valor || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 2
    })}%`;
}

function mostrarMensagem(texto, tipo = "aviso") {
    const container = document.getElementById("mensagens");
    if (!container) {
        return;
    }

    const anterior = container.querySelector("[data-checkout-brick-message]");
    anterior?.remove();

    const mensagem = document.createElement("div");
    mensagem.dataset.checkoutBrickMessage = "true";
    mensagem.className = `mensagem mensagem-${tipo}`;
    mensagem.textContent = texto;
    container.appendChild(mensagem);

    if (tipo !== "erro") {
        window.setTimeout(() => mensagem.remove(), 9000);
    }
}

function mensagemErro(erro, fallback = "Não foi possível processar o pagamento.") {
    if (erro instanceof ApiError) {
        const diagnostico = erro.dados?.diagnosticId || erro.dados?.diagnosticoId;
        return diagnostico && !erro.message.includes(diagnostico)
            ? `${erro.message} Código de diagnóstico: ${diagnostico}.`
            : erro.message;
    }
    return erro instanceof Error && erro.message ? erro.message : fallback;
}

function obterCicloUrl() {
    const valor = new URLSearchParams(window.location.search)
        .get("ciclo")
        ?.toLowerCase();
    return valor && CICLOS[valor] ? valor : "mensal";
}

function obterCupomUrl() {
    return new URLSearchParams(window.location.search).get("cupom") || "";
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

async function carregarUsuario() {
    try {
        const usuario = await api.get("/usuarios/me");
        localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
        return usuario;
    } catch {
        return usuarioLocal();
    }
}

async function carregarPlanos() {
    try {
        const planos = await api.get("/assinaturas/planos");
        (Array.isArray(planos) ? planos : []).forEach(plano => {
            const chave = String(plano.ciclo || "").toLowerCase();
            const valor = Number(plano.valor);
            if (!CICLOS[chave] || !Number.isFinite(valor) || valor <= 0) {
                return;
            }
            CICLOS[chave].nome = plano.nome || CICLOS[chave].nome;
            CICLOS[chave].valorNormal = valor;
            CICLOS[chave].total = valor;
            CICLOS[chave].desconto = 0;
        });
    } catch {
        // Mantém os preços padrão enquanto o catálogo não responde.
    }
}

function atualizarResumo() {
    const dados = CICLOS[cicloAtual];
    const temCupom = cupomAplicado?.ciclo === cicloAtual;
    const percentual = temCupom
        ? Number(cupomAplicado.percentualDesconto || 0)
        : 0;

    const valores = {
        checkoutPlano: "Plano Premium",
        checkoutCiclo: dados.nome,
        checkoutValorNormal: formatarMoeda(dados.valorNormal),
        checkoutCupom: temCupom ? cupomAplicado.codigo : "Não aplicado",
        checkoutPercentual: formatarPercentual(percentual),
        checkoutDesconto: dados.desconto > 0
            ? `-${formatarMoeda(dados.desconto)}`
            : formatarMoeda(0),
        checkoutTotal: formatarMoeda(dados.total),
        checkoutProximaCobranca: formatarMoeda(dados.valorNormal),
        textoRenovacao: dados.renovacao
    };

    Object.entries(valores).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });

    ["checkoutCupom", "checkoutPercentual", "checkoutTotal"].forEach(id => {
        document
            .getElementById(id)
            ?.classList.toggle("cupom-aplicado", temCupom);
    });
}

function atualizarMensagemCupom(texto, tipo = "") {
    const mensagem = document.getElementById("mensagemCupom");
    if (!mensagem) {
        return;
    }
    mensagem.textContent = texto;
    mensagem.className = tipo ? `cupom-${tipo}` : "";
}

async function desmontarPaymentBrick() {
    if (!paymentBrickController) {
        return;
    }
    try {
        await paymentBrickController.unmount();
    } catch {
        // O componente pode já ter sido destruído pelo SDK.
    }
    paymentBrickController = null;
}

async function desmontarStatusBrick() {
    if (!statusScreenBrickController) {
        return;
    }
    try {
        await statusScreenBrickController.unmount();
    } catch {
        // O componente pode já ter sido destruído pelo SDK.
    }
    statusScreenBrickController = null;
}

function pararMonitoramento() {
    if (monitorPagamento) {
        window.clearInterval(monitorPagamento);
        monitorPagamento = null;
    }
}

async function renderizarPaymentBrick() {
    if (!bricksBuilder) {
        return;
    }

    const idAtual = ++renderizacaoId;
    pararMonitoramento();
    await desmontarStatusBrick();
    await desmontarPaymentBrick();

    const container = document.getElementById("paymentBrick_container");
    const statusContainer = document.getElementById("statusScreenBrick_container");
    const carregando = document.getElementById("checkoutBrickLoading");
    const botaoNovo = document.getElementById("btnNovoPagamento");

    if (!container) {
        return;
    }

    container.hidden = false;
    if (statusContainer) {
        statusContainer.hidden = true;
        statusContainer.innerHTML = "";
    }
    botaoNovo?.setAttribute("hidden", "");
    if (carregando) {
        carregando.hidden = false;
        carregando.textContent = "Carregando pagamento seguro...";
    }

    const dados = CICLOS[cicloAtual];
    const usuario = await carregarUsuario();
    const payer = {};

    if (usuario?.email) {
        payer.email = usuario.email;
    }
    if (usuario?.cpf) {
        payer.identification = {
            type: "CPF",
            number: String(usuario.cpf).replace(/\D/g, "")
        };
    }

    const settings = {
        initialization: {
            amount: Number(dados.total.toFixed(2)),
            ...(Object.keys(payer).length ? { payer } : {})
        },
        customization: {
            paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                prepaidCard: "all",
                bankTransfer: ["pix"]
            }
        },
        callbacks: {
            onReady: () => {
                if (idAtual !== renderizacaoId) {
                    return;
                }
                if (carregando) {
                    carregando.hidden = true;
                }
            },
            onSubmit: async ({ selectedPaymentMethod, formData }) => {
                const aceite = document.getElementById("aceitePagamento");
                if (!aceite?.checked) {
                    mostrarMensagem(
                        "Confirme as condições da assinatura antes de pagar.",
                        "erro"
                    );
                    aceite?.focus();
                    throw new Error("É necessário aceitar as condições da assinatura.");
                }

                try {
                    const resposta = await api.post("/assinaturas/checkout/brick", {
                        ciclo: cicloAtual.toUpperCase(),
                        cupom: cupomAplicado?.ciclo === cicloAtual
                            ? cupomAplicado.codigo
                            : null,
                        selectedPaymentMethod: String(selectedPaymentMethod || "payment"),
                        formData
                    });

                    mostrarMensagem(
                        resposta.mensagem || "Pagamento enviado ao Mercado Pago.",
                        resposta.premiumAtivo ? "sucesso" : "aviso"
                    );

                    window.setTimeout(() => {
                        void renderizarStatusPagamento(resposta);
                    }, 0);
                } catch (erro) {
                    mostrarMensagem(mensagemErro(erro), "erro");
                    throw erro;
                }
            },
            onError: erro => {
                console.error("Mercado Pago Payment Brick:", erro);
                mostrarMensagem(
                    "Não foi possível carregar ou validar o formulário de pagamento. Tente novamente.",
                    "erro"
                );
            }
        }
    };

    try {
        paymentBrickController = await bricksBuilder.create(
            "payment",
            "paymentBrick_container",
            settings
        );
    } catch (erro) {
        if (carregando) {
            carregando.hidden = true;
        }
        mostrarMensagem(
            "Não foi possível iniciar o pagamento dentro do Smart List. Tente novamente em instantes.",
            "erro"
        );
        console.error("Falha ao criar Payment Brick:", erro);
    }
}

async function renderizarStatusPagamento(resposta) {
    if (!bricksBuilder || !resposta?.paymentId) {
        return;
    }

    await desmontarPaymentBrick();
    await desmontarStatusBrick();

    const paymentContainer = document.getElementById("paymentBrick_container");
    const statusContainer = document.getElementById("statusScreenBrick_container");
    const botaoNovo = document.getElementById("btnNovoPagamento");
    const carregando = document.getElementById("checkoutBrickLoading");

    if (paymentContainer) {
        paymentContainer.hidden = true;
    }
    if (!statusContainer) {
        return;
    }

    statusContainer.hidden = false;
    statusContainer.innerHTML = "";
    if (carregando) {
        carregando.hidden = false;
        carregando.textContent = "Carregando status do pagamento...";
    }

    const initialization = {
        paymentId: String(resposta.paymentId)
    };

    if (
        resposta.statusDetail === "pending_challenge"
        && resposta.externalResourceUrl
        && resposta.creq
    ) {
        initialization.additionalInfo = {
            externalResourceURL: resposta.externalResourceUrl,
            creq: resposta.creq
        };
    }

    try {
        statusScreenBrickController = await bricksBuilder.create(
            "statusScreen",
            "statusScreenBrick_container",
            {
                initialization,
                callbacks: {
                    onReady: () => {
                        if (carregando) {
                            carregando.hidden = true;
                        }
                    },
                    onError: erro => {
                        console.error("Mercado Pago Status Screen Brick:", erro);
                        if (carregando) {
                            carregando.hidden = true;
                        }
                    }
                }
            }
        );
    } catch (erro) {
        if (carregando) {
            carregando.hidden = true;
        }
        console.error("Falha ao criar Status Screen Brick:", erro);
    }

    if (resposta.premiumAtivo) {
        pararMonitoramento();
        botaoNovo?.setAttribute("hidden", "");
        const botaoPlanos = document.getElementById("btnVoltarPlanos");
        botaoPlanos?.removeAttribute("hidden");
        return;
    }

    const status = String(resposta.status || "").toLowerCase();
    if (["rejected", "cancelled"].includes(status)) {
        botaoNovo?.removeAttribute("hidden");
        return;
    }

    iniciarMonitoramento(resposta.paymentId);
}

function iniciarMonitoramento(paymentId) {
    pararMonitoramento();
    let tentativas = 0;
    const maxTentativas = 100;

    monitorPagamento = window.setInterval(async () => {
        tentativas += 1;
        if (tentativas > maxTentativas) {
            pararMonitoramento();
            return;
        }

        try {
            const confirmacao = await api.post(
                "/assinaturas/confirmar-pagamento",
                { pagamentoId: String(paymentId) }
            );

            if (confirmacao?.premiumAtivo) {
                pararMonitoramento();
                mostrarMensagem(
                    "Pagamento confirmado. Seu Premium já está ativo.",
                    "sucesso"
                );
                const botaoPlanos = document.getElementById("btnVoltarPlanos");
                botaoPlanos?.removeAttribute("hidden");
                await desmontarStatusBrick();
                statusScreenBrickController = await bricksBuilder.create(
                    "statusScreen",
                    "statusScreenBrick_container",
                    {
                        initialization: { paymentId: String(paymentId) },
                        callbacks: {
                            onReady: () => {},
                            onError: erro => console.error(erro)
                        }
                    }
                );
            } else if (["rejected", "cancelled"].includes(confirmacao?.status)) {
                pararMonitoramento();
                document.getElementById("btnNovoPagamento")?.removeAttribute("hidden");
            }
        } catch {
            // O webhook permanece como mecanismo principal mesmo se uma consulta falhar.
        }
    }, 6000);
}

async function aplicarCupom() {
    const campo = document.getElementById("codigoCupom");
    const botao = document.getElementById("btnAplicarCupom");
    const codigo = String(campo?.value || "").trim().toUpperCase();

    if (!codigo) {
        atualizarMensagemCupom(
            "Digite o código do cupom para aplicar o desconto.",
            "erro"
        );
        campo?.focus();
        return;
    }

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Validando...";
    }

    try {
        const resposta = await api.post("/assinaturas/cupom/validar", {
            codigo,
            ciclo: cicloAtual.toUpperCase()
        });

        const dados = CICLOS[cicloAtual];
        dados.valorNormal = Number(resposta.valorOriginal);
        dados.desconto = Number(resposta.desconto);
        dados.total = Number(resposta.total);
        cupomAplicado = { ...resposta, ciclo: cicloAtual };

        if (campo) {
            campo.value = resposta.codigo;
        }
        document.getElementById("btnRemoverCupom")?.removeAttribute("hidden");
        atualizarResumo();
        atualizarMensagemCupom(
            `Cupom ${resposta.codigo} aplicado: ${formatarPercentual(resposta.percentualDesconto)} de desconto nesta compra.`,
            "sucesso"
        );
        await renderizarPaymentBrick();
    } catch (erro) {
        atualizarMensagemCupom(mensagemErro(erro, "Cupom inválido."), "erro");
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = "Aplicar";
        }
    }
}

async function removerCupom() {
    cupomAplicado = null;
    const dados = CICLOS[cicloAtual];
    dados.desconto = 0;
    dados.total = dados.valorNormal;

    const campo = document.getElementById("codigoCupom");
    if (campo) {
        campo.value = "";
    }
    document.getElementById("btnRemoverCupom")?.setAttribute("hidden", "");
    atualizarMensagemCupom("Cupom removido. O valor normal foi restaurado.");
    atualizarResumo();
    await renderizarPaymentBrick();
}

async function inicializarMercadoPago() {
    if (typeof window.MercadoPago !== "function") {
        throw new Error("A biblioteca segura do Mercado Pago não foi carregada.");
    }

    const config = await api.get("/assinaturas/checkout/brick/config");
    if (!config?.publicKey) {
        throw new Error("A Public Key do Mercado Pago não está configurada.");
    }

    mercadoPago = new window.MercadoPago(config.publicKey);
    bricksBuilder = mercadoPago.bricks();
}

async function iniciar() {
    cicloAtual = obterCicloUrl();
    await carregarPlanos();
    atualizarResumo();

    document.getElementById("btnAplicarCupom")?.addEventListener(
        "click",
        () => void aplicarCupom()
    );
    document.getElementById("btnRemoverCupom")?.addEventListener(
        "click",
        () => void removerCupom()
    );
    document.getElementById("codigoCupom")?.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            evento.preventDefault();
            void aplicarCupom();
        }
    });
    document.getElementById("btnNovoPagamento")?.addEventListener("click", async () => {
        document.getElementById("aceitePagamento")?.focus();
        await renderizarPaymentBrick();
    });

    const cupomUrl = obterCupomUrl();
    const campoCupom = document.getElementById("codigoCupom");
    if (cupomUrl && campoCupom) {
        campoCupom.value = cupomUrl;
        await aplicarCupom();
    }

    try {
        await inicializarMercadoPago();
        await renderizarPaymentBrick();
    } catch (erro) {
        document.getElementById("checkoutBrickLoading")?.setAttribute("hidden", "");
        mostrarMensagem(
            mensagemErro(
                erro,
                "O pagamento está temporariamente indisponível. Tente novamente mais tarde."
            ),
            "erro"
        );
    }
}

window.addEventListener("beforeunload", () => {
    pararMonitoramento();
    void desmontarPaymentBrick();
    void desmontarStatusBrick();
});

document.addEventListener("DOMContentLoaded", () => {
    void iniciar();
});
