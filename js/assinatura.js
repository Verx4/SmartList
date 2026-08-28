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
        checkoutDesconto:
            dados.desconto > 0
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

    const formulario = evento.currentTarget;
    const ciclo = formulario.dataset.ciclo || "mensal";
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
        const mensagem =
            erro instanceof ApiError || erro instanceof Error
                ? erro.message
                : "Não foi possível iniciar o pagamento.";

        mostrarMensagem(mensagem, "erro");
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
            opcao.addEventListener("change", atualizarCardPremium);
        });

    const botaoAssinar = document.getElementById("btnAssinarPremium");

    if (botaoAssinar && botaoAssinar.tagName !== "A") {
        botaoAssinar.addEventListener("click", abrirCheckout);
    }

    document
        .getElementById("formCheckout")
        ?.addEventListener("submit", enviarCheckout);
}

document.addEventListener("DOMContentLoaded", () => {
    void iniciar();
});
