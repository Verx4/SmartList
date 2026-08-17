import "./animations.js";

import {
    analisarMinhaEconomia,
    serieDeGastos
} from "./minha-economia-calculos.js";

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
});
const percentual = valor => `${Number(valor || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 1
})}%`;
const lerHistorico = () => {
    try {
        const dados = JSON.parse(localStorage.getItem("historicoCompras"));
        return Array.isArray(dados) ? dados : [];
    } catch (_erro) {
        return [];
    }
};

const compras = lerHistorico();
const agora = new Date();
const analise = analisarMinhaEconomia(compras, agora);
const nomeMes = deslocamento => new Date(
    agora.getFullYear(),
    agora.getMonth() + deslocamento,
    1
).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const rotuloCompras = quantidade => `${quantidade} ${quantidade === 1 ? "compra finalizada" : "compras finalizadas"}`;

document.getElementById("rotuloMesAtual").textContent = `Você gastou em ${nomeMes(0)}`;
document.getElementById("gastoMesAtual").textContent = moeda(analise.atual.totalGasto);
document.getElementById("comprasMesAtual").textContent = rotuloCompras(analise.atual.quantidadeCompras);
document.getElementById("rotuloMesAnterior").textContent = nomeMes(-1);
document.getElementById("gastoMesAnterior").textContent = moeda(analise.anterior.totalGasto);
document.getElementById("comprasMesAnterior").textContent = rotuloCompras(analise.anterior.quantidadeCompras);
document.getElementById("itensCompradosMes").textContent = analise.itensComprados.toLocaleString("pt-BR", {
    maximumFractionDigits: 3
});

const cardDiferenca = document.getElementById("cardDiferencaMes");
const tituloDiferenca = document.getElementById("tituloDiferencaMes");
const valorDiferenca = document.getElementById("valorDiferencaMes");
const textoDiferenca = document.getElementById("textoDiferencaMes");

cardDiferenca.className = "neutro";
valorDiferenca.textContent = moeda(0);

if (analise.tipo === "menor") {
    cardDiferenca.className = "positiva";
    tituloDiferenca.textContent = "Você gastou a menos";
    valorDiferenca.textContent = moeda(Math.abs(analise.diferenca));
    textoDiferenca.textContent = `${percentual(Math.abs(analise.diferenca) / analise.anterior.totalGasto * 100)} abaixo do mês passado.`;
} else if (analise.tipo === "maior") {
    cardDiferenca.className = "alerta";
    tituloDiferenca.textContent = "Você gastou a mais";
    valorDiferenca.textContent = moeda(analise.diferenca);
    textoDiferenca.textContent = `${percentual(analise.diferenca / analise.anterior.totalGasto * 100)} acima do mês passado.`;
} else if (analise.tipo === "igual") {
    cardDiferenca.className = "neutro";
    tituloDiferenca.textContent = "Gasto estável";
    valorDiferenca.textContent = moeda(0);
    textoDiferenca.textContent = "O total foi igual ao do mês passado.";
}

const destaque = document.getElementById("economiaDestaque");
document.getElementById("economiaDestaqueValor").textContent = moeda(0);

if (analise.economiaConfiavel) {
    destaque.classList.add("confirmada");
    document.getElementById("economiaDestaqueTitulo").textContent = "Você já economizou";
    document.getElementById("economiaDestaqueValor").textContent = moeda(analise.economia);
    document.getElementById("economiaDestaqueTexto").textContent = "comparando meses com quantidades de compras semelhantes.";
} else if (analise.tipo === "maior") {
    document.getElementById("economiaDestaqueTexto").textContent = "Seu gasto aumentou neste mês. Continue registrando para acompanhar a evolução.";
} else if (analise.tipo === "menor" && !analise.volumeComparavel) {
    document.getElementById("economiaDestaqueTexto").textContent = "O gasto diminuiu, mas a quantidade de compras dos meses é diferente. Por isso, a redução ainda não é chamada de economia.";
}

if (analise.categoriaPrincipal) {
    document.getElementById("categoriaPrincipalEconomia").textContent = analise.categoriaPrincipal.nome;
    document.getElementById("categoriaPrincipalDetalhe").textContent = `${moeda(analise.categoriaPrincipal.total)} · ${percentual(analise.categoriaPrincipal.percentual)} dos gastos`;
}

if (analise.maiorAumento) {
    document.getElementById("produtoMaiorAumento").textContent = `${analise.maiorAumento.nome} +${percentual(analise.maiorAumento.percentual)}`;
    document.getElementById("produtoMaiorAumentoDetalhe").textContent = `${moeda(analise.maiorAumento.precoAnterior)} → ${moeda(analise.maiorAumento.precoAtual)}`;
}

function renderizarGrafico(quantidadeMeses) {
    const serie = serieDeGastos(compras, quantidadeMeses, agora);
    const maximo = Math.max(1, ...serie.map(mes => mes.total));
    const grafico = document.getElementById("graficoEconomia");

    grafico.style.setProperty("--colunas", String(serie.length));
    grafico.innerHTML = serie.map(mes => `
        <article aria-label="${mes.rotulo}: ${moeda(mes.total)}, ${rotuloCompras(mes.compras)}">
            <strong>${moeda(mes.total)}</strong>
            <div><i style="--altura:${mes.total > 0 ? Math.max(4, mes.total / maximo * 100) : 0}%"></i></div>
            <span>${mes.rotulo}</span>
            <small>${mes.compras}</small>
        </article>
    `).join("");
}

document.getElementById("periodoGraficoEconomia").addEventListener("change", evento => {
    renderizarGrafico(Number(evento.target.value));
});

renderizarGrafico(6);
