import { api } from "./api.js";
import { usuarioAtual } from "./auth.js";
import { baixarJSON } from "./utils.js";

function mensagem(
    texto,
    tipo = "sucesso"
) {
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

const usuario =
    usuarioAtual();

const formulario =
    document.getElementById(
        "formPerfil"
    );

if (formulario && usuario) {
    formulario.elements.nome.value =
        usuario.nome || "";

    formulario.elements.email.value =
        usuario.email || "";

    formulario.elements.cidade.value =
        usuario.cidade || "";
}

formulario?.addEventListener(
    "submit",
    async evento => {
        evento.preventDefault();

        try {
            const atualizado =
                await api.put(
                    "/usuarios/me",

                    Object.fromEntries(
                        new FormData(
                            evento.currentTarget
                        )
                    )
                );

            localStorage.setItem(
                "usuarioAtual",
                JSON.stringify(atualizado)
            );

            mensagem(
                "Dados atualizados."
            );
        } catch (erro) {
            mensagem(
                erro.message,
                "erro"
            );
        }
    }
);

document
    .getElementById(
        "formNotificacoes"
    )
    ?.addEventListener(
        "submit",
        async evento => {
            evento.preventDefault();

            try {
                await api.put(
                    "/usuarios/me/notificacoes",

                    Object.fromEntries(
                        new FormData(
                            evento.currentTarget
                        )
                    )
                );

                mensagem(
                    "Preferências salvas."
                );
            } catch (erro) {
                mensagem(
                    erro.message,
                    "erro"
                );
            }
        }
    );

document
    .getElementById(
        "btnExportarDados"
    )
    ?.addEventListener(
        "click",
        async () => {
            try {
                const dados =
                    await api.get(
                        "/usuarios/me/exportacao"
                    );

                baixarJSON(
                    dados,
                    "meus-dados.json"
                );
            } catch (erro) {
                mensagem(
                    erro.message,
                    "erro"
                );
            }
        }
    );

document
    .getElementById(
        "btnExcluirConta"
    )
    ?.addEventListener(
        "click",
        async () => {
            if (
                !confirm(
                    "Deseja solicitar a exclusão da conta?"
                )
            ) {
                return;
            }

            try {
                await api.post(
                    "/usuarios/me/exclusao",
                    {}
                );

                mensagem(
                    "Solicitação de exclusão enviada."
                );
            } catch (erro) {
                mensagem(
                    erro.message,
                    "erro"
                );
            }
        }
    );