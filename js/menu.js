import { api } from "./api.js";

const CHAVES_DADOS_COMPRAS = [
    "produtos",
    "historicoCompras",
    "ultimaCompra",
    "economiaAcumulada",
    "favoritos",
    "preferencias",
    "orcamentoCompra",
    "mercadoAtual",
    "mercadosFrequentes",
    "mercadosRecentes",
    "sugestoesLocais",
    "listasSalvas",
    "listaAtualId",
    "coletasPrecosPendentes"
];

function limparDadosLocaisDeCompras() {
    CHAVES_DADOS_COMPRAS.forEach(chave => {
        localStorage.removeItem(chave);
    });
}

const botao = document.getElementById("btnLimparTodosDados");

botao?.addEventListener("click", async () => {
    const confirmar = window.confirm(
        "ATENÇÃO!\n\n" +
        "Esta ação apagará permanentemente sua lista atual e todo o histórico de compras da sua conta.\n\n" +
        "Sua conta, login e plano Premium NÃO serão alterados.\n\n" +
        "Deseja realmente continuar?"
    );

    if (!confirmar) return;

    const textoOriginal = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = "<span>🗑️ APAGANDO DADOS...</span><b>›</b>";

    try {
        // Primeiro remove os registros persistidos no servidor.
        // Assim eles não reaparecem no Histórico após uma nova sincronização.
        await api.delete("/usuario/dados");

        // Depois limpa o estado local do aparelho.
        limparDadosLocaisDeCompras();

        window.alert(
            "Lista e histórico de compras apagados com sucesso. Sua conta e seu plano foram preservados."
        );
        window.location.href = "./inicio.html";
    } catch (erro) {
        console.error("Não foi possível apagar os dados de compras.", erro);
        window.alert(
            erro?.message
            || "Não foi possível apagar os dados agora. Nenhuma informação local foi removida."
        );
        botao.disabled = false;
        botao.innerHTML = textoOriginal;
    }
});
