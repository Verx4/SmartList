import { api, ApiError } from "./api.js";
import { estaAutenticado, usuarioAtual } from "./auth.js";


const MARGEM_SCRAPER = 5;
let usuariosAdmin = [];


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


function mostrarBackendOffline() {

    const status =
        document.getElementById("statusBackendAdmin");

    if (status) {

        status.textContent = "Backend offline";
        status.className =
            "status status-erro";

    }

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
        preencherTextos(["usuariosPremium", "adminTotalPremium"], dados?.usuariosPremium);
        preencherTextos(
            ["usuariosCortesia", "adminTotalCortesia", "quantidadeCortesia"],
            dados?.usuariosCortesia
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


function opcoesAcesso(acessoAtual) {
    return ["FREE", "PREMIUM", "CORTESIA"]
        .map(acesso => `
            <option value="${acesso}" ${acesso === acessoAtual ? "selected" : ""}>
                ${acesso === "CORTESIA" ? "Cortesia" : acesso}
            </option>
        `)
        .join("");
}


function renderizarUsuarios(usuarios = []) {
    const corpo = document.getElementById("tabelaAdminUsuarios");

    if (!corpo) {
        return;
    }

    if (!usuarios.length) {
        corpo.innerHTML = `
            <tr>
                <td colspan="8" class="estado-vazio">
                    Nenhum usuário encontrado.
                </td>
            </tr>
        `;
        return;
    }

    corpo.innerHTML = usuarios.map(usuario => {
        const acesso = usuario.tipoAcesso || "FREE";
        const assinatura = usuario.assinaturaAtiva
            ? `<span class="status status-alerta" title="Assinatura paga ativa">Paga ativa</span>`
            : "";

        return `
            <tr>
                <td>${escaparHtml(usuario.nome || "-")}</td>
                <td>${escaparHtml(usuario.email || "-")}</td>
                <td>${escaparHtml(usuario.perfil || "USUARIO")}</td>
                <td>
                    <div class="admin-acesso-controle">
                        <select
                            data-acesso-usuario="${escaparHtml(usuario.id)}"
                            aria-label="Novo acesso de ${escaparHtml(usuario.nome || usuario.email)}"
                        >
                            ${opcoesAcesso(acesso)}
                        </select>
                        ${assinatura}
                    </div>
                </td>
                <td>${escaparHtml(usuario.ciclo || "-")}</td>
                <td>${formatarData(usuario.cortesiaAte)}</td>
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
                        >Alterar acesso</button>
                        <button
                            type="button"
                            class="btn-secundario btn-pequeno"
                            data-usuario-id="${escaparHtml(usuario.id)}"
                            data-acao="alternar-bloqueio"
                        >${usuario.ativo === false ? "Desbloquear" : "Bloquear"}</button>
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

    container.innerHTML = recentes.map(usuario => `
        <div class="status-item">
            <span>
                <strong>${escaparHtml(usuario.nome || "-")}</strong><br>
                <small>${escaparHtml(usuario.email || "-")}</small>
            </span>
            <span class="status ${usuario.ativo === false ? "status-erro" : "status-ok"}">
                ${escaparHtml(usuario.tipoAcesso || "FREE")}
            </span>
        </div>
    `).join("");
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
            || String(usuario.email || "").toLowerCase().includes(busca);
        const correspondeAcesso = !acesso || usuario.tipoAcesso === acesso;
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

    const email = document.getElementById("cortesiaUsuarioEmail")?.value.trim();
    const dias = Number(document.getElementById("cortesiaDias")?.value || 30);
    const motivo = document.getElementById("cortesiaMotivo")?.value.trim();

    if (!email || !motivo || !Number.isInteger(dias) || dias < 1 || dias > 3650) {
        mensagem("Informe e-mail, duração válida e motivo da cortesia.", "erro");
        return;
    }

    const dados = {
        email,
        dias,
        motivo,
        confirmarAssinaturaAtiva: false
    };

    try {
        let resposta;

        try {
            resposta = await api.post("/admin/usuarios/cortesia", dados);
        } catch (erro) {
            if (!(erro instanceof ApiError) || erro.status !== 409) {
                throw erro;
            }

            if (!window.confirm(`${erro.message}\n\nDeseja realmente continuar?`)) {
                return;
            }

            resposta = await api.post("/admin/usuarios/cortesia", {
                ...dados,
                confirmarAssinaturaAtiva: true
            });
        }

        mensagem(resposta.mensagem || "Cortesia concedida.");
        evento.currentTarget.reset();
        document.getElementById("cortesiaDias").value = "30";
        await Promise.all([carregarUsuarios(), carregarResumo(), carregarAuditoriaAcessos()]);
    } catch (erro) {
        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível conceder a cortesia.",
            "erro"
        );
    }
}


function renderizarAuditoriaAcessos(registros = []) {
    const corpo = document.getElementById("tabelaAuditoriaAcesso");

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
        const resposta = await api.get("/admin/usuarios/auditoria");
        renderizarAuditoriaAcessos(Array.isArray(resposta) ? resposta : []);
    } catch (erro) {
        renderizarAuditoriaAcessos([]);
        mensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível carregar a auditoria.",
            "erro"
        );
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


function iniciar() {

    if (!estaAutenticado()) {
        window.location.replace("../login.html");
        return;
    }

    if (String(usuarioAtual()?.perfil || "").toUpperCase() !== "ADMIN") {
        window.location.replace("../dashboard.html");
        return;
    }

    carregarResumo();
    carregarUsuarios();
    carregarAuditoriaAcessos();

    atualizarExemploMargem();

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
