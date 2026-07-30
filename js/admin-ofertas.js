import { api, ApiError } from "./api.js";

const porId = id => document.getElementById(id);
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const numeroOuNull = valor => valor === "" ? null : Number(valor);

function mensagem(texto, erro = false) {
    const elemento = porId("mensagemAdminOfertas");
    elemento.textContent = texto;
    elemento.style.color = erro ? "#fca5a5" : "#86efac";
}

async function carregar() {
    try {
        const [unidades, fontes] = await Promise.all([
            api.get("/admin/ofertas/unidades"),
            api.get("/admin/ofertas/fontes")
        ]);
        porId("fonteUnidade").innerHTML = unidades.map(unidade => `
            <option value="${escapar(unidade.id)}">${escapar(unidade.rede)} · ${escapar(unidade.nome)} · ${escapar(unidade.cidade)}/${escapar(unidade.estado)}</option>
        `).join("") || '<option value="">Cadastre uma unidade primeiro</option>';
        porId("tabelaFontesOferta").innerHTML = fontes.map(fonte => `
            <tr>
                <td><strong>${escapar(fonte.rede)}</strong><br>${escapar(fonte.unidade)}</td>
                <td><a href="${escapar(fonte.url)}" target="_blank" rel="noopener noreferrer">${escapar(fonte.nome)}</a></td>
                <td><span class="status ${classeStatus(fonte.status)}">${escapar(fonte.status)}</span></td>
                <td>${fonte.ofertasExtraidas || 0}</td>
                <td>${escapar(fonte.mensagemStatus || "Aguardando verificação")}</td>
                <td><button class="btn btn-primary processar-fonte" type="button" data-id="${escapar(fonte.id)}">Processar</button></td>
            </tr>
        `).join("") || '<tr><td colspan="6" class="estado-vazio">Nenhuma fonte cadastrada.</td></tr>';
    } catch (erro) {
        mensagem(erro instanceof ApiError ? erro.message : "Não foi possível carregar.", true);
    }
}

function classeStatus(status) {
    if (status === "PROCESSADA" || status === "SEM_ALTERACAO") return "status-ok";
    if (status === "ERRO" || status === "INTEGRACAO_OFICIAL_NECESSARIA") return "status-erro";
    return "status-alerta";
}

porId("formUnidadeOferta").addEventListener("submit", async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    try {
        await api.post("/admin/ofertas/unidades", {
            rede: dados.get("rede"),
            nome: dados.get("nome"),
            endereco: dados.get("endereco"),
            bairro: dados.get("bairro") || null,
            cidade: dados.get("cidade"),
            estado: dados.get("estado"),
            latitude: numeroOuNull(dados.get("latitude")),
            longitude: numeroOuNull(dados.get("longitude")),
            ativa: dados.get("ativa") === "on"
        });
        evento.currentTarget.reset();
        evento.currentTarget.elements.ativa.checked = true;
        mensagem("Unidade salva.");
        await carregar();
    } catch (erro) {
        mensagem(erro instanceof ApiError ? erro.message : "Não foi possível salvar.", true);
    }
});

porId("formFonteOferta").addEventListener("submit", async evento => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    try {
        await api.post("/admin/ofertas/fontes", {
            unidadeId: dados.get("unidadeId"),
            nome: dados.get("nome"),
            url: dados.get("url"),
            tipo: dados.get("tipo"),
            ativa: dados.get("ativa") === "on"
        });
        evento.currentTarget.reset();
        evento.currentTarget.elements.ativa.checked = true;
        mensagem("Fonte pública salva.");
        await carregar();
    } catch (erro) {
        mensagem(erro instanceof ApiError ? erro.message : "Não foi possível salvar.", true);
    }
});

porId("tabelaFontesOferta").addEventListener("click", async evento => {
    const botao = evento.target.closest(".processar-fonte");
    if (!botao) return;
    botao.disabled = true;
    botao.textContent = "Processando...";
    try {
        const resposta = await api.post(`/admin/ofertas/fontes/${botao.dataset.id}/processar`, {});
        mensagem(resposta.mensagemStatus || "Processamento concluído.");
        await carregar();
    } catch (erro) {
        mensagem(erro instanceof ApiError ? erro.message : "Falha ao processar.", true);
        botao.disabled = false;
        botao.textContent = "Processar";
    }
});

carregar();
