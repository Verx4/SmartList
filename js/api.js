const AMBIENTE_LOCAL = ["localhost", "127.0.0.1"].includes(
    window.location.hostname
);

const URL_PADRAO_API = AMBIENTE_LOCAL
    ? "http://localhost:8080/api"
    : "https://smart-list-backend-production.up.railway.app/api";

export const API_BASE_URL = (
    AMBIENTE_LOCAL
        ? localStorage.getItem("apiBaseUrl") || URL_PADRAO_API
        : URL_PADRAO_API
).replace(/\/+$/, "");


export class ApiError extends Error {

    constructor(message, status = 0, dados = null) {

        super(message);

        this.name = "ApiError";
        this.status = status;
        this.dados = dados;

    }

}


function obterToken() {

    return (
        sessionStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        ""
    );

}


function montarUrl(caminho) {

    if (/^https?:\/\//i.test(caminho)) {

        return caminho;

    }

    return `${API_BASE_URL}/${String(caminho).replace(/^\/+/, "")}`;

}


async function lerResposta(response) {

    if (response.status === 204) {

        return null;

    }

    const tipo = response.headers.get("content-type") || "";

    if (tipo.includes("application/json")) {

        return response.json();

    }

    const texto = await response.text();

    return texto || null;

}


export async function apiRequest(
    caminho,
    {
        method = "GET",
        body,
        headers = {},
        auth = true,
        signal
    } = {}
) {

    const controlador = new AbortController();
    let expirou = false;
    const limiteEspera = window.setTimeout(() => {
        expirou = true;
        controlador.abort();
    }, 90000);

    if (signal) {
        if (signal.aborted) {
            controlador.abort();
        } else {
            signal.addEventListener(
                "abort",
                () => controlador.abort(),
                { once: true }
            );
        }
    }

    const cabecalhos = {
        Accept: "application/json",
        ...headers
    };

    if (body !== undefined && !(body instanceof FormData)) {

        cabecalhos["Content-Type"] = "application/json";

    }

    if (auth) {

        const token = obterToken();

        if (token) {

            cabecalhos.Authorization = `Bearer ${token}`;

        }

    }

    let response;

    try {

        response = await fetch(montarUrl(caminho), {

            method,
            headers: cabecalhos,
            body:
                body === undefined
                    ? undefined
                    : body instanceof FormData
                        ? body
                        : JSON.stringify(body),
            signal: controlador.signal

        });

    } catch (erro) {

        if (expirou) {
            throw new ApiError(
                "O servidor demorou mais de 90 segundos para responder. Aguarde um momento e tente novamente.",
                408,
                erro
            );
        }

        throw new ApiError(
            "Não foi possível conectar ao servidor agora. Aguarde alguns segundos e tente novamente.",
            0,
            erro
        );

    } finally {
        window.clearTimeout(limiteEspera);
    }

    const dados = await lerResposta(response);

    if (!response.ok) {

        const mensagem =
            dados?.message ||
            dados?.mensagem ||
            dados?.error ||
            `Erro ${response.status} ao acessar o servidor.`;

        if (response.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("accessToken");
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("accessToken");

        }

        throw new ApiError(mensagem, response.status, dados);

    }

    return dados;

}


export const api = {

    get(caminho, opcoes = {}) {

        return apiRequest(caminho, {
            ...opcoes,
            method: "GET"
        });

    },

    post(caminho, body, opcoes = {}) {

        return apiRequest(caminho, {
            ...opcoes,
            method: "POST",
            body
        });

    },

    put(caminho, body, opcoes = {}) {

        return apiRequest(caminho, {
            ...opcoes,
            method: "PUT",
            body
        });

    },

    patch(caminho, body, opcoes = {}) {

        return apiRequest(caminho, {
            ...opcoes,
            method: "PATCH",
            body
        });

    },

    delete(caminho, opcoes = {}) {

        return apiRequest(caminho, {
            ...opcoes,
            method: "DELETE"
        });

    }

};


export async function verificarApi() {

    try {

        await api.get("/health", {
            auth: false
        });

        return true;

    } catch {

        return false;

    }

}
