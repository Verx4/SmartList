import { api, ApiError } from "./api.js";
import { estaAutenticado } from "./auth.js";

const porId = id => document.getElementById(id);
const estado = { pagina: 0, tamanho: 20, compraAberta: null };
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = valor => Number(valor || 0).toLocaleString("pt-BR");

function dataPartes(valor) {
    if (!valor) return { data: "—", hora: "—" };
    const d = new Date(valor);
    return {
        data: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d),
        hora: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d)
    };
}

function idCurto(id) {
    if (!id) return "—";
    const limpo = String(id).replaceAll("-", "").toUpperCase();
    return `#CMP${limpo.slice(0, 8)}`;
}

async function garantirAdmin() {
    if (!estaAutenticado()) {
        location.replace("../login.html");
        return false;
    }
    let usuario;
    try {
        usuario = await api.get("/usuarios/me");
        localStorage.setItem("usuarioAtual", JSON.stringify(usuario));
    } catch (erro) {
        if (Number(erro?.status) === 401) {
            location.replace("../login.html");
        } else {
            porId("tabelaCompras").innerHTML = `
                <tr><td colspan="8" class="coleta-vazio">${escapar(
                    erro?.message || "Não foi possível confirmar a sessão administrativa agora."
                )}</td></tr>
            `;
        }
        return false;
    }
    if (String(usuario?.perfil || usuario?.role || "").toUpperCase() !== "ADMIN") {
        location.replace("../inicio.html");
        return false;
    }
    return true;
}

function preencherSelect(id, valores) {
    const select = porId(id);
    const primeiro = select.options[0]?.outerHTML || '<option value="">Todos</option>';
    select.innerHTML = primeiro + (valores || []).map(v => `<option value="${escapar(v)}">${escapar(v)}</option>`).join("");
}

function consulta() {
    const params = new URLSearchParams({ pagina: String(estado.pagina), tamanho: String(estado.tamanho) });
    const busca = porId("filtroBuscaCompra").value.trim();
    const mercado = porId("filtroMercadoCompra").value;
    const usuario = porId("filtroUsuarioCompra").value;
    const inicio = porId("filtroInicioCompra").value;
    const fim = porId("filtroFimCompra").value;
    if (busca) params.set("busca", busca);
    if (mercado) params.set("mercado", mercado);
    if (usuario) params.set("usuario", usuario);
    if (inicio) params.set("inicio", new Date(`${inicio}T00:00:00`).toISOString());
    if (fim) params.set("fim", new Date(`${fim}T23:59:59.999`).toISOString());
    return params.toString();
}

async function carregarResumo() {
    const r = await api.get("/admin/coleta-precos/resumo-compras");
    porId("totalCompras").textContent = numero(r.totalCompras);
    porId("totalUsuarios").textContent = numero(r.totalUsuarios);
    porId("totalMercados").textContent = numero(r.totalMercados);
    porId("valorTotalCompras").textContent = moeda(r.valorTotal);
    porId("totalItens").textContent = numero(r.totalItens);
}

async function carregarFiltros() {
    const f = await api.get("/admin/coleta-precos/compras/filtros");
    preencherSelect("filtroMercadoCompra", f.mercados || []);
    preencherSelect("filtroUsuarioCompra", f.usuarios || []);
    const grupoUsuario = porId("filtroUsuarioCompra")?.closest(".form-group");
    if (grupoUsuario) {
        grupoUsuario.hidden = !(f.usuarios || []).length;
    }
}

const td = (rotulo, conteudo, classe = "") => `<td data-label="${escapar(rotulo)}"${classe ? ` class="${classe}"` : ""}>${conteudo}</td>`;

async function carregarCompras() {
    const r = await api.get(`/admin/coleta-precos/compras?${consulta()}`);
    if ((r.totalPaginas || 0) > 0 && estado.pagina >= r.totalPaginas) {
        estado.pagina = Math.max(0, r.totalPaginas - 1);
        return carregarCompras();
    }

    porId("contadorCompras").textContent = `(${numero(r.totalElementos)})`;
    porId("paginaCompras").textContent = `Página ${(r.pagina || 0) + 1} de ${Math.max(1, r.totalPaginas || 0)}`;
    porId("comprasAnterior").disabled = !r.temAnterior;
    porId("comprasProxima").disabled = !r.temProxima;

    porId("tabelaCompras").innerHTML = (r.conteudo || []).map(item => {
        const partes = dataPartes(item.realizadaEm);
        const local = [item.cidade, item.estado].filter(Boolean).join(", ");
        return `<tr data-compra-row="${escapar(item.compraId)}">
            ${td("ID Compra", `<button class="coleta-id-link" type="button" data-abrir-compra="${escapar(item.compraId)}">${escapar(idCurto(item.compraId))}</button>`)}
            ${td("Usuário", `<strong>${escapar(item.usuarioNome || "Acesso restrito")}</strong>`)}
            ${td("Data", escapar(partes.data))}
            ${td("Horário", escapar(partes.hora))}
            ${td("Mercado", `<strong>${escapar(item.mercado || "Não informado")}</strong>${local ? `<small>${escapar(local)}</small>` : ""}`)}
            ${td("Itens", numero(item.totalItens))}
            ${td("Total", `<strong class="coleta-total-valor">${escapar(moeda(item.valorTotal))}</strong>`)}
            ${td("Ações", `<div class="coleta-acoes-grupo"><button class="btn btn-secondary coleta-ver" type="button" data-abrir-compra="${escapar(item.compraId)}" aria-label="Ver detalhes da compra">Ver</button><button class="btn btn-danger" type="button" data-excluir-compra="${escapar(item.compraId)}" aria-label="Excluir esta compra">Excluir</button></div>`, "coleta-acoes")}
        </tr>`;
    }).join("") || '<tr><td colspan="8" class="coleta-vazio">Nenhuma compra finalizada encontrada para os filtros selecionados.</td></tr>';
}

async function abrirCompra(compraId) {
    const r = await api.get(`/admin/coleta-precos/compras/${encodeURIComponent(compraId)}`);
    estado.compraAberta = compraId;
    const partes = dataPartes(r.realizadaEm);
    porId("detalheCompraVazio").hidden = true;
    porId("detalheCompraConteudo").hidden = false;
    porId("detalheCompraId").textContent = idCurto(r.compraId);
    porId("detalheUsuario").textContent = r.usuarioNome || "Acesso restrito";
    porId("detalheMercado").textContent = r.mercado || "Não informado";
    porId("detalheLocalidade").textContent = [r.cidade, r.estado].filter(Boolean).join(", ") || "Não informada";
    porId("detalheData").textContent = partes.data;
    porId("detalheHorario").textContent = partes.hora;
    porId("detalheItens").textContent = `${numero(r.totalItens)} item(ns)`;
    porId("detalheTotal").textContent = moeda(r.valorTotal);
    porId("detalheProdutosQtd").textContent = `(${numero(r.totalItens)})`;

    porId("tabelaItensCompra").innerHTML = (r.itens || []).map(item => `
        <tr>
            ${td("Produto", `<strong>${escapar(item.nomeOriginal || item.produto)}</strong>`)}
            ${td("Qtd", numero(item.quantidade))}
            ${td("Unid.", escapar(item.unidade || "un"))}
            ${td("Preço Unit.", escapar(moeda(item.precoUnitario)))}
            ${td("Subtotal", `<strong>${escapar(moeda(item.subtotal))}</strong>`)}
        </tr>
    `).join("") || '<tr><td colspan="5" class="coleta-vazio">Nenhum item encontrado.</td></tr>';

    document.querySelectorAll("[data-compra-row]").forEach(row => row.classList.toggle("is-selected", row.dataset.compraRow === compraId));
    if (window.matchMedia("(max-width: 980px)").matches) porId("painelDetalheCompra").scrollIntoView({ behavior: "smooth", block: "start" });
}

function fecharDetalhe() {
    estado.compraAberta = null;
    porId("detalheCompraConteudo").hidden = true;
    porId("detalheCompraVazio").hidden = false;
    document.querySelectorAll("[data-compra-row]").forEach(row => row.classList.remove("is-selected"));
}

async function excluirCompra(compraId) {
    await api.delete(
        `/admin/coleta-precos/compras/${encodeURIComponent(compraId)}`
    );
    if (estado.compraAberta === compraId) fecharDetalhe();
}

function exibirErro(erro) {
    const msg = erro instanceof ApiError ? erro.message : "Não foi possível carregar o histórico de compras.";
    porId("tabelaCompras").innerHTML = `<tr><td colspan="8" class="coleta-vazio">${escapar(msg)}</td></tr>`;
}

function exibirErroDetalhe(erro) {
    const msg = erro instanceof ApiError
        ? erro.message
        : "Não foi possível abrir os detalhes desta compra.";
    porId("detalheCompraVazio").hidden = false;
    porId("detalheCompraConteudo").hidden = true;
    porId("detalheCompraVazio").innerHTML = `<h2>Detalhes da compra</h2><p>${escapar(msg)}</p>`;
}

async function carregarTudo() {
    const botao = porId("atualizarCompras");
    botao.disabled = true;
    try {
        await Promise.all([carregarResumo(), carregarCompras()]);
        if (estado.compraAberta) await abrirCompra(estado.compraAberta);
    } catch (erro) {
        exibirErro(erro);
    } finally {
        botao.disabled = false;
    }
}

porId("formFiltrosCompras").addEventListener("submit", e => {
    e.preventDefault();
    estado.pagina = 0;
    carregarCompras().catch(exibirErro);
});

porId("limparFiltrosCompras").addEventListener("click", () => {
    porId("formFiltrosCompras").reset();
    estado.pagina = 0;
    carregarCompras().catch(exibirErro);
});

porId("atualizarCompras").addEventListener("click", carregarTudo);
porId("comprasAnterior").addEventListener("click", () => { if (estado.pagina > 0) estado.pagina -= 1; carregarCompras().catch(exibirErro); });
porId("comprasProxima").addEventListener("click", () => { estado.pagina += 1; carregarCompras().catch(exibirErro); });
porId("fecharDetalheCompra").addEventListener("click", fecharDetalhe);

document.addEventListener("click", async e => {
    const excluir = e.target.closest("[data-excluir-compra]");
    if (excluir) {
        const compraId = excluir.dataset.excluirCompra;
        const confirmou = window.confirm(`Excluir a compra ${idCurto(compraId)}? Esta ação não pode ser desfeita.`);
        if (!confirmou) return;
        excluir.disabled = true;
        try {
            await excluirCompra(compraId);
            await carregarFiltros();
            await carregarTudo();
        } catch (erro) {
            window.alert(erro instanceof ApiError ? erro.message : "Não foi possível excluir esta compra.");
            excluir.disabled = false;
        }
        return;
    }

    const botao = e.target.closest("[data-abrir-compra]");
    if (botao) abrirCompra(botao.dataset.abrirCompra).catch(exibirErroDetalhe);
});

if (await garantirAdmin()) {
    carregarFiltros().then(carregarTudo).catch(exibirErro);
}
