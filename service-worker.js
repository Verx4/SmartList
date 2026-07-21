const CACHE_PREFIX = "smart-list-pwa";
const STATIC_CACHE = `${CACHE_PREFIX}-static-v8`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-v8`;

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./login.html",
    "./cadastro.html",
    "./inicio.html",
    "./comparacao.html",
    "./historico.html",
    "./offline.html",
    "./manifest.webmanifest",
    "./css/global.css",
    "./css/layout.css",
    "./css/cards.css",
    "./css/buttons.css",
    "./css/auth.css",
    "./css/responsive.css",
    "./css/temas.css",
    "./css/inicio.css",
    "./css/comparacao-lista-v2.css",
    "./css/comparacao-embalagens-padrao.css",
    "./css/historico-v2.css",
    "./css/scanner-nota.css",
    "./css/listas-salvas.css",
    "./css/pwa.css",
    "./js/pwa.js",
    "./js/tema.js",
    "./js/inicio.js",
    "./js/comparacao.js",
    "./js/historico-page.js",
    "./js/scanner-nota.js",
    "./js/listas-salvas-ui.js",
    "./assets/logo/logo.png",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-maskable-192.png",
    "./assets/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith(CACHE_PREFIX)
                        && key !== STATIC_CACHE
                        && key !== PAGE_CACHE)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);
    const scope = new URL(self.registration.scope);

    // Nunca armazena chamadas de API, autenticação ou recursos de outra origem.
    if (url.origin !== self.location.origin
        || !url.pathname.startsWith(scope.pathname)
        || url.pathname.includes("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(responderNavegacao(request));
        return;
    }

    const destinosEstaticos = new Set([
        "style",
        "script",
        "image",
        "font",
        "manifest"
    ]);

    if (destinosEstaticos.has(request.destination)) {
        const precisaEstarAtualizado = ["script", "style"].includes(
            request.destination
        );

        event.respondWith(
            precisaEstarAtualizado
                ? responderRecursoAtualizavel(request)
                : responderRecursoEstatico(request)
        );
    }
});

async function responderNavegacao(request) {
    try {
        const response = await fetch(request);

        if (response.ok && response.type === "basic") {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(request, response.clone());
        }

        return response;
    } catch (_erro) {
        return (await caches.match(request, { ignoreSearch: true }))
            || (await caches.match("./offline.html"));
    }
}

async function responderRecursoEstatico(request) {
    const armazenado = await caches.match(request, { ignoreSearch: true });

    if (armazenado) {
        return armazenado;
    }

    const response = await fetch(request);

    if (response.ok && response.type === "basic") {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
    }

    return response;
}

async function responderRecursoAtualizavel(request) {
    try {
        const response = await fetch(request);

        if (response.ok && response.type === "basic") {
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, response.clone());
        }

        return response;
    } catch (_erro) {
        return (await caches.match(request, { ignoreSearch: true }))
            || Response.error();
    }
}

