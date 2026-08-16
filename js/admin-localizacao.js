import { api, ApiError } from "./api.js";

const porId = id => document.getElementById(id);
const escapar = valor => String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function carregar() {
    const botao = porId("atualizarLocalizacoes");
    botao.disabled = true;
    try {
        const resposta = await api.get("/admin/localizacoes/resumo");
        const localidades = Array.isArray(resposta.localidades) ? resposta.localidades : [];
        const redes = Array.isArray(resposta.redesConfirmadas) ? resposta.redesConfirmadas : [];
        porId("totalConsentimentos").textContent = resposta.usuariosComLocalidade || 0;
        porId("atualizados24h").textContent = resposta.novosCadastrosNasUltimas24Horas || 0;
        porId("totalLocalidades").textContent = localidades.length;
        porId("totalRedes").textContent = redes.length;
        porId("avisoPrivacidade").textContent = resposta.privacidade;
        porId("tabelaLocalidades").innerHTML = localidades.map(item => `
            <tr><td>${escapar(item.estado)}</td><td>${escapar(item.cidade)}</td><td>${item.usuarios}</td></tr>
        `).join("") || '<tr><td colspan="3" class="estado-vazio">Nenhum cadastro com estado e cidade.</td></tr>';
        porId("tabelaRedesConfirmadas").innerHTML = redes.map(item => `
            <tr><td>${escapar(item.rede)}</td><td>${item.confirmacoes}</td></tr>
        `).join("") || '<tr><td colspan="2" class="estado-vazio">Nenhuma unidade confirmada.</td></tr>';
    } catch (erro) {
        const texto = erro instanceof ApiError ? erro.message : "Não foi possível carregar.";
        porId("tabelaLocalidades").innerHTML = `<tr><td colspan="4">${escapar(texto)}</td></tr>`;
    } finally {
        botao.disabled = false;
    }
}

porId("atualizarLocalizacoes").addEventListener("click", carregar);
carregar();
