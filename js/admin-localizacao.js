import { api, ApiError } from "./api.js";

const porId = id => document.getElementById(id);
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

function renderizarGraficoEstados(estados) {
    const container = porId("graficoUsuariosEstado");
    if (!container) {
        return;
    }

    if (!estados.length) {
        container.innerHTML = '<p class="estado-vazio">Nenhum cadastro com estado informado.</p>';
        return;
    }

    const maiorQuantidade = Math.max(...estados.map(item => Number(item.usuarios) || 0), 1);
    container.innerHTML = estados.map(item => {
        const quantidade = Number(item.usuarios) || 0;
        const percentual = Math.max(4, Math.round((quantidade / maiorQuantidade) * 100));
        return `
            <div class="admin-grafico-linha" role="listitem" aria-label="${escapar(item.estado)}: ${quantidade} usuários">
                <strong>${escapar(item.estado)}</strong>
                <div class="admin-grafico-trilho" aria-hidden="true">
                    <span style="width: ${percentual}%"></span>
                </div>
                <span>${quantidade}</span>
            </div>
        `;
    }).join("");
}

async function carregar() {
    const botao = porId("atualizarLocalizacoes");
    botao.disabled = true;
    try {
        const resposta = await api.get("/admin/localizacoes/resumo");
        const localidades = Array.isArray(resposta.localidades) ? resposta.localidades : [];
        const estados = Array.isArray(resposta.estados) ? resposta.estados : [];
        const redes = Array.isArray(resposta.redesConfirmadas) ? resposta.redesConfirmadas : [];
        porId("totalConsentimentos").textContent = resposta.usuariosComLocalidade || 0;
        porId("atualizados24h").textContent = resposta.novosCadastrosNasUltimas24Horas || 0;
        porId("totalLocalidades").textContent = localidades.length;
        porId("totalRedes").textContent = redes.length;
        porId("avisoPrivacidade").textContent = resposta.privacidade;
        renderizarGraficoEstados(estados);
        porId("tabelaLocalidades").innerHTML = localidades.map(item => `
            <tr><td>${escapar(item.estado)}</td><td>${escapar(item.cidade)}</td><td>${item.usuarios}</td></tr>
        `).join("") || '<tr><td colspan="3" class="estado-vazio">Nenhum cadastro com estado e cidade.</td></tr>';
        porId("tabelaRedesConfirmadas").innerHTML = redes.map(item => `
            <tr><td>${escapar(item.rede)}</td><td>${item.confirmacoes}</td></tr>
        `).join("") || '<tr><td colspan="2" class="estado-vazio">Nenhuma unidade confirmada.</td></tr>';
    } catch (erro) {
        const texto = erro instanceof ApiError ? erro.message : "Não foi possível carregar.";
        porId("tabelaLocalidades").innerHTML = `<tr><td colspan="4">${escapar(texto)}</td></tr>`;
        porId("graficoUsuariosEstado").innerHTML = `<p class="estado-vazio">${escapar(texto)}</p>`;
    } finally {
        botao.disabled = false;
    }
}

porId("atualizarLocalizacoes").addEventListener("click", carregar);
carregar();
