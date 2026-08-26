import "./animations.js";

import {
    analisarMinhaEconomia,
    serieDeGastos
} from "./minha-economia-calculos.js";
import { compararCompras } from "./comparacao-compras-calculos.js";
import { dataDaCompra, totalDaCompra } from "./historico-calculos.js";

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
const escapar = valor => String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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

const comprasDisponiveis = compras
    .map((compra, indice) => ({ compra, indice, data: dataDaCompra(compra) }))
    .sort((a, b) => b.data - a.data);
const seletorCompra1 = document.getElementById("compraComparacao1");
const seletorCompra2 = document.getElementById("compraComparacao2");
const estadoComparacao = document.getElementById("comparacaoComprasEstado");
const resultadoComparacao = document.getElementById("resultadoComparacaoCompras");

function dataFormatada(data) {
    return data instanceof Date && !Number.isNaN(data.getTime())
        ? data.toLocaleDateString("pt-BR")
        : "Data não informada";
}

function mercadoDaCompra(compra) {
    return compra?.supermercado
        || compra?.mercado
        || compra?.estabelecimento
        || "Mercado não informado";
}

function rotuloDaCompra(registro) {
    return `${dataFormatada(registro.data)} · ${mercadoDaCompra(registro.compra)} · ${moeda(totalDaCompra(registro.compra))}`;
}

function preencherSeletores() {
    const vazio = '<option value="">Selecione uma compra</option>';
    const opcoes = comprasDisponiveis.map(registro => (
        `<option value="${registro.indice}">${escapar(rotuloDaCompra(registro))}</option>`
    )).join("");

    seletorCompra1.innerHTML = vazio + opcoes;
    seletorCompra2.innerHTML = vazio + opcoes;

    if (comprasDisponiveis.length >= 2) {
        seletorCompra1.value = String(comprasDisponiveis[1].indice);
        seletorCompra2.value = String(comprasDisponiveis[0].indice);
    } else if (comprasDisponiveis.length === 1) {
        seletorCompra1.value = String(comprasDisponiveis[0].indice);
    }
}

function preencherLista(id, itens, vazio) {
    const lista = document.getElementById(id);
    lista.innerHTML = itens.length
        ? itens.map(item => `<li>${escapar(item.nome)}</li>`).join("")
        : `<li class="vazio">${escapar(vazio)}</li>`;
}

function renderizarItensComparaveis(analise) {
    const corpo = document.getElementById("comparacaoItensComuns");

    corpo.innerHTML = analise.comparaveis.length
        ? analise.comparaveis.map(item => {
            const melhor = item.melhor === "compra-1"
                ? "Compra 1"
                : item.melhor === "compra-2"
                    ? "Compra 2"
                    : "Empate";
            return `
                <tr>
                    <th scope="row">${escapar(item.nome)}</th>
                    <td><strong>${moeda(item.precoCompra1)} / ${escapar(item.unidadeBase)}</strong><small>${escapar(item.apresentacaoCompra1)}</small></td>
                    <td><strong>${moeda(item.precoCompra2)} / ${escapar(item.unidadeBase)}</strong><small>${escapar(item.apresentacaoCompra2)}</small></td>
                    <td>${moeda(item.diferenca)} / ${escapar(item.unidadeBase)}</td>
                    <td><span class="melhor ${item.melhor}">${melhor}</span></td>
                </tr>
            `;
        }).join("")
        : '<tr><td colspan="5" class="sem-comparaveis">Nenhum produto com medida compatível foi encontrado nas duas compras.</td></tr>';
}

function renderizarComparacao() {
    const indice1 = Number(seletorCompra1.value);
    const indice2 = Number(seletorCompra2.value);
    const selecionou1 = seletorCompra1.value !== "" && Number.isInteger(indice1);
    const selecionou2 = seletorCompra2.value !== "" && Number.isInteger(indice2);

    if (!selecionou1 || !selecionou2) {
        resultadoComparacao.hidden = true;
        estadoComparacao.textContent = compras.length < 2
            ? "Finalize pelo menos duas compras para comparar."
            : "Selecione duas compras finalizadas.";
        return;
    }

    if (indice1 === indice2) {
        resultadoComparacao.hidden = true;
        estadoComparacao.textContent = "Escolha duas compras diferentes.";
        return;
    }

    const analise = compararCompras(compras[indice1], compras[indice2]);
    const diferencaTotal = analise.diferencaTotal;
    const saldoCard = document.getElementById("comparacaoSaldoCard");

    estadoComparacao.textContent = "Comparação atualizada com os dados reais das compras selecionadas.";
    resultadoComparacao.hidden = false;
    document.getElementById("comparacaoMercado1").textContent = analise.compra1.mercado;
    document.getElementById("comparacaoMercado2").textContent = analise.compra2.mercado;
    document.getElementById("comparacaoTotal1").textContent = moeda(analise.compra1.total);
    document.getElementById("comparacaoTotal2").textContent = moeda(analise.compra2.total);
    document.getElementById("comparacaoData1").textContent = dataFormatada(analise.compra1.data);
    document.getElementById("comparacaoData2").textContent = dataFormatada(analise.compra2.data);
    document.getElementById("comparacaoDiferencaTotal").textContent = moeda(Math.abs(diferencaTotal));
    document.getElementById("comparacaoDiferencaTexto").textContent = diferencaTotal > 0
        ? "A Compra 2 custou mais no total."
        : diferencaTotal < 0
            ? "A Compra 2 custou menos no total."
            : "Os carrinhos tiveram o mesmo total.";
    document.getElementById("comparacaoValorComum1").textContent = moeda(analise.valorComparavel1);
    document.getElementById("comparacaoValorComum2").textContent = moeda(analise.valorComparavel2);
    document.getElementById("comparacaoSaldoReal").textContent = moeda(Math.abs(analise.saldoReal));
    document.getElementById("comparacaoQuantidadeItens").textContent = analise.quantidadeComparada;
    document.getElementById("comparacaoMelhores1").textContent = analise.maisBaratosCompra1;
    document.getElementById("comparacaoMelhores2").textContent = analise.maisBaratosCompra2;
    document.getElementById("comparacaoEmpates").textContent = analise.empates;

    saldoCard.className = "saldo";
    if (!analise.quantidadeComparada) {
        document.getElementById("comparacaoSaldoTexto").textContent = "Sem itens compatíveis, não há economia real calculada.";
    } else if (analise.economiaReal > 0) {
        saldoCard.classList.add("positiva");
        document.getElementById("comparacaoSaldoTexto").textContent = "Você economizou esse valor na Compra 2 para a mesma cesta comparável.";
    } else if (analise.gastoExtraReal > 0) {
        saldoCard.classList.add("alerta");
        document.getElementById("comparacaoSaldoTexto").textContent = "Você gastou esse valor a mais na Compra 2 para a mesma cesta comparável.";
    } else {
        document.getElementById("comparacaoSaldoTexto").textContent = "A mesma cesta comparável teve o mesmo custo.";
    }

    renderizarItensComparaveis(analise);
    preencherLista("comparacaoExclusivos1", analise.exclusivosCompra1, "Nenhum item exclusivo.");
    preencherLista("comparacaoExclusivos2", analise.exclusivosCompra2, "Nenhum item exclusivo.");
    preencherLista("comparacaoIncompativeis", analise.naoComparaveis, "Nenhum item incompatível.");
    document.getElementById("comparacaoIncompativeisCard").hidden = !analise.naoComparaveis.length;
}

preencherSeletores();
seletorCompra1.addEventListener("change", renderizarComparacao);
seletorCompra2.addEventListener("change", renderizarComparacao);
renderizarComparacao();
