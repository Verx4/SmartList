const botaoTemaTopo = document.getElementById("btnTemaTopo");

if (botaoTemaTopo) {
    botaoTemaTopo.addEventListener("click", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();

        const controle = document.getElementById("controleTemaGlobal");
        const botaoGlobal = document.getElementById("botaoTemaGlobal");
        const menu = document.getElementById("menuTemaGlobal");

        if (!controle || !menu) {
            window.dispatchEvent(new CustomEvent("usuarioatualizado"));
            window.setTimeout(() => {
                document.getElementById("botaoTemaGlobal")?.click();
            }, 80);
            return;
        }

        const abrir = menu.hidden;
        menu.hidden = !abrir;
        controle.classList.toggle("aberto", abrir);
        botaoGlobal?.setAttribute("aria-expanded", String(abrir));
    }, true);
}

document.addEventListener("click", (evento) => {
    const controle = document.getElementById("controleTemaGlobal");
    const menu = document.getElementById("menuTemaGlobal");
    const topo = document.getElementById("btnTemaTopo");

    if (!controle || !menu || menu.hidden) return;
    if (controle.contains(evento.target) || topo?.contains(evento.target)) return;

    menu.hidden = true;
    controle.classList.remove("aberto");
    document.getElementById("botaoTemaGlobal")?.setAttribute("aria-expanded", "false");
});
