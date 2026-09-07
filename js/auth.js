import { api } from "./api.js";

const CHAVE_ONBOARDING = "smartlist_onboarding_completed";

export function usuarioAtual() {
    try {
        return (
            JSON.parse(
                localStorage.getItem("usuarioAtual")
            ) || null
        );
    } catch {
        return null;
    }
}

function salvarSessao(
    dados,
    manterConectado = false
) {
    localStorage.setItem(CHAVE_ONBOARDING, "true");
    [localStorage, sessionStorage]
        .forEach(armazenamento => {
            armazenamento.removeItem("token");
            armazenamento.removeItem("accessToken");
            armazenamento.removeItem("refreshToken");
        });

    const armazenamento =
        manterConectado
            ? localStorage
            : sessionStorage;

    armazenamento.setItem(
        "accessToken",
        dados.accessToken
    );

    if (dados.refreshToken) {
        armazenamento.setItem(
            "refreshToken",
            dados.refreshToken
        );
    }

    localStorage.setItem(
        "usuarioAtual",
        JSON.stringify(dados.usuario)
    );
}

export async function entrar(
    email,
    senha,
    manterConectado = false
) {
    const dados = await api.post(
        "/auth/login",
        {
            email,
            senha
        }
    );

    salvarSessao(
        dados,
        manterConectado
    );

    return dados.usuario;
}

export function cadastrar(dados) {
    return api.post(
        "/auth/cadastro",
        dados
    );
}

export function solicitarRecuperacao(email) {
    return api.post(
        "/auth/recuperar-senha",
        { email }
    );
}

export function estaAutenticado() {
    return Boolean(
        sessionStorage.getItem("accessToken")
        || localStorage.getItem("accessToken")
    );
}

export function sair() {
    [localStorage, sessionStorage]
        .forEach(armazenamento => {
            armazenamento.removeItem("accessToken");
            armazenamento.removeItem("refreshToken");
        });

    localStorage.removeItem("usuarioAtual");

    location.assign("login.html");
}

export function exigirAutenticacao() {
    if (!estaAutenticado()) {
        location.assign("login.html");
    }
}
