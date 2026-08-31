import { estaAutenticado } from "./auth.js";




const MARGEM_SCRAPER = 5;
let usuariosAdmin = [];
let atualizacaoAssinaturasEmAndamento = false;
let atualizacaoPainelEmAndamento = false;
let intervaloAtualizacaoAssinaturas = null;




function formatarMoeda(valor) {


    return Number(valor || 0).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );


}




function preencherTexto(id, valor) {


    const elemento =
        document.getElementById(id);


    if (elemento) {


        elemento.textContent =
            valor ?? "0";


    }


}




function preencherTextos(ids, valor) {
    ids.forEach(id => preencherTexto(id, valor));
}




function mensagem(
    texto,
    tipo = "sucesso"
) {


    let container =
        document.getElementById("mensagens");


    if (!container) {


        container = document.createElement("div");


        container.id = "mensagens";
        container.className = "mensagens-globais";


        document.body.prepend(container);


    }


    const aviso = document.createElement("div");


    aviso.className =
        `mensagem mensagem-${tipo}`;


    aviso.textContent = texto;


    container.appendChild(aviso);


    window.setTimeout(
        () => aviso.remove(),
        5500
    );


}




function exibirResultadoCortesia(texto, tipo = "sucesso") {
    const resultado = document.getElementById("mensagemCortesia");


    if (!resultado) {
        mensagem(texto, tipo);
        return;
    }


    resultado.textContent = texto;
    resultado.className = `mensagem mensagem-${tipo}`;
    resultado.hidden = false;
    resultado.setAttribute("role", tipo === "erro" ? "alert" : "status");


    window.requestAnimationFrame(() => {
        resultado.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    });
}




function descreverErroCortesia(erro) {
    if (!(erro instanceof ApiError)) {
        return "Não foi possível conceder a cortesia.";
    }


    const detalhes = erro.dados?.detalhes;


    if (!detalhes || typeof detalhes !== "object") {
        return erro.message;
    }


    const mensagens = [...new Set(Object.values(detalhes).filter(Boolean))];


    return mensagens.length
        ? `${erro.message} ${mensagens.join(" ")}`
        : erro.message;
}




function renderizarOpcoesCortesia(usuarios = []) {
    const lista = document.getElementById("usuariosCortesiaDisponiveis");


    if (!lista) {
        return;
    }


    lista.innerHTML = usuarios
        .filter(usuario => usuario?.email)
        .map(usuario => `
            <option value="${escaparHtml(usuario.email)}">
                ${escaparHtml(usuario.nome || usuario.email)} — ${escaparHtml(apresentarClassificacao(usuario).rotulo)}
            </option>
        `)
        .join("");
}




function mostrarBackendOffline() {


    const status =
        document.getElementById("statusBackendAdmin");


    if (status) {


        status.textContent = "Backend offline";
        status.className =
            "status status-erro";


    }


}




function renderizarGraficoUsuarios(dados = {}) {
    const grafico = document.getElementById("graficoUsuariosAcesso");


    if (!grafico) {
        return;
    }


    const categorias = [
        { nome: "Free", valor: Number(dados.usuariosFree) || 0, classe: "free" },
        { nome: "Premium", valor: Number(dados.usuariosPremium) || 0, classe: "premium" },
        { nome: "Cortesia", valor: Number(dados.usuariosCortesia) || 0, classe: "cortesia" },
        { nome: "Inativos", valor: Number(dados.usuariosInativos) || 0, classe: "inativos" }
    ];
    const totalCategorias = categorias.reduce((total, categoria) => total + categoria.valor, 0);
    const totalUsuarios = Number(dados.totalUsuarios) || totalCategorias;


    if (!totalUsuarios) {
        grafico.innerHTML = '<p class="estado-vazio">Nenhum usuário encontrado.</p>';
        return;
    }


    grafico.innerHTML = categorias.map(categoria => {
        const percentual = Math.min(100, (categoria.valor / totalUsuarios) * 100);
        const percentualFormatado = percentual.toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        });


        return `
            <div
                class="admin-grafico-usuario-linha"
                role="listitem"
                aria-label="${categoria.nome}: ${categoria.valor} usuários, ${percentualFormatado}%">
                <strong>${categoria.nome}</strong>
                <div class="admin-grafico-usuario-trilho" aria-hidden="true">
                    <span
                        class="admin-grafico-usuario-barra admin-grafico-usuario-${categoria.classe}"
                        style="width: ${percentual}%">
                    </span>
                </div>
                <span>${categoria.valor}</span>
                <small>${percentualFormatado}%</small>
            </div>
        `;
    }).join("");
}




async function carregarResumo() {
    const possuiResumo =
        document.getElementById("totalUsuarios") ||
        document.getElementById("usuariosFree") ||
        document.getElementById("usuariosPremium") ||
        document.getElementById("adminTotalUsuarios");


    if (!possuiResumo) {
        return;
    }


    try {
        const dados = await api.get("/admin/resumo");


        preencherTextos(["totalUsuarios", "adminTotalUsuarios"], dados?.totalUsuarios);
        preencherTextos(
            ["usuariosFree", "adminTotalFree", "quantidadePlanoFree"],
            dados?.usuariosFree
        );
        preencherTextos(
            ["usuariosPremium", "adminTotalPremium"],
            dados?.usuariosPremium
        );
        preencherTextos(
            ["usuariosCortesia", "adminTotalCortesia", "quantidadeCortesia"],
            dados?.usuariosCortesia
        );
        preencherTexto(
            "usuariosPremiumManual",
            dados?.usuariosPremiumManual
        );
        preencherTextos(
            ["usuariosInativos", "adminTotalInativos"],
            dados?.usuariosInativos
        );
        preencherTextos(
            ["assinaturasMensais", "quantidadePremiumMensal"],
            dados?.assinaturasMensais
        );
        preencherTextos(
            ["assinaturasTrimestrais", "quantidadePremiumTrimestral"],
            dados?.assinaturasTrimestrais
        );
        preencherTextos(
            ["assinaturasAnuais", "quantidadePremiumAnual"],
            dados?.assinaturasAnuais
        );
        preencherTexto("adminTotalListas", dados?.totalListas);
        preencherTextos(
            ["totalProdutosAdmin", "adminTotalProdutos"],
            dados?.totalProdutos
        );
        preencherTextos(
            ["totalSupermercadosAdmin", "adminTotalSupermercados"],
            dados?.totalSupermercados
        );
        preencherTexto("adminPrecosHoje", dados?.totalExecucoesScraper);
        renderizarGraficoUsuarios(dados);
    } catch {
        mostrarBackendOffline();
    }
}
function escaparHtml(valor) {
    const elemento = document.createElement("div");
    elemento.textContent = String(valor ?? "");
    return elemento.innerHTML;
}




function formatarData(valor) {
    if (!valor) {
        return "-";
    }


    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "-"
        : data.toLocaleString("pt-BR");
}








function explicarRecusaPagamento(statusDetalhe) {
    const detalhe = String(statusDetalhe || "").toLowerCase();
    const motivos = {
        cc_rejected_high_risk:
            "A análise de segurança do Mercado Pago classificou a tentativa como alto risco. Não repita imediatamente com os mesmos dados e confirme que comprador e vendedor são contas diferentes.",
        rejected_high_risk:
            "A análise de risco recusou a operação. O comprador deve usar a própria conta e um dispositivo habitual.",
        cc_rejected_other_reason:
            "O banco emissor ou o Mercado Pago recusou a operação sem informar um motivo mais específico.",
        rejected_by_bank:
            "O banco emissor recusou a compra. O titular precisa autorizar a operação junto ao banco.",
        cc_rejected_call_for_authorize:
            "O banco exige autorização do titular antes de concluir esta compra.",
        cc_rejected_card_disabled:
            "O cartão está bloqueado ou desabilitado para esta compra.",
        cc_rejected_insufficient_amount:
            "O cartão não possui limite disponível suficiente.",
        cc_rejected_invalid_installments:
            "A quantidade de parcelas escolhida não é aceita pelo cartão.",
        cc_rejected_duplicated_payment:
            "O Mercado Pago identificou a cobrança como uma tentativa duplicada.",
        cc_rejected_max_attempts:
            "O limite de tentativas foi atingido. Aguarde antes de tentar novamente.",
        cc_rejected_bad_filled_card_number:
            "O número do cartão foi preenchido incorretamente.",
        cc_rejected_bad_filled_date:
            "A validade do cartão foi preenchida incorretamente.",
        cc_rejected_bad_filled_security_code:
            "O código de segurança do cartão foi preenchido incorretamente.",
        rejected_insufficient_data:
            "O Mercado Pago recebeu dados insuficientes para analisar o pagamento.",
        rejected_by_regulations:
            "A operação foi recusada por regras regulatórias.",
        rejected_by_biz_rule:
            "A operação foi recusada por uma regra comercial do Mercado Pago."
    };


    return motivos[detalhe]
        || "Consulte o status detalhado acima ao falar com o suporte do Mercado Pago ou com o banco emissor.";
}




function opcoesAcesso(acessoAtual) {
    const acessos = acessoAtual === "ADM"
        ? ["ADM"]
        : ["FREE", "PREMIUM", "CORTESIA"];

    return acessos
        .map(acesso => `
            <option value="${acesso}" ${acesso === acessoAtual ? "selected" : ""}>
                ${acesso === "CORTESIA" ? "Cortesia" : acesso}
            </option>
        `)
        .join("");
}




function classificacaoUsuario(usuario) {
    if (usuario?.perfil === "ADMIN"
        && String(usuario?.email || "").toLowerCase() === "smartlistevx@gmail.com") {
        return "ADM";
    }

    if (usuario?.classificacaoAcesso) {
        return usuario.classificacaoAcesso;
    }


    if (usuario?.assinaturaAtiva) {
        return "PAGANTE";
    }


    if (usuario?.tipoAcesso === "CORTESIA") {
        return "CORTESIA";
    }


    if (usuario?.tipoAcesso === "PREMIUM") {
        return "PREMIUM_MANUAL";
    }


    return "FREE";
}




function apresentarClassificacao(usuario) {
    const classificacao = classificacaoUsuario(usuario);
    const opcoes = {
        ADM: {
            rotulo: "ADM",
            classe: "status-aviso",
            titulo: "Conta administrativa principal, fora dos gráficos"
        },
        PAGANTE: {
            rotulo: "Pagante",
            classe: "status-ok",
            titulo: "Assinatura paga e ativa"
        },
        CORTESIA: {
            rotulo: "Cortesia",
            classe: "status-alerta",
            titulo: "Acesso Premium concedido gratuitamente"
        },
        PREMIUM_MANUAL: {
            rotulo: "Premium manual",
            classe: "status-aviso",
            titulo: "Premium administrativo sem assinatura paga"
        },
        INATIVO: {
            rotulo: "Inativo",
            classe: "status-erro",
            titulo: "Sem uso do app há 40 dias ou mais"
        },
        FREE: {
            rotulo: "Free",
            classe: "status-inativo",
            titulo: "Usuário sem assinatura paga ou cortesia ativa"
        }
    };


    return opcoes[classificacao] || opcoes.FREE;
}




function renderizarUsuarios(usuarios = []) {
    const corpo = document.getElementById("tabelaAdminUsuarios");


    if (!corpo) {
        return;
    }


    if (!usuarios.length) {
        corpo.innerHTML = `
            <tr>
                <td colspan="12" class="estado-vazio">
                    Nenhum usuário encontrado.
                </td>
            </tr>
        `;
        return;
    }


    corpo.innerHTML = usuarios.map(usuario => {
        const codigoClassificacao = classificacaoUsuario(usuario);
        const acesso = codigoClassificacao === "ADM"
            ? "ADM"
            : usuario.tipoAcesso || "FREE";
        const classificacao = apresentarClassificacao(usuario);


        return `
            <tr>
                <td>${escaparHtml(usuario.nome || "-")}</td>
                <td>${escaparHtml(usuario.email || "-")}</td>
                <td>${escaparHtml(usuario.cidade || "Não informado")}</td>
                <td>${escaparHtml(usuario.estado || "-")}</td>
                <td>${escaparHtml(usuario.perfil || "USUARIO")}</td>
                <td>
                    <div class="admin-acesso-controle">
                        <select
                            data-acesso-usuario="${escaparHtml(usuario.id)}"
                            aria-label="Novo acesso de ${escaparHtml(usuario.nome || usuario.email)}"
                            ${codigoClassificacao === "ADM" ? "disabled" : ""}
                        >
                            ${opcoesAcesso(acesso)}
                        </select>
                    </div>
                </td>
                <td>
                    <span
                        class="status ${classificacao.classe}"
                        title="${escaparHtml(classificacao.titulo)}">
                        ${escaparHtml(classificacao.rotulo)}
                    </span>
                </td>
                <td>${escaparHtml(usuario.ciclo || "-")}</td>
                <td>${formatarData(usuario.assinaturaVenceEm || usuario.cortesiaAte)}</td>
                <td>${formatarData(usuario.ultimoAcessoEm)}</td>
                <td>
                    <span class="status ${usuario.ativo === false ? "status-erro" : "status-ok"}">
                        ${usuario.ativo === false ? "Bloqueado" : "Ativo"}
                    </span>
                </td>
                <td>
                    <div class="admin-acoes-usuario">
                        <button
                            type="button"
                            class="btn btn-primary btn-pequeno"
                            data-usuario-id="${escaparHtml(usuario.id)}"
                            data-acao="alterar-acesso"
                            ${codigoClassificacao === "ADM" ? "disabled" : ""}
                        >${codigoClassificacao === "ADM" ? "Conta principal" : "Alterar acesso"}</button>
                        <button
                            type="button"
                            class="btn-secundario btn-pequeno"
                            data-usuario-id="${escaparHtml(usuario.id)}"
                            data-acao="alternar-bloqueio"
                        >${usuario.ativo === false ? "Desbloquear" : "Bloquear"}</button>
                        <button
                            type="button"
                            class="btn btn-danger btn-pequeno"
                            data-usuario-id="${escaparHtml(usuario.id)}"
                            data-acao="excluir-conta"
                            data-usuario-email="${escaparHtml(usuario.email)}"
                        >Excluir conta</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}




function renderizarUltimosUsuarios(usuarios = []) {
    const container = document.getElementById("adminUltimosUsuarios");


    if (!container) {
        return;
    }


    const recentes = usuarios.slice(0, 5);


    if (!recentes.length) {
        container.innerHTML = '<p class="estado-vazio">Nenhum usuário encontrado.</p>';
        return;
    }


    container.innerHTML = recentes.map(usuario => {
        const classificacao = apresentarClassificacao(usuario);


        return `
        <div class="status-item admin-usuario-recente">
            <strong class="admin-usuario-recente-nome">
                ${escaparHtml(usuario.nome || "-")}
            </strong>
            <small class="admin-usuario-recente-email">
                ${escaparHtml(usuario.email || "-")}
            </small>
            <span class="status ${classificacao.classe}">
                ${escaparHtml(classificacao.rotulo)}
            </span>
        </div>
        `;
    }).join("");
}




function aplicarFiltrosUsuarios() {
    const busca = document.getElementById("buscarAdminUsuario")?.value
        .trim()
        .toLowerCase() || "";
    const acesso = document.getElementById("filtroPlanoUsuario")?.value || "";
    const ciclo = document.getElementById("filtroCicloUsuario")?.value || "";
    const status = document.getElementById("filtroStatusUsuario")?.value || "";


    const filtrados = usuariosAdmin.filter(usuario => {
        const correspondeBusca = !busca
            || String(usuario.nome || "").toLowerCase().includes(busca)
            || String(usuario.email || "").toLowerCase().includes(busca)
            || String(usuario.cidade || "").toLowerCase().includes(busca)
            || String(usuario.estado || "").toLowerCase().includes(busca);
        const correspondeAcesso =
            !acesso || classificacaoUsuario(usuario) === acesso;
        const correspondeCiclo = !ciclo || usuario.ciclo === ciclo;
        const statusUsuario = usuario.ativo === false ? "BLOQUEADO" : "ATIVO";
        const correspondeStatus = !status || statusUsuario === status;


        return correspondeBusca
            && correspondeAcesso
            && correspondeCiclo
            && correspondeStatus;
    });


    renderizarUsuarios(filtrados);
}




async function carregarUsuarios() {
    const possuiTabela = document.getElementById("tabelaAdminUsuarios");
    const possuiResumoRecente = document.getElementById("adminUltimosUsuarios");


    if (!possuiTabela && !possuiResumoRecente) {
        return;
    }


    try {
        const resposta = await api.get("/admin/usuarios");
        const usuarios = resposta?.content || resposta?.usuarios || resposta || [];
        usuariosAdmin = Array.isArray(usuarios) ? usuarios : [];
        renderizarOpcoesCortesia(usuariosAdmin);
        renderizarUltimosUsuarios(usuariosAdmin);


        if (possuiTabela) {
            aplicarFiltrosUsuarios();
        }
    } catch (erro) {
        usuariosAdmin = [];
        renderizarUsuarios([]);
        renderizarUltimosUsuarios([]);
        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível carregar os usuários.",
            "erro"
        );
    }
}




function registrarHorarioAtualizacao() {
    const horario = document.getElementById("ultimaAtualizacaoAdmin");


    if (horario) {
        horario.textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })}`;
    }
}




async function atualizarPainelAdmin() {
    if (atualizacaoPainelEmAndamento) {
        return;
    }


    atualizacaoPainelEmAndamento = true;
    const botao = document.getElementById("btnAtualizarAdmin");
    const textoOriginal = botao?.textContent;


    if (botao) {
        botao.disabled = true;
        botao.textContent = "↻ Atualizando...";
        botao.setAttribute("aria-busy", "true");
    }


    try {
        await Promise.allSettled([
            carregarUsuarios(),
            carregarResumo(),
            carregarAuditoriaAcessos()
        ]);
        registrarHorarioAtualizacao();
    } finally {
        atualizacaoPainelEmAndamento = false;


        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal || "↻ Atualizar painel";
            botao.removeAttribute("aria-busy");
        }
    }
}




async function atualizarAssinaturasAdmin() {
    if (atualizacaoAssinaturasEmAndamento || document.hidden) {
        return;
    }


    atualizacaoAssinaturasEmAndamento = true;


    try {
        await Promise.all([carregarUsuarios(), carregarResumo()]);
        registrarHorarioAtualizacao();
    } finally {
        atualizacaoAssinaturasEmAndamento = false;
    }
}




function iniciarAtualizacaoAutomaticaAssinaturas() {
    const exibeAssinaturas =
        document.getElementById("tabelaAdminUsuarios")
        || document.getElementById("adminUltimosUsuarios")
        || document.getElementById("usuariosPremium")
        || document.getElementById("adminTotalPremium");


    if (!exibeAssinaturas || intervaloAtualizacaoAssinaturas) {
        return;
    }


    intervaloAtualizacaoAssinaturas = window.setInterval(
        atualizarAssinaturasAdmin,
        30000
    );


    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            atualizarAssinaturasAdmin();
        }
    });


    window.addEventListener("pagehide", () => {
        window.clearInterval(intervaloAtualizacaoAssinaturas);
        intervaloAtualizacaoAssinaturas = null;
    }, { once: true });
}




async function enviarAlteracaoAcesso(id, dados) {
    try {
        return await api.patch(`/admin/usuarios/${id}/acesso`, dados);
    } catch (erro) {
        if (erro instanceof ApiError && erro.status === 409) {
            const confirmar = window.confirm(
                `${erro.message}\n\nDeseja realmente continuar?`
            );


            if (!confirmar) {
                return null;
            }


            return api.patch(`/admin/usuarios/${id}/acesso`, {
                ...dados,
                confirmarAssinaturaAtiva: true
            });
        }


        throw erro;
    }
}




async function alterarAcessoUsuario(id) {
    const usuario = usuariosAdmin.find(item => item.id === id);
    const seletor = document.querySelector(`[data-acesso-usuario="${id}"]`);
    const tipoAcesso = seletor?.value;


    if (!usuario || !tipoAcesso) {
        return;
    }


    if (tipoAcesso === usuario.tipoAcesso) {
        mensagem("Selecione um acesso diferente do atual.", "erro");
        return;
    }


    let diasCortesia = null;


    if (tipoAcesso === "CORTESIA") {
        const informado = window.prompt("Por quantos dias deseja conceder a cortesia?", "30");


        if (informado === null) {
            return;
        }


        diasCortesia = Number(informado);


        if (!Number.isInteger(diasCortesia) || diasCortesia < 1 || diasCortesia > 3650) {
            mensagem("Informe uma quantidade entre 1 e 3650 dias.", "erro");
            return;
        }
    }


    const motivo = window.prompt("Informe o motivo desta alteração:", "Ajuste administrativo")?.trim();


    if (!motivo) {
        mensagem("O motivo da alteração é obrigatório.", "erro");
        return;
    }


    const confirmar = window.confirm(
        `Alterar ${usuario.email} de ${usuario.tipoAcesso} para ${tipoAcesso}?`
    );


    if (!confirmar) {
        seletor.value = usuario.tipoAcesso;
        return;
    }


    try {
        const resposta = await enviarAlteracaoAcesso(id, {
            tipoAcesso,
            diasCortesia,
            motivo,
            confirmarAssinaturaAtiva: false
        });


        if (!resposta) {
            seletor.value = usuario.tipoAcesso;
            return;
        }


        mensagem(resposta.mensagem || "Tipo de acesso atualizado.");
        await Promise.all([carregarUsuarios(), carregarResumo(), carregarAuditoriaAcessos()]);
    } catch (erro) {
        seletor.value = usuario.tipoAcesso;
        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível alterar o acesso.",
            "erro"
        );
    }
}




async function concederCortesia(evento) {
    evento.preventDefault();


    const formulario = evento.currentTarget;
    const campoEmail = document.getElementById("cortesiaUsuarioEmail");
    const campoDias = document.getElementById("cortesiaDias");
    const campoMotivo = document.getElementById("cortesiaMotivo");
    const botao = formulario.querySelector('button[type="submit"]');
    const email = campoEmail?.value.trim().toLowerCase();
    const dias = Number(campoDias?.value || 30);
    const motivo = campoMotivo?.value.trim();


    if (!email || !motivo || !Number.isInteger(dias) || dias < 1 || dias > 3650) {
        exibirResultadoCortesia(
            "Informe um usuário cadastrado, uma duração entre 1 e 3650 dias e o motivo da cortesia.",
            "erro"
        );
        return;
    }


    const usuarioCadastrado = usuariosAdmin.find(
        usuario => String(usuario.email || "").trim().toLowerCase() === email
    );


    if (usuariosAdmin.length > 0 && !usuarioCadastrado) {
        exibirResultadoCortesia(
            `Nenhum usuário foi encontrado com o e-mail ${email}. Selecione um e-mail da lista de usuários cadastrados.`,
            "erro"
        );
        campoEmail?.focus();
        return;
    }


    const dados = {
        email,
        dias,
        motivo,
        confirmarAssinaturaAtiva: false
    };
    const textoOriginalBotao = botao?.textContent;


    if (botao) {
        botao.disabled = true;
        botao.textContent = "Concedendo...";
        botao.setAttribute("aria-busy", "true");
    }


    try {
        let resposta;


        try {
            resposta = await api.post("/admin/usuarios/cortesia", dados);
        } catch (erro) {
            if (!(erro instanceof ApiError) || erro.status !== 409) {
                throw erro;
            }


            if (!window.confirm(`${erro.message}\n\nDeseja realmente continuar?`)) {
                exibirResultadoCortesia("Concessão de cortesia cancelada.", "aviso");
                return;
            }


            resposta = await api.post("/admin/usuarios/cortesia", {
                ...dados,
                confirmarAssinaturaAtiva: true
            });
        }


        exibirResultadoCortesia(
            resposta.mensagem || `Cortesia de ${dias} dias concedida para ${email}.`
        );
        formulario.reset();
        campoDias.value = "30";


        await Promise.allSettled([
            carregarUsuarios(),
            carregarResumo(),
            carregarAuditoriaAcessos()
        ]);
    } catch (erro) {
        exibirResultadoCortesia(descreverErroCortesia(erro), "erro");
    } finally {
        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginalBotao || "Conceder cortesia";
            botao.removeAttribute("aria-busy");
        }
    }
}




function renderizarAuditoriaAcessos(registros = []) {
    const corpo = document.getElementById("tabelaAuditoriaAcesso");
    const botaoLimpar = document.getElementById("btnLimparAuditoria");


    if (botaoLimpar) {
        botaoLimpar.disabled = registros.length === 0;
    }


    if (!corpo) {
        return;
    }


    if (!registros.length) {
        corpo.innerHTML = `<tr><td colspan="6" class="estado-vazio">Nenhuma alteração registrada.</td></tr>`;
        return;
    }


    corpo.innerHTML = registros.map(registro => `
        <tr>
            <td>${formatarData(registro.criadoEm)}</td>
            <td>${escaparHtml(registro.usuarioEmail)}</td>
            <td>${escaparHtml(registro.acessoAnterior)} → ${escaparHtml(registro.acessoNovo)}</td>
            <td>${escaparHtml(registro.administradorEmail)}</td>
            <td>${escaparHtml(registro.motivo)}</td>
            <td>${registro.assinaturaAtiva ? "Sim" : "Não"}</td>
        </tr>
    `).join("");
}




async function carregarAuditoriaAcessos() {
    if (!document.getElementById("tabelaAuditoriaAcesso")) {
        return;
    }


    try {
        const resposta = await api.get(`/admin/usuarios/auditoria?atualizacao=${Date.now()}`);
        renderizarAuditoriaAcessos(Array.isArray(resposta) ? resposta : []);
    } catch (erro) {
        renderizarAuditoriaAcessos([]);
        mensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível carregar a auditoria.",
            "erro"
        );
    }
}




async function limparAuditoriaAcessos() {
    const botao = document.getElementById("btnLimparAuditoria");


    if (!botao || botao.disabled) {
        return;
    }


    const confirmar = window.confirm(
        "Excluir definitivamente todo o histórico de auditoria? Esta ação não pode ser desfeita."
    );


    if (!confirmar) {
        return;
    }


    const textoOriginal = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Limpando...";
    botao.setAttribute("aria-busy", "true");


    try {
        const resposta = await api.post(
            "/admin/usuarios/auditoria/limpar",
            {}
        );
        await carregarAuditoriaAcessos();
        mensagem(
            resposta?.mensagem || "Histórico de auditoria removido com sucesso."
        );
    } catch (erro) {
        botao.disabled = false;
        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível limpar a auditoria.",
            "erro"
        );
    } finally {
        botao.textContent = textoOriginal;
        botao.removeAttribute("aria-busy");
    }
}




async function alternarBloqueioUsuario(id) {
    const usuario = usuariosAdmin.find(item => item.id === id);


    if (!usuario || !window.confirm(
        `${usuario.ativo === false ? "Desbloquear" : "Bloquear"} a conta ${usuario.email}?`
    )) {
        return;
    }


    try {
        await api.patch(`/admin/usuarios/${id}/bloqueio`, {});
        mensagem("Situação do usuário atualizada.");
        await carregarUsuarios();
    } catch (erro) {
        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível atualizar o usuário.",
            "erro"
        );
    }
}




async function excluirContaUsuario(id, email) {
    const confirmacao = window.prompt(
        `Esta ação excluirá e anonimizará definitivamente a conta. Digite o e-mail ${email} para confirmar:`
    );


    if (confirmacao?.trim().toLowerCase() !== String(email).toLowerCase()) {
        if (confirmacao !== null) {
            mensagem("O e-mail informado não corresponde à conta.", "erro");
        }
        return;
    }


    try {
        await api.delete(`/admin/usuarios/${id}`);
        mensagem("Conta excluída e dados pessoais anonimizados.");
        await Promise.all([
            carregarUsuarios(),
            carregarResumo(),
            carregarAuditoriaAcessos()
        ]);
    } catch (erro) {
        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível excluir a conta.",
            "erro"
        );
    }
}




function atualizarExemploMargem() {


    const campoMargem =
        document.getElementById(
            "margemScraper"
        );


    if (campoMargem) {


        campoMargem.value =
            String(MARGEM_SCRAPER);


        campoMargem.readOnly = true;


    }


    const precoExemplo =
        Number(
            document.getElementById(
                "precoExemplo"
            )?.value || 100
        );


    const minimo =
        precoExemplo * 0.95;


    const maximo =
        precoExemplo * 1.05;


    preencherTexto(
        "exemploMargemMinimo",
        formatarMoeda(minimo)
    );


    preencherTexto(
        "exemploMargemMaximo",
        formatarMoeda(maximo)
    );


    const exemplo =
        document.getElementById(
            "exemploMargem"
        );


    if (exemplo) {


        exemplo.textContent =
            `${formatarMoeda(precoExemplo)} poderá ser exibido entre ${formatarMoeda(minimo)} e ${formatarMoeda(maximo)}. O preço original será preservado.`;


    }


}




async function salvarMargemScraper(evento) {


    evento.preventDefault();


    try {


        await api.put(
            "/admin/scrapers/configuracao",
            {
                margemPercentual:
                    MARGEM_SCRAPER
            }
        );


        mensagem(
            "Margem de segurança fixada em 5%."
        );


    } catch (erro) {


        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível salvar a configuração.",
            "erro"
        );


    }


}




async function executarScraper() {


    const confirmar = window.confirm(
        "Deseja iniciar uma execução manual do scraper?"
    );


    if (!confirmar) {


        return;


    }


    try {


        await api.post(
            "/admin/scrapers/executar",
            {}
        );


        mensagem(
            "Execução do scraper solicitada."
        );


    } catch (erro) {


        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível executar o scraper.",
            "erro"
        );


    }


}




function configurarFormulariosComEndpoint() {


    document
        .querySelectorAll(
            "form[data-endpoint]"
        )
        .forEach(formulario => {


            formulario.addEventListener(
                "submit",
                async evento => {


                    evento.preventDefault();


                    const endpoint =
                        formulario.dataset.endpoint;


                    const metodo =
                        (
                            formulario.dataset.metodo ||
                            "POST"
                        ).toLowerCase();


                    const dados =
                        Object.fromEntries(
                            new FormData(formulario)
                                .entries()
                        );


                    try {


                        await api[metodo](
                            endpoint,
                            dados
                        );


                        mensagem(
                            "Dados salvos com sucesso."
                        );


                        formulario.reset();


                    } catch (erro) {


                        mensagem(
                            erro instanceof ApiError
                                ? erro.message
                                : "Não foi possível salvar os dados.",
                            "erro"
                        );


                    }


                }
            );


        });


}




async function iniciar() {


    if (!estaAutenticado()) {
        window.location.replace("../login.html");
        return;
    }


    let usuario;


    try {
        usuario = await api.get("/usuarios/me");
        localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
    } catch (erro) {
        if (Number(erro?.status) === 401) {
            window.location.replace("../login.html");
        } else {
            mensagem(
                erro?.message || "Não foi possível confirmar a sessão administrativa agora.",
                "erro"
            );
        }
        return;
    }


    if (String(usuario?.perfil || "").toUpperCase() !== "ADMIN") {
        window.location.replace("../inicio.html");
        return;
    }


    if (document.getElementById("btnAtualizarAdmin")) {
        atualizarPainelAdmin();
    } else {
        carregarResumo();
        carregarUsuarios();
        carregarAuditoriaAcessos();
    }
    iniciarAtualizacaoAutomaticaAssinaturas();


    atualizarExemploMargem();


    document
        .getElementById("btnAtualizarAdmin")
        ?.addEventListener(
            "click",
            atualizarPainelAdmin
        );


    document
        .getElementById("formCortesia")
        ?.addEventListener(
            "submit",
            concederCortesia
        );


    document
        .getElementById("formMargemScraper")
        ?.addEventListener(
            "submit",
            salvarMargemScraper
        );


    document
        .getElementById("precoExemplo")
        ?.addEventListener(
            "input",
            atualizarExemploMargem
        );


    document
        .getElementById("btnExecutarScraper")
        ?.addEventListener(
            "click",
            executarScraper
        );


    document
        .getElementById("btnLimparAuditoria")
        ?.addEventListener(
            "click",
            limparAuditoriaAcessos
        );


    document
        .getElementById("tabelaAdminUsuarios")
        ?.addEventListener(
            "click",
            evento => {


                const botao = evento.target.closest("[data-acao]");


                if (botao?.dataset.acao === "alternar-bloqueio") {


                    alternarBloqueioUsuario(
                        botao.dataset.usuarioId
                    );


                }


                if (botao?.dataset.acao === "alterar-acesso") {
                    alterarAcessoUsuario(botao.dataset.usuarioId);
                }


                if (botao?.dataset.acao === "excluir-conta") {
                    excluirContaUsuario(
                        botao.dataset.usuarioId,
                        botao.dataset.usuarioEmail
                    );
                }


            }
        );


    [
        "buscarAdminUsuario",
        "filtroPlanoUsuario",
        "filtroCicloUsuario",
        "filtroStatusUsuario"
    ].forEach(id => {
        const campo = document.getElementById(id);
        campo?.addEventListener(
            campo.tagName === "INPUT" ? "input" : "change",
            aplicarFiltrosUsuarios
        );
    });


    configurarFormulariosComEndpoint();


}




document.addEventListener(
    "DOMContentLoaded",
    iniciar
);
