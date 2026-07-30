import "./animations.js";
import { api, ApiError } from "./api.js";

const porId = id => document.getElementById(id);
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const moeda = valor => Number(valor || 0).toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" }
);
const lerLocal = (chave, padrao) => {
    try {
        return JSON.parse(localStorage.getItem(chave)) ?? padrao;
    } catch (_erro) {
        return padrao;
    }
};

const usuario = lerLocal("usuarioAtual", lerLocal("usuarioLogado", {}));
const produtosSalvos = lerLocal("produtos", []);
const nomesProdutos = [...new Set(
    (Array.isArray(produtosSalvos) ? produtosSalvos : [])
        .map(produto => String(produto?.nome || "").trim())
        .filter(Boolean)
)].slice(0, 80);

let localizacaoAtual = null;
let coordenadasDaSessao = null;
let coordenadasPendentes = null;

porId("quantidadeItensOfertas").textContent = String(nomesProdutos.length);
porId("localidadeCidade").value = usuario?.cidade || "";
porId("localidadeEstado").value = usuario?.estado || "";

function mensagem(texto, erro = false) {
    const elemento = porId("mensagemOfertas");
    elemento.textContent = texto;
    elemento.className = `mensagem-ofertas${erro ? " erro" : ""}`;
}

function abrirFormularioLocalidade() {
    const formulario = porId("formLocalidade");
    formulario.hidden = false;
    formulario.scrollIntoView({ behavior: "smooth", block: "center" });
    porId("localidadeCidade").focus();
}

function fecharFormularioLocalidade() {
    porId("formLocalidade").hidden = true;
    coordenadasPendentes = null;
}

function atualizarStatusLocalizacao(resposta) {
    localizacaoAtual = resposta;
    if (!resposta?.consentimentoAtivo) {
        porId("statusLocalizacao").textContent =
            "Sua posição não é coletada em segundo plano.";
        porId("revogarLocalizacao").hidden = true;
        return;
    }
    const partes = [resposta.bairro, resposta.cidade, resposta.estado].filter(Boolean);
    const modo = resposta.coordenadasDisponiveis
        ? "Localização aproximada ativa por até 24 horas"
        : "Localidade informada";
    porId("statusLocalizacao").textContent = `${modo}: ${partes.join(" · ")}`;
    porId("revogarLocalizacao").hidden = false;
    porId("localidadeCidade").value = resposta.cidade || "";
    porId("localidadeEstado").value = resposta.estado || "";
    porId("localidadeBairro").value = resposta.bairro || "";
}

async function carregarLocalizacao() {
    try {
        atualizarStatusLocalizacao(await api.get("/localizacoes/minha"));
    } catch (_erro) {
        atualizarStatusLocalizacao(null);
    }
}

async function salvarLocalizacao(origem, coordenadas = null) {
    const resposta = await api.post("/localizacoes", {
        origem,
        latitude: coordenadas?.latitude ?? null,
        longitude: coordenadas?.longitude ?? null,
        precisaoMetros: coordenadas?.precisao ?? null,
        cidade: porId("localidadeCidade").value.trim(),
        estado: porId("localidadeEstado").value.trim().toUpperCase(),
        bairro: porId("localidadeBairro").value.trim() || null,
        consentimento: porId("consentimentoLocalizacao").checked
    });
    coordenadasDaSessao = coordenadas;
    atualizarStatusLocalizacao(resposta);
    porId("formLocalidade").hidden = true;
    mensagem("Localização salva. Você pode apagá-la a qualquer momento.");
    if (coordenadas) {
        await carregarUnidadesProximas(coordenadas);
    }
}

porId("informarLocalidade").addEventListener("click", () => {
    coordenadasPendentes = null;
    abrirFormularioLocalidade();
});

porId("cancelarLocalidade").addEventListener("click", fecharFormularioLocalidade);

porId("formLocalidade").addEventListener("submit", async evento => {
    evento.preventDefault();
    try {
        await salvarLocalizacao(
            coordenadasPendentes ? "GPS" : "MANUAL",
            coordenadasPendentes
        );
        coordenadasPendentes = null;
    } catch (erro) {
        mensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível salvar a localização.",
            true
        );
    }
});

porId("usarLocalizacao").addEventListener("click", () => {
    if (!navigator.geolocation) {
        mensagem("Este navegador não oferece localização. Informe sua cidade.", true);
        abrirFormularioLocalidade();
        return;
    }

    const botao = porId("usarLocalizacao");
    botao.disabled = true;
    botao.textContent = "Solicitando permissão...";
    navigator.geolocation.getCurrentPosition(
        async posicao => {
            botao.disabled = false;
            botao.textContent = "Usar localização atual";
            coordenadasPendentes = {
                latitude: posicao.coords.latitude,
                longitude: posicao.coords.longitude,
                precisao: posicao.coords.accuracy
            };
            porId("consentimentoLocalizacao").checked = true;
            try {
                await salvarLocalizacao("GPS", coordenadasPendentes);
                coordenadasPendentes = null;
            } catch (erro) {
                mensagem(
                    erro instanceof ApiError
                        ? erro.message
                        : "Não foi possível registrar a localização.",
                    true
                );
                abrirFormularioLocalidade();
            }
        },
        erro => {
            botao.disabled = false;
            botao.textContent = "Usar localização atual";
            const texto = erro.code === erro.PERMISSION_DENIED
                ? "Permissão de localização negada. Você pode informar sua cidade."
                : "Não foi possível obter sua posição. Informe sua cidade.";
            mensagem(texto, true);
            abrirFormularioLocalidade();
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
});

porId("revogarLocalizacao").addEventListener("click", async () => {
    try {
        await api.delete("/localizacoes");
        localStorage.removeItem("smartListLocalizacaoAutorizada");
        coordenadasDaSessao = null;
        atualizarStatusLocalizacao(null);
        porId("unidadesProximas").hidden = true;
        mensagem("Localização apagada.");
    } catch (erro) {
        mensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível apagar agora.",
            true
        );
    }
});

async function carregarUnidadesProximas(coordenadas) {
    try {
        const parametros = new URLSearchParams({
            latitude: String(coordenadas.latitude),
            longitude: String(coordenadas.longitude),
            raioKm: porId("filtroRaio").value
        });
        const unidades = await api.get(`/ofertas/unidades-proximas?${parametros}`);
        if (!Array.isArray(unidades) || !unidades.length) {
            return;
        }
        porId("listaUnidadesProximas").innerHTML = unidades.slice(0, 12).map(unidade => `
            <article class="unidade-proxima">
                <div>
                    <strong>${escapar(unidade.rede)} · ${escapar(unidade.unidade)}</strong>
                    <p>${escapar(unidade.endereco || "Endereço não cadastrado")} · ${escapar(unidade.bairro || unidade.cidade)}</p>
                    <p>${Number(unidade.distanciaKm).toLocaleString("pt-BR")} km</p>
                </div>
                <button class="confirmar-unidade" type="button" data-unidade-id="${escapar(unidade.id)}">Estou nesta unidade</button>
            </article>
        `).join("");
        porId("unidadesProximas").hidden = false;
    } catch (_erro) {
        // A confirmação é opcional e não impede a busca de ofertas.
    }
}

porId("listaUnidadesProximas").addEventListener("click", async evento => {
    const botao = evento.target.closest("[data-unidade-id]");
    if (!botao) {
        return;
    }
    botao.disabled = true;
    try {
        const resposta = await api.post("/localizacoes/unidade-confirmada", {
            unidadeId: botao.dataset.unidadeId
        });
        atualizarStatusLocalizacao(resposta);
        porId("unidadesProximas").hidden = true;
        mensagem(`Unidade confirmada: ${resposta.redeConfirmada} · ${resposta.unidadeConfirmada}.`);
    } catch (erro) {
        mensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível confirmar a unidade.",
            true
        );
        botao.disabled = false;
    }
});

porId("fecharUnidades").addEventListener("click", () => {
    porId("unidadesProximas").hidden = true;
});

porId("formFiltrosOfertas").addEventListener("submit", async evento => {
    evento.preventDefault();
    const pesquisa = porId("filtroProduto").value.trim();
    const produtos = pesquisa ? [pesquisa] : nomesProdutos;
    if (!produtos.length) {
        mensagem("Adicione produtos à lista ou digite um produto para pesquisar.", true);
        return;
    }

    const botao = porId("buscarOfertas");
    botao.disabled = true;
    botao.textContent = "Buscando ofertas...";
    mensagem("Consultando encartes públicos já processados.");
    try {
        const resposta = await api.post("/ofertas/buscar", {
            produtos,
            mercado: porId("filtroMercado").value.trim() || null,
            categoria: porId("filtroCategoria").value.trim() || null,
            bairro: localizacaoAtual?.bairro || null,
            cidade: localizacaoAtual?.cidade || porId("localidadeCidade").value.trim() || null,
            latitude: coordenadasDaSessao?.latitude ?? null,
            longitude: coordenadasDaSessao?.longitude ?? null,
            raioKm: Number(porId("filtroRaio").value)
        });
        renderizarResultados(resposta);
        mensagem(resposta?.aviso || "Busca concluída.");
    } catch (erro) {
        mensagem(
            erro instanceof ApiError ? erro.message : "Não foi possível buscar ofertas agora.",
            true
        );
    } finally {
        botao.disabled = false;
        botao.textContent = "Buscar melhores ofertas";
    }
});

function renderizarResultados(resposta) {
    const grupos = Array.isArray(resposta?.produtos) ? resposta.produtos : [];
    porId("atualizacaoOfertas").textContent = new Date(
        resposta?.consultadaEm || Date.now()
    ).toLocaleString("pt-BR");
    porId("avisoOfertas").textContent = resposta?.aviso || "";
    porId("listaResultadosOfertas").innerHTML = grupos.map(grupo => {
        const ofertas = Array.isArray(grupo.ofertas) ? grupo.ofertas : [];
        return `
            <article class="produto-ofertas">
                <h3>${escapar(grupo.produtoProcurado)}</h3>
                ${ofertas.length ? ofertas.map(renderizarOferta).join("") : `
                    <p class="produto-sem-oferta">Nenhuma promoção vigente encontrada para este produto.</p>
                `}
            </article>
        `;
    }).join("") || `
        <article class="produto-ofertas">
            <p class="produto-sem-oferta">Nenhuma oferta encontrada com os filtros atuais.</p>
        </article>
    `;
    porId("resultadoOfertas").hidden = false;
    porId("resultadoOfertas").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderizarOferta(oferta) {
    const mercado = [oferta.mercado, oferta.unidade].filter(Boolean).join(" · ");
    const endereco = [
        oferta.endereco || "Endereço não cadastrado",
        oferta.bairro,
        oferta.cidade,
        oferta.estado
    ].filter(Boolean).join(" · ");
    const distancia = oferta.distanciaKm == null
        ? ""
        : `<span class="oferta-distancia">${Number(oferta.distanciaKm).toLocaleString("pt-BR")} km</span>`;
    const validade = oferta.validaAte
        ? `Válido até ${new Date(`${oferta.validaAte}T12:00:00`).toLocaleDateString("pt-BR")}`
        : "Consulte a validade da oferta";
    const base = oferta.precoPorUnidadeBase && oferta.unidadeBase
        ? `${moeda(oferta.precoPorUnidadeBase)}/${escapar(oferta.unidadeBase)}`
        : "";

    return `
        <div class="oferta-item">
            <div>
                <h4>${escapar(oferta.produto)}${oferta.marca ? ` · ${escapar(oferta.marca)}` : ""}</h4>
                <p class="oferta-endereco"><strong>${escapar(mercado)}</strong><br>${escapar(endereco)}</p>
                <p class="oferta-validade">${escapar(validade)} ${distancia}</p>
                ${oferta.condicaoEspecial ? `<span class="oferta-condicao">${escapar(oferta.condicaoEspecial)}</span>` : ""}
            </div>
            <div class="oferta-preco">
                <strong>${moeda(oferta.precoPromocional)}</strong>
                ${base ? `<span>${base}</span>` : ""}
            </div>
        </div>
    `;
}

porId("ajudaOfertas").addEventListener("click", () => {
    alert(
        "As ofertas vêm de fontes públicas processadas. Com sua autorização, uma posição aproximada é consultada no OpenStreetMap para identificar cidade e mercados próximos. Ela expira e pode ser apagada. © OpenStreetMap contributors."
    );
});

carregarLocalizacao();
