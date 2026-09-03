import { api } from "./api.js";
import { exigirAutenticacao, sair, usuarioAtual } from "./auth.js";
import { cpfValido, formatarCpf, somenteDigitosCpf } from "./cpf.js";

let assinaturaAtual;
const LIMITE_FOTO = 5 * 1024 * 1024;

function atualizarEstadoCpf(resposta = {}) {
    const campo = document.getElementById("perfilCpf"); const status = document.getElementById("perfilCpfStatus");
    if (campo) { campo.value = resposta.cpf || ""; campo.placeholder = "000.000.000-00"; campo.dataset.cadastrado = String(Boolean(resposta.cadastrado)); }
    if (status) status.textContent = resposta.cadastrado ? "CPF salvo e disponível para identificar seus pagamentos." : "Cadastre seu CPF para identificação do assinante e pagamentos pela Kiwify.";
}
function exibirMensagem(texto, tipo = "sucesso") {
    const area = document.getElementById("mensagemPerfil"); if (!area) return; area.textContent = texto;
    const classes = { erro:"mensagem-erro", aviso:"mensagem-aviso", sucesso:"mensagem-sucesso" };
    area.classList.remove("mensagem-sucesso","mensagem-erro","mensagem-aviso"); area.classList.add(classes[tipo] || classes.sucesso); area.hidden = false;
}
function nomeDoPlano(usuario, assinatura) {
    if (assinatura) return "Plano Premium — Pagante";
    if (usuario?.tipoAcesso === "CORTESIA") return "Plano Premium — Cortesia";
    if (usuario?.tipoAcesso === "PREMIUM") return assinatura === null ? "Plano Premium — Acesso manual" : "Plano Premium";
    return "Plano Free";
}
function aplicarFoto(usuario) {
    const avatar = document.getElementById("perfilAvatar"); const remover = document.getElementById("btnRemoverFoto"); if (!avatar) return;
    const foto = usuario?.fotoPerfil || "";
    avatar.classList.toggle("com-foto", Boolean(foto)); avatar.style.backgroundImage = foto ? `url("${foto}")` : "";
    avatar.textContent = foto ? "" : (usuario?.nome || "U").trim().charAt(0).toUpperCase();
    if (remover) remover.hidden = !foto;
}
function preencherPerfil(usuario, assinatura = assinaturaAtual) {
    const formulario = document.getElementById("formPerfil"); if (!formulario || !usuario) return;
    formulario.elements.nome.value = usuario.nome || ""; formulario.elements.email.value = usuario.email || ""; formulario.elements.telefone.value = usuario.telefone || ""; formulario.elements.cidade.value = usuario.cidade || ""; formulario.elements.estado.value = usuario.estado || "";
    formulario.elements.notificarPromocoes.checked = Boolean(usuario.notificarPromocoes); formulario.elements.notificarPrecos.checked = Boolean(usuario.notificarPrecos);
    document.getElementById("perfilNomeExibicao").textContent = usuario.nome || "Usuário"; document.getElementById("perfilEmailExibicao").textContent = usuario.email || ""; document.getElementById("perfilPlano").textContent = nomeDoPlano(usuario, assinatura); aplicarFoto(usuario);
}
function salvarUsuarioLocal(usuario) { localStorage.setItem("usuarioAtual", JSON.stringify(usuario)); window.dispatchEvent(new CustomEvent("usuarioatualizado", { detail:{ usuario } })); }

exigirAutenticacao();
const formulario = document.getElementById("formPerfil"); preencherPerfil(usuarioAtual());

document.getElementById("btnEscolherFoto")?.addEventListener("click", () => document.getElementById("perfilFoto")?.click());
document.getElementById("perfilFoto")?.addEventListener("change", async evento => {
    const arquivo = evento.target.files?.[0]; if (!arquivo) return;
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) { exibirMensagem("Escolha uma imagem JPG, PNG ou WebP.", "erro"); evento.target.value = ""; return; }
    if (arquivo.size > LIMITE_FOTO) { exibirMensagem("A foto pode ter no máximo 5 MB.", "erro"); evento.target.value = ""; return; }
    const botao = document.getElementById("btnEscolherFoto"); if (botao) { botao.disabled = true; botao.textContent = "Enviando foto..."; }
    try {
        const dados = new FormData(); dados.append("foto", arquivo);
        const usuario = await api.put("/usuarios/me/foto", dados); salvarUsuarioLocal(usuario); preencherPerfil(usuario, assinaturaAtual); exibirMensagem("Foto de perfil atualizada com sucesso.");
    } catch (erro) { exibirMensagem(erro.message || "Não foi possível enviar a foto.", "erro"); }
    finally { evento.target.value = ""; if (botao) { botao.disabled = false; botao.textContent = "📷 Alterar foto"; } }
});
document.getElementById("btnRemoverFoto")?.addEventListener("click", async () => {
    try { const usuario = await api.delete("/usuarios/me/foto"); salvarUsuarioLocal(usuario); preencherPerfil(usuario, assinaturaAtual); document.getElementById("btnEscolherFoto").textContent = "📷 Adicionar foto"; exibirMensagem("Foto removida."); }
    catch (erro) { exibirMensagem(erro.message || "Não foi possível remover a foto.", "erro"); }
});

if (formulario) {
    const campoCpf = formulario.elements.cpf;
    campoCpf?.addEventListener("input", () => { campoCpf.value = formatarCpf(campoCpf.value); campoCpf.setCustomValidity(""); });
    api.get("/assinaturas/atual").then(async assinatura => {
        const [usuario, cpf] = await Promise.all([api.get("/usuarios/me"), api.get("/usuarios/me/cpf")]); assinaturaAtual = assinatura; salvarUsuarioLocal(usuario); preencherPerfil(usuario, assinatura); atualizarEstadoCpf(cpf);
        const botaoFoto = document.getElementById("btnEscolherFoto"); if (botaoFoto && usuario.fotoPerfil) botaoFoto.textContent = "📷 Alterar foto";
    }).catch(erro => exibirMensagem(erro.message, "erro"));
    formulario.addEventListener("submit", async evento => {
        evento.preventDefault(); const cpfInformado = somenteDigitosCpf(formulario.elements.cpf?.value);
        if (!cpfInformado && formulario.elements.cpf?.dataset.cadastrado === "true") { formulario.elements.cpf.setCustomValidity("Informe o CPF salvo ou digite a correção."); formulario.elements.cpf.reportValidity(); exibirMensagem("O CPF salvo não pode ficar vazio. Digite o número para corrigir.", "erro"); return; }
        if (cpfInformado && !cpfValido(cpfInformado)) { formulario.elements.cpf.setCustomValidity("Informe um CPF válido."); formulario.elements.cpf.reportValidity(); exibirMensagem("Informe um CPF válido.", "erro"); return; }
        formulario.elements.cpf?.setCustomValidity(""); const botao = formulario.querySelector('button[type="submit"]'); const textoOriginal = botao?.textContent; if (botao) { botao.disabled = true; botao.textContent = "Salvando..."; }
        try {
            const usuario = await api.put("/usuarios/me", { nome:formulario.elements.nome.value, telefone:formulario.elements.telefone.value, cidade:formulario.elements.cidade.value, estado:formulario.elements.estado.value, notificarPromocoes:formulario.elements.notificarPromocoes.checked, notificarPrecos:formulario.elements.notificarPrecos.checked });
            if (cpfInformado) atualizarEstadoCpf(await api.put("/usuarios/me/cpf", { cpf:cpfInformado })); salvarUsuarioLocal(usuario); preencherPerfil(usuario, assinaturaAtual); exibirMensagem("Dados atualizados com sucesso.");
        } catch (erro) { exibirMensagem(erro.message, "erro"); } finally { if (botao) { botao.disabled = false; botao.textContent = textoOriginal; } }
    });
}
document.getElementById("btnSair")?.addEventListener("click", sair);
document.getElementById("btnExcluirConta")?.addEventListener("click", async () => {
    if (!window.confirm("Deseja excluir definitivamente sua conta e apagar seus dados pessoais? Esta ação não pode ser desfeita.")) return;
    const botao = document.getElementById("btnExcluirConta"); const textoOriginal = botao?.textContent; if (botao) { botao.disabled = true; botao.textContent = "Excluindo conta..."; }
    const controlador = new AbortController(); const limite = window.setTimeout(() => controlador.abort(), 30000);
    try { const resposta = await api.post("/usuarios/me/solicitacoes/exclusao", {}, { signal:controlador.signal }); const mensagem = resposta?.mensagem || "Seus dados foram apagados do sistema."; ["usuarioAtual","usuarioLogado","accessToken","token"].forEach(k => localStorage.removeItem(k)); sessionStorage.clear(); window.alert(mensagem); window.location.replace("./login.html?conta=excluida"); }
    catch (erro) { exibirMensagem(erro?.name === "AbortError" ? "A exclusão demorou mais que o esperado. Tente novamente." : erro.message || "Não foi possível excluir a conta.", "erro"); if (botao) { botao.disabled = false; botao.textContent = textoOriginal || "Excluir minha conta"; } }
    finally { window.clearTimeout(limite); }
});
