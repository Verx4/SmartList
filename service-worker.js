const CACHE_PREFIX = "smart-list-pwa";
const STATIC_CACHE = `${CACHE_PREFIX}-static-v90`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-v90`;

const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./login.html",
    "./onboarding.html",
    "./cadastro.html",
    "./recuperar-senha.html",
    "./inicio.html",
    "./menu.html",
    "./configuracoes.html",
    "./alterar-senha.html",
    "./modo-de-usar.html",
    "./comparar-embalagens.html",
    "./comparacao.html",
    "./sugestoes.html",
    "./suporte.html",
    "./historico.html",
    "./minha-economia.html",
    "./assinatura.html",
    "./checkout.html",
    "./offline.html",
    "./manifest.webmanifest",
    "./css/global.css",
    "./css/animations.css",
    "./css/login-intro.css",
    "./css/onboarding.css",
    "./css/layout.css",
    "./css/cards.css",
    "./css/buttons.css",
    "./css/auth.css",
    "./css/auth-theme-fix.css",
    "./css/responsive.css",
    "./css/temas.css",
    "./css/mobile-app.css",
    "./css/configuracoes.css",
    "./css/recuperar-senha.css",
    "./css/modo-de-usar.css",
    "./css/comparar-embalagens.css",
    "./css/inicio.css",
    "./css/historico-v2.css",
    "./css/historico-itens.css",
    "./css/minha-economia.css",
    "./css/historico-topo.css",
    "./css/checkout.css",
    "./css/listas-salvas.css",
    "./css/produtos-multivalores.css",
    "./css/lista-rapida.css",
    "./css/pwa.css",
    "./js/pwa.js",
    "./js/animations.js",
    "./js/login-intro.js",
    "./js/onboarding.js",
    "./js/auth-theme.js",
    "./js/categorias.js",
    "./js/medidas-produtos.js",
    "./js/tema.js",
    "./js/mobile-nav.js",
    "./js/acesso-premium.js",
    "./js/comparar-embalagens.js",
    "./js/inicio.js",
    "./js/menu.js",
    "./js/alterar-senha.js",
    "./js/recuperar-senha.js",
    "./js/historico-page.js",
    "./js/historico-calculos.js",
    "./js/minha-economia.js",
    "./js/minha-economia-calculos.js",
    "./js/comparacao-compras-calculos.js",
    "./js/assinatura.js",
    "./js/listas-salvas-ui.js",
    "./js/lista-rapida.js",
    "./js/listas-sync.js",
    "./js/admin-return.js",
    "./assets/logo/smart-list-app.png",


// Atualiza os arquivos da tela inicial com os cards Premium.
    "./assets/logo/logo.png",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-maskable-192.png",
    "./assets/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(ativarNovaVersao());
});

async function ativarNovaVersao() {
    const keys = await caches.keys();
    const cachesAntigos = keys.filter((key) =>
        key.startsWith(CACHE_PREFIX)
        && key !== STATIC_CACHE
        && key !== PAGE_CACHE
    );

    await Promise.all(cachesAntigos.map((key) => caches.delete(key)));
    await self.clients.claim();

    if (cachesAntigos.length === 0) {
        return;
    }

    const clientes = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
    });

    await Promise.all(clientes.map((cliente) => {
        try {
            const url = new URL(cliente.url);

            if (url.origin === self.location.origin) {
                return cliente.navigate(cliente.url);
            }
        } catch (_erro) {
            // Ignora clientes sem uma URL navegável.
        }

        return Promise.resolve();
    }));
}

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

    if (url.origin !== self.location.origin
        || !url.pathname.startsWith(scope.pathname)
        || url.pathname.includes("/api/")) {
        return;
    }

    if (request.mode === "navigate" && url.pathname.includes("/admin/")) {
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
