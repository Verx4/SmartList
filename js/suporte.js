import { api } from "./api.js";

function mensagem(texto, tipo) {
    const area =
        document.getElementById(
            "mensagens"
        );

    if (!area) {
        alert(texto);
        return;
    }

    area.textContent = texto;
    area.dataset.tipo = tipo;
    area.hidden = false;
}

document
    .getElementById("formSuporte")
    ?.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            const dados =
                Object.fromEntries(
                    new FormData(
                        evento.currentTarget
                    )
                );

            try {
                await api.post(
                    "/suporte/chamados",
                    dados
                );

                evento.currentTarget.reset();

                mensagem(
                    "Chamado enviado com sucesso.",
                    "sucesso"
                );
            } catch (erro) {
                mensagem(
                    erro.message,
                    "erro"
                );
            }
        }
    );