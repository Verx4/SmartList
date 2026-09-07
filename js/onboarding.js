const CHAVE_ONBOARDING = "smartlist_onboarding_completed";
const slides = [...document.querySelectorAll(".onboarding-slide")];
const indicadores = [...document.querySelectorAll("#indicadoresOnboarding button")];
const botaoVoltar = document.getElementById("voltarOnboarding");
const botaoAvancar = document.getElementById("avancarOnboarding");
const botaoPular = document.getElementById("pularOnboarding");
const areaSlides = document.getElementById("onboardingSlides");

let indiceAtual = 0;
let inicioToqueX = null;
let inicioToqueY = null;

function concluirOnboarding() {
    try {
        localStorage.setItem(CHAVE_ONBOARDING, "true");
    } catch (_erro) {
        // A navegação continua mesmo quando o armazenamento está indisponível.
    }
    location.replace("./login.html");
}

function exibirSlide(novoIndice) {
    if (novoIndice < 0 || novoIndice >= slides.length || novoIndice === indiceAtual) return;

    const anterior = indiceAtual;
    indiceAtual = novoIndice;

    slides.forEach((slide, indice) => {
        const ativo = indice === indiceAtual;
        slide.classList.toggle("ativo", ativo);
        slide.classList.toggle("saindo-esquerda", indice === anterior && novoIndice > anterior);
        slide.setAttribute("aria-hidden", String(!ativo));
    });

    indicadores.forEach((indicador, indice) => {
        const ativo = indice === indiceAtual;
        indicador.classList.toggle("ativo", ativo);
        if (ativo) indicador.setAttribute("aria-current", "step");
        else indicador.removeAttribute("aria-current");
    });

    botaoVoltar.hidden = indiceAtual === 0;
    botaoAvancar.textContent = indiceAtual === 0
        ? "Começar"
        : indiceAtual === slides.length - 1
            ? "Começar agora"
            : "Próximo";
}

botaoAvancar.addEventListener("click", () => {
    if (indiceAtual === slides.length - 1) concluirOnboarding();
    else exibirSlide(indiceAtual + 1);
});

botaoVoltar.addEventListener("click", () => exibirSlide(indiceAtual - 1));
botaoPular.addEventListener("click", concluirOnboarding);
indicadores.forEach((indicador, indice) => {
    indicador.addEventListener("click", () => exibirSlide(indice));
});

areaSlides.addEventListener("touchstart", evento => {
    const toque = evento.changedTouches[0];
    inicioToqueX = toque.clientX;
    inicioToqueY = toque.clientY;
}, { passive: true });

areaSlides.addEventListener("touchend", evento => {
    if (inicioToqueX === null || inicioToqueY === null) return;
    const toque = evento.changedTouches[0];
    const deltaX = toque.clientX - inicioToqueX;
    const deltaY = toque.clientY - inicioToqueY;
    inicioToqueX = null;
    inicioToqueY = null;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (deltaX < 0 && indiceAtual < slides.length - 1) exibirSlide(indiceAtual + 1);
    if (deltaX > 0 && indiceAtual > 0) exibirSlide(indiceAtual - 1);
}, { passive: true });

document.addEventListener("keydown", evento => {
    if (evento.key === "ArrowRight") botaoAvancar.click();
    if (evento.key === "ArrowLeft" && indiceAtual > 0) botaoVoltar.click();
    if (evento.key === "Escape") concluirOnboarding();
});
