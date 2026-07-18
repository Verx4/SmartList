const appRoot = new URL("../", import.meta.url);
const serviceWorkerUrl = new URL("service-worker.js", appRoot);
const manifestUrl = new URL("manifest.webmanifest", appRoot);
const iconUrl = new URL("assets/icons/icon-192.png", appRoot);

let installEvent = null;
let installButton = null;
let reloadingForUpdate = false;

garantirMetadadosPwa();
configurarInstalacao();
registrarServiceWorker();

function garantirMetadadosPwa() {
    if (!document.querySelector('link[rel="manifest"]')) {
        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = manifestUrl.href;
        document.head.append(manifest);
    }

    if (!document.querySelector('meta[name="theme-color"]')) {
        const themeColor = document.createElement("meta");
        themeColor.name = "theme-color";
        themeColor.content = "#0b1220";
        document.head.append(themeColor);
    }

    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        appleIcon.href = iconUrl.href;
        document.head.append(appleIcon);
    }
}

function configurarInstalacao() {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        installEvent = event;
        exibirBotaoInstalar();
    });

    window.addEventListener("appinstalled", () => {
        installEvent = null;
        installButton?.remove();
        installButton = null;
    });
}

function exibirBotaoInstalar() {
    if (installButton || !installEvent) {
        return;
    }

    installButton = document.createElement("button");
    installButton.type = "button";
    installButton.className = "pwa-install-button";
    installButton.textContent = "Instalar aplicativo";
    installButton.setAttribute("aria-label", "Instalar Smart List neste dispositivo");

    installButton.addEventListener("click", async () => {
        if (!installEvent) {
            return;
        }

        installButton.disabled = true;
        await installEvent.prompt();
        const escolha = await installEvent.userChoice;

        if (escolha.outcome === "accepted") {
            installEvent = null;
            installButton.remove();
            installButton = null;
            return;
        }

        installButton.disabled = false;
    });

    document.body.append(installButton);
}

function registrarServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
        return;
    }

    window.addEventListener("load", async () => {
        try {
            const registration = await navigator.serviceWorker.register(
                serviceWorkerUrl,
                { scope: appRoot.pathname }
            );

            ativarAtualizacao(registration);
            registration.addEventListener("updatefound", () => ativarAtualizacao(registration));

            window.setInterval(() => registration.update(), 60 * 60 * 1000);
        } catch (erro) {
            console.warn("Não foi possível ativar o modo aplicativo.", erro);
        }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadingForUpdate) {
            return;
        }

        reloadingForUpdate = true;
        window.location.reload();
    });
}

function ativarAtualizacao(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    const worker = registration.installing;

    if (!worker) {
        return;
    }

    worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
        }
    });
}
