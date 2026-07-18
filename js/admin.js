import { api, ApiError } from "./api.js";


const MARGEM_SCRAPER = 5;


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
        document.getElementById("usuariosPremium");

    if (!possuiResumo) {

        return;

    }

    try {

        const dados =
            await api.get("/admin/resumo");

        preencherTexto(
            "totalUsuarios",
            dados?.totalUsuarios
        );

        preencherTexto(
            "usuariosFree",
            dados?.usuariosFree
        );

        preencherTexto(
            "usuariosPremium",
            dados?.usuariosPremium
        );

        preencherTexto(
            "usuariosCortesia",
            dados?.usuariosCortesia
        );

        preencherTexto(
            "assinaturasMensais",
            dados?.assinaturasMensais
        );

        preencherTexto(
            "assinaturasTrimestrais",
            dados?.assinaturasTrimestrais
        );

        preencherTexto(
            "assinaturasAnuais",
            dados?.assinaturasAnuais
        );

        preencherTexto(
            "totalProdutosAdmin",
            dados?.totalProdutos
        );

        preencherTexto(
            "totalSupermercadosAdmin",
            dados?.totalSupermercados
        );

    } catch {

        mostrarBackendOffline();

    }

}


function renderizarUsuarios(usuarios = []) {

    const corpo =
        document.getElementById(
            "corpoTabelaUsuarios"
        );

    if (!corpo) {

        return;

    }

    if (!usuarios.length) {

        corpo.innerHTML = `

            <tr>

                <td colspan="6">
                    Nenhum usuário encontrado.
                </td>

            </tr>

        `;

        return;

    }

    corpo.innerHTML = usuarios.map(usuario => `

        <tr>

            <td>${usuario.nome || "-"}</td>

            <td>${usuario.email || "-"}</td>

            <td>
                ${usuario.tipoAcesso || "FREE"}
            </td>

            <td>
                ${usuario.ciclo || "-"}
            </td>

            <td>
                ${usuario.ativo === false ? "Bloqueado" : "Ativo"}
            </td>

            <td>

                <button
                    type="button"
                    class="btn-secundario btn-pequeno"
                    data-usuario-id="${usuario.id}"
                    data-acao="alternar-bloqueio"
                >
                    ${usuario.ativo === false ? "Desbloquear" : "Bloquear"}
                </button>

            </td>

        </tr>

    `).join("");

}


async function carregarUsuarios() {

    if (
        !document.getElementById(
            "corpoTabelaUsuarios"
        )
    ) {

        return;

    }

    try {

        const resposta =
            await api.get("/admin/usuarios");

        const usuarios =
            resposta?.content ||
            resposta?.usuarios ||
            resposta ||
            [];

        renderizarUsuarios(
            Array.isArray(usuarios)
                ? usuarios
                : []
        );

    } catch (erro) {

        renderizarUsuarios([]);

        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível carregar os usuários.",
            "erro"
        );

    }

}


async function concederCortesia(evento) {

    evento.preventDefault();

    const email =
        document.getElementById(
            "emailCortesia"
        )?.value.trim();

    const dias =
        Number(
            document.getElementById(
                "diasCortesia"
            )?.value || 30
        );

    if (!email) {

        mensagem(
            "Informe o e-mail do usuário.",
            "erro"
        );

        return;

    }

    try {

        await api.post(
            "/admin/usuarios/cortesia",
            {
                email,
                dias
            }
        );

        mensagem(
            "Acesso Premium por cortesia concedido."
        );

        evento.currentTarget.reset();

        carregarUsuarios();
        carregarResumo();

    } catch (erro) {

        mensagem(
            erro instanceof ApiError
                ? erro.message
                : "Não foi possível conceder a cortesia.",
            "erro"
        );

    }

}


async function alternarBloqueioUsuario(id) {

    try {

        await api.patch(
            `/admin/usuarios/${id}/bloqueio`,
            {}
        );

        mensagem(
            "Situação do usuário atualizada."
        );

        carregarUsuarios();

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

    carregarResumo();
    carregarUsuarios();

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
        .getElementById("corpoTabelaUsuarios")
        ?.addEventListener(
            "click",
            evento => {

                const botao =
                    evento.target.closest(
                        '[data-acao="alternar-bloqueio"]'
                    );

                if (botao) {

                    alternarBloqueioUsuario(
                        botao.dataset.usuarioId
                    );

                }

            }
        );

    configurarFormulariosComEndpoint();

}


document.addEventListener(
    "DOMContentLoaded",
    iniciar
);