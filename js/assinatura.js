import { api, ApiError } from "./api.js";

const CICLOS = {
    mensal: {
        nome: "Mensal",
        valorNormal: 9.97,
        desconto: 0,
        total: 9.97,
        periodo: "/mês",
        renovacao: "Acesso Premium por um mês, sem renovação automática."
    },
    trimestral: {
        nome: "Trimestral",
        valorNormal: 26.91,
        desconto: 0,
        total: 26.91,
        periodo: "/trimestre",
        renovacao: "Acesso Premium por três meses, sem renovação automática."
    },
    anual: {
        nome: "Anual",
        valorNormal: 95.64,
        desconto: 0,
        total: 95.64,
        periodo: "/ano",
        renovacao: "Acesso Premium por doze meses, sem renovação automática."
    }
};

let cupomAplicado = null;

async function carregarPlanosVigentes() {
    try {
        const planos = await api.get("/assinaturas/planos");

        (Array.isArray(planos) ? planos : []).forEach(plano => {
            const chave = String(plano.ciclo || "").toLowerCase();

            if (!CICLOS[chave]) {
                return;
            }

            const valor = Number(plano.valor);

            if (!Number.isFinite(valor) || valor <= 0) {
                return;
            }

            CICLOS[chave].nome = plano.nome || CICLOS[chave].nome;
            CICLOS[chave].valorNormal = valor;
            CICLOS[chave].desconto = 0;
            CICLOS[chave].total = valor;
        });

        document.querySelectorAll("[data-preco-ciclo]").forEach(elemento => {
            const dados = CICLOS[elemento.dataset.precoCiclo];
            if (dados) {
                elemento.textContent = formatarMoeda(dados.total);
            }
        });

        document.querySelectorAll("[data-descricao-ciclo]").forEach(elemento => {
            const ciclo = elemento.dataset.descricaoCiclo;
            elemento.textContent = ciclo === "mensal"
                ? "por mês"
                : "pagamento único";
        });
    } catch {
        // Mantém os valores padrão enquanto o servidor estiver indisponível.
    }
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
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
    const linhaPreco = document.querySelector(".preco-premium-linha");
    const promocao = document.getElementById("promocaoCupomPlano");
    const temCupom = cupomAplicado?.ciclo === ciclo;

    document.querySelectorAll("[data-preco-ciclo]").forEach(elemento => {
        const chave = elemento.dataset.precoCiclo;
        const valor = temCupom && chave === ciclo
            ? dados.total
            : CICLOS[chave]?.valorNormal;

        if (Number.isFinite(valor)) {
            elemento.textContent = formatarMoeda(valor);
        }
    });

    if (preco) {
        preco.textContent = formatarMoeda(dados.total);
    }

    if (periodo) {
        periodo.textContent = dados.periodo;
    }

    if (botao) {
        botao.textContent = `Assinar Premium ${dados.nome}`;

        if (botao.tagName === "A") {
            const cupom = temCupom
                ? `&cupom=${encodeURIComponent(cupomAplicado.codigo)}`
                : "";
            botao.href = `checkout.html?plano=premium&ciclo=${ciclo}${cupom}`;
        }

        botao.dataset.ciclo = ciclo;
    }

    linhaPreco?.classList.toggle("com-cupom", temCupom);

    if (promocao) {
        promocao.hidden = !temCupom;
    }

    if (temCupom) {
        const original = document.getElementById("precoOriginalCupomPlano");
        const promocional = document.getElementById("precoPromocionalCupomPlano");
        const badge = document.getElementById("badgeCupomPlano");

        if (original) {
            original.textContent = formatarMoeda(dados.valorNormal);
        }
        if (promocional) {
            promocional.textContent = formatarMoeda(dados.total);
        }
        if (badge) {
            badge.textContent = `${formatarPercentual(cupomAplicado.percentualDesconto)} OFF`;
        }
    }
}

function abrirCheckout() {
    const ciclo = obterCicloSelecionado();
    const cupom = cupomAplicado?.ciclo === ciclo
        ? `&cupom=${encodeURIComponent(cupomAplicado.codigo)}`
        : "";
    window.location.href = `checkout.html?plano=premium&ciclo=${ciclo}${cupom}`;
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
    const temCupom = cupomAplicado?.ciclo === ciclo;
    const percentual = temCupom
        ? Number(cupomAplicado.percentualDesconto)
        : 0;

    formulario.dataset.ciclo = ciclo;

    const campos = {
        checkoutPlano: "Plano Premium",
        checkoutCiclo: dados.nome,
        checkoutValorNormal: formatarMoeda(dados.valorNormal),
        checkoutCupom: temCupom ? cupomAplicado.codigo : "Não aplicado",
        checkoutPercentual: formatarPercentual(percentual),
        checkoutDesconto:
            dados.desconto > 0
                ? `-${formatarMoeda(dados.desconto)}`
                : formatarMoeda(0),
        checkoutTotal: formatarMoeda(dados.total),
        checkoutProximaCobranca: formatarMoeda(dados.valorNormal),
        textoRenovacao: dados.renovacao
    };

    Object.entries(campos).forEach(([id, valor]) => {
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

function formatarPercentual(valor) {
    return `${Number(valor || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 2
    })}%`;
}

function atualizarMensagemCupom(id, texto, tipo = "") {
    const mensagem = document.getElementById(id);

    if (!mensagem) {
        return;
    }

    mensagem.textContent = texto;
    mensagem.className = tipo ? `cupom-${tipo}` : "";
}

function limparCupomAplicado({ limparCampos = false } = {}) {
    cupomAplicado = null;

    Object.values(CICLOS).forEach(dados => {
        dados.desconto = 0;
        dados.total = dados.valorNormal;
    });

    if (limparCampos) {
        ["codigoCupom", "codigoCupomPlano"].forEach(id => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.value = "";
            }
        });
    }

    document.getElementById("btnRemoverCupom")?.setAttribute("hidden", "");
    document.getElementById("btnRemoverCupomPlano")?.setAttribute("hidden", "");
    atualizarCardPremium();
    preencherCheckout();
}

async function aplicarCupom(origem = "checkout") {
    const naTelaDePlanos = origem === "planos";
    const formulario = document.getElementById("formCheckout");
    const campo = document.getElementById(
        naTelaDePlanos ? "codigoCupomPlano" : "codigoCupom"
    );
    const botao = document.getElementById(
        naTelaDePlanos ? "btnAplicarCupomPlano" : "btnAplicarCupom"
    );
    const mensagemId = naTelaDePlanos ? "mensagemCupomPlano" : "mensagemCupom";
    const removerId = naTelaDePlanos ? "btnRemoverCupomPlano" : "btnRemoverCupom";
    const ciclo = naTelaDePlanos
        ? obterCicloSelecionado()
        : formulario?.dataset.ciclo || "mensal";
    const codigo = String(campo?.value || "").trim().toUpperCase();

    if (!codigo) {
        limparCupomAplicado();
        atualizarMensagemCupom(
            mensagemId,
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
            ciclo: ciclo.toUpperCase()
        });
        CICLOS[ciclo].valorNormal = Number(resposta.valorOriginal);
        CICLOS[ciclo].desconto = Number(resposta.desconto);
        CICLOS[ciclo].total = Number(resposta.total);
        cupomAplicado = {
            ...resposta,
            ciclo
        };
        if (campo) {
            campo.value = resposta.codigo;
        }
        document.getElementById(removerId)?.removeAttribute("hidden");
        atualizarCardPremium();
        preencherCheckout();
        atualizarMensagemCupom(
            mensagemId,
            `Cupom ${resposta.codigo} aplicado: ${formatarPercentual(resposta.percentualDesconto)} de desconto somente nesta primeira cobrança.`,
            "sucesso"
        );
    } catch (erro) {
        limparCupomAplicado();
        atualizarMensagemCupom(
            mensagemId,
            erro instanceof ApiError ? erro.message : "Não foi possível validar o cupom.",
            "erro"
        );
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = "Aplicar";
        }
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

function mensagemErroCheckout(erro) {
    const dados = erro instanceof ApiError ? erro.dados : null;
    const mensagem =
        dados?.message
        || dados?.mensagem
        || (erro instanceof Error ? erro.message : null)
        || "Não foi possível iniciar o pagamento.";
    const codigoDiagnostico = dados?.diagnosticId || dados?.diagnosticoId;

    if (!codigoDiagnostico || mensagem.includes(codigoDiagnostico)) {
        return mensagem;
    }

    return `${mensagem} Código de diagnóstico: ${codigoDiagnostico}.`;
}

async function enviarCheckout(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;
    const ciclo = formulario.dataset.ciclo || "mensal";
    const botao = formulario.querySelector('button[type="submit"]');
    let redirecionando = false;

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Preparando pagamento seguro...";
    }

    try {
        const dadosCheckout = {
            ciclo: ciclo.toUpperCase()
        };

        if (cupomAplicado?.ciclo === ciclo && cupomAplicado.codigo) {
            dadosCheckout.cupom = cupomAplicado.codigo;
        }

        const resposta = await api.post(
            "/assinaturas/checkout",
            dadosCheckout
        );
        const urlPagamento =
            resposta?.checkoutUrl
            || resposta?.urlPagamento
            || resposta?.initPoint;

        if (!urlMercadoPagoValida(urlPagamento)) {
            throw new Error("O servidor não retornou um endereço seguro do Mercado Pago.");
        }

        redirecionando = true;
        window.location.assign(urlPagamento);
    } catch (erro) {
        mostrarMensagem(mensagemErroCheckout(erro), "erro");
    } finally {
        if (botao && !redirecionando) {
            botao.disabled = false;
            botao.textContent = "Ir para o Mercado Pago";
        }
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

function exibirPlano(usuario, assinatura) {
    const nomePlano = document.getElementById("nomePlanoAtual");
    const statusPlano = document.getElementById("statusPlanoAtual");
    const premium = Boolean(assinatura) || usuario?.tipoAcesso === "PREMIUM";
    const cortesia = usuario?.tipoAcesso === "CORTESIA";

    if (nomePlano) {
        nomePlano.textContent = premium
            ? "Plano Premium"
            : cortesia
                ? "Premium Cortesia"
                : "Plano Free";
    }

    if (statusPlano) {
        statusPlano.textContent = premium || cortesia ? "Ativo" : "Ativo";
    }
}

async function preencherPlanoAtual() {
    const usuario = usuarioLocal();
    exibirPlano(usuario, null);

    try {
        const [assinatura, usuarioAtualizado] = await Promise.all([
            api.get("/assinaturas/atual"),
            api.get("/usuarios/me")
        ]);
        localStorage.setItem("usuarioAtual", JSON.stringify(usuarioAtualizado));
        exibirPlano(usuarioAtualizado, assinatura);
    } catch {
        // A página de planos também pode ser visitada antes do login.
    }
}

async function mostrarRetornoPagamento() {
    const parametros = new URLSearchParams(window.location.search);
    const retorno = parametros.get("pagamento");

    if (!retorno) {
        return;
    }

    if (retorno === "falha") {
        mostrarMensagem(
            "O pagamento não foi concluído. Nenhuma assinatura foi ativada.",
            "erro"
        );
        return;
    }

    const pagamentoId =
        parametros.get("payment_id")
        || parametros.get("collection_id");

    if (!pagamentoId) {
        mostrarMensagem(
            retorno === "pendente"
                ? "Pagamento pendente. Assim que o Mercado Pago confirmar, o Premium será liberado automaticamente."
                : "Pagamento recebido. O Premium será liberado após a confirmação automática do Mercado Pago.",
            "aviso"
        );
        return;
    }

    try {
        const confirmacao = await api.post(
            "/assinaturas/confirmar-pagamento",
            { pagamentoId }
        );

        mostrarMensagem(
            confirmacao.mensagem,
            confirmacao.premiumAtivo ? "sucesso" : "aviso"
        );

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    } catch (erro) {
        const mensagem = erro instanceof ApiError
            ? erro.message
            : "Não foi possível confirmar o pagamento agora.";

        mostrarMensagem(
            `${mensagem} O webhook continuará tentando liberar o Premium automaticamente.`,
            "erro"
        );
    }
}

async function iniciar() {
    await carregarPlanosVigentes();
    await mostrarRetornoPagamento();
    await preencherPlanoAtual();
    atualizarCardPremium();
    preencherCheckout();

    document
        .querySelectorAll('input[name="cicloPremium"]')
        .forEach(opcao => {
            opcao.addEventListener("change", () => {
                const tinhaCupom = Boolean(cupomAplicado);
                limparCupomAplicado();

                if (tinhaCupom) {
                    atualizarMensagemCupom(
                        "mensagemCupomPlano",
                        "Cupom removido ao alterar o plano. Digite-o novamente para validar a nova opção."
                    );
                }
            });
        });

    const botaoAssinar = document.getElementById("btnAssinarPremium");

    if (botaoAssinar && botaoAssinar.tagName !== "A") {
        botaoAssinar.addEventListener("click", abrirCheckout);
    }

    document
        .getElementById("formCheckout")
        ?.addEventListener("submit", enviarCheckout);

    document
        .getElementById("btnAplicarCupom")
        ?.addEventListener("click", () => void aplicarCupom("checkout"));

    document
        .getElementById("btnAplicarCupomPlano")
        ?.addEventListener("click", () => void aplicarCupom("planos"));

    document
        .getElementById("btnRemoverCupom")
        ?.addEventListener("click", () => {
            limparCupomAplicado({ limparCampos: true });
            atualizarMensagemCupom(
                "mensagemCupom",
                "Cupom removido. O valor normal foi restaurado."
            );
        });

    document
        .getElementById("btnRemoverCupomPlano")
        ?.addEventListener("click", () => {
            limparCupomAplicado({ limparCampos: true });
            atualizarMensagemCupom(
                "mensagemCupomPlano",
                "Cupom removido. O valor normal foi restaurado."
            );
        });

    [
        ["codigoCupom", "mensagemCupom"],
        ["codigoCupomPlano", "mensagemCupomPlano"]
    ].forEach(([campoId, mensagemId]) => {
        const campo = document.getElementById(campoId);

        campo?.addEventListener("input", () => {
            if (cupomAplicado) {
                limparCupomAplicado();
                atualizarMensagemCupom(
                    mensagemId,
                    "Código alterado. Clique em Aplicar cupom para validar novamente."
                );
            }
        });

        campo?.addEventListener("keydown", evento => {
            if (evento.key !== "Enter") {
                return;
            }

            evento.preventDefault();
            void aplicarCupom(campoId === "codigoCupomPlano" ? "planos" : "checkout");
        });
    });

    const cupomUrl = new URLSearchParams(window.location.search).get("cupom");
    const campoCupomCheckout = document.getElementById("codigoCupom");

    if (campoCupomCheckout && cupomUrl) {
        campoCupomCheckout.value = cupomUrl;
        await aplicarCupom("checkout");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    void iniciar();
});
