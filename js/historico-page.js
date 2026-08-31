import "./animations.js";
import { api } from "./api.js";
import { combinarHistoricos } from "./historico-sync.js";
import {
    enfileirarColetaPreco,
    sincronizarColetasPendentes
} from "./coleta-precos.js";

import {
    agruparComprasPorCategoria,
    chaveDiaDaCompra,
    dataDaCompra,
    filtrarComprasPorPeriodo,
    itensDaCompra,
    precoUnitarioDoItem,
    quantidadeCompradaDoItem,
    resumirCompras,
    subtotalDoItem,
    totalDaCompra,
    totalItensComprados
} from "./historico-calculos.js";

const moeda = valor => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = valor => Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const escapar = valor => String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const normalizar = valor => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const lerHistoricoLocal = () => {
    try {
        const dados = JSON.parse(localStorage.getItem("historicoCompras"));
        const usuario = JSON.parse(localStorage.getItem("usuarioAtual"));
        const historico = Array.isArray(dados) ? dados : [];
        const usuarioId = String(usuario?.id || usuario?.usuarioId || "");
        const usuarioNome = normalizar(usuario?.nome || usuario?.name);

        if (!usuarioId && !usuarioNome) {
            return [];
        }

        return historico.filter(compra => {
            const compraUsuarioId = String(compra.usuarioId || "");
            if (usuarioId && compraUsuarioId) {
                return compraUsuarioId === usuarioId;
            }

            return usuarioNome
                && normalizar(compra.usuarioNome) === usuarioNome;
        });
    } catch (_erro) {
        return [];
    }
};

let compras = [];
const seletorPeriodo = document.getElementById("periodoHistorico");
const graficoCategorias = document.getElementById("graficoCategoriasHistorico");
const detalheCategoria = document.getElementById("detalheCategoriaHistorico");
const campoBusca = document.getElementById("buscarHistorico");
const listaHistorico = document.getElementById("listaHistorico");

let periodoSelecionado = "todos";
let comprasVisiveis = [];
let categorias = new Map();
let compraAbertaId = null;

function formatarData(data) {
    return Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleDateString("pt-BR");
}

function formatarChaveDia(chave) {
    const [ano, mes, dia] = String(chave).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "Data não informada";
}

function rotuloQuantidade(quantidade) {
    return `${numero(quantidade)} ${quantidade === 1 ? "item" : "itens"}`;
}

function descricaoQuantidadeEPreco(item) {
    const peso = Number(item.peso || 0);
    const precoUnitario = precoUnitarioDoItem(item);
    if (peso > 0) return `${numero(peso)} kg × ${moeda(precoUnitario)}/kg`;
    const quantidade = quantidadeCompradaDoItem(item);
    return `${numero(quantidade)} ${quantidade === 1 ? "unidade" : "unidades"} × ${moeda(precoUnitario)}`;
}

function mercadoDaCompra(compra) {
    return compra.mercadoNome || compra.supermercado || compra.mercado || "Mercado não informado";
}

function usuarioDaCompra(compra) {
    return compra.usuarioNome || compra.usuario || "Usuário não identificado";
}

function idDaCompra(compra, indice) {
    return String(compra.id || compra.compraId || `${chaveDiaDaCompra(compra)}-${indice}`);
}

function preencherSeletorDeDias() {
    const dias = [...new Set(compras.map(chaveDiaDaCompra).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    seletorPeriodo.innerHTML = [
        '<option value="todos">Todas as compras</option>',
        ...dias.map(dia => `<option value="${dia}">Compra do dia ${formatarChaveDia(dia)}</option>`)
    ].join("");
}

function atualizarResumo() {
    const resumo = resumirCompras(comprasVisiveis);
    document.getElementById("historicoTotalGasto").textContent = moeda(resumo.totalGasto);
    document.getElementById("historicoTotalEconomizado").textContent = moeda(resumo.economia);
    document.getElementById("historicoQuantidadeCompras").textContent = String(resumo.quantidadeCompras);
    document.getElementById("historicoItensComprados").textContent = numero(resumo.itensComprados);
    document.getElementById("historicoMediaCompra").textContent = moeda(resumo.media);
    document.getElementById("historicoPeriodoDescricao").textContent = periodoSelecionado === "todos"
        ? "Somando todas as compras finalizadas"
        : `Somente as compras de ${formatarChaveDia(periodoSelecionado)}`;
}

function renderizarCategorias() {
    categorias = agruparComprasPorCategoria(comprasVisiveis);
    const categoriasOrdenadas = [...categorias.entries()].sort((a, b) => b[1].total - a[1].total);
    const maximo = Math.max(1, ...categoriasOrdenadas.map(([, dados]) => dados.total));
    graficoCategorias.innerHTML = categoriasOrdenadas.length
        ? categoriasOrdenadas.map(([nome, dados]) => `
            <button type="button" data-categoria="${escapar(nome)}" style="--largura:${Math.max(3, dados.total / maximo * 100)}%">
                <span><strong>${escapar(nome)}</strong><b>${moeda(dados.total)}</b></span><i></i><small>${rotuloQuantidade(dados.quantidade)}</small>
            </button>`).join("")
        : '<p class="historico-vazio">Nenhuma compra encontrada neste período.</p>';
    detalheCategoria.hidden = true;
}

function mostrarCategoria(nome) {
    const registro = categorias.get(nome);
    if (!registro) return;
    document.getElementById("nomeCategoriaHistorico").textContent = nome;
    document.getElementById("totalCategoriaHistorico").textContent = moeda(registro.total);
    document.getElementById("quantidadeCategoriaHistorico").textContent = rotuloQuantidade(registro.quantidade);
    document.getElementById("itensCategoriaHistorico").innerHTML = registro.itens
        .sort((a, b) => dataDaCompra(b.compra) - dataDaCompra(a.compra))
        .map(({ item, compra }) => `<article><div><strong>${escapar(item.nome || "Item")}</strong><small>${escapar(mercadoDaCompra(compra))} · ${formatarData(dataDaCompra(compra))}</small><span>${descricaoQuantidadeEPreco(item)}</span></div><b>${moeda(subtotalDoItem(item))}</b></article>`).join("");
    detalheCategoria.hidden = false;
    detalheCategoria.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function comprasFiltradas(termo = "") {
    const filtro = normalizar(termo);
    return [...comprasVisiveis]
        .sort((a, b) => dataDaCompra(b) - dataDaCompra(a))
        .filter(compra => {
            const texto = [mercadoDaCompra(compra), usuarioDaCompra(compra), ...itensDaCompra(compra).map(item => item.nome)].join(" ");
            return !filtro || normalizar(texto).includes(filtro);
        });
}

function renderizarPastas(termo = "") {
    const filtradas = comprasFiltradas(termo);
    document.getElementById("tituloListaHistorico").textContent = periodoSelecionado === "todos" ? "Compras salvas" : `Compras de ${formatarChaveDia(periodoSelecionado)}`;
    listaHistorico.innerHTML = filtradas.length
        ? filtradas.map((compra, indice) => {
            const id = idDaCompra(compra, indice);
            return `<button class="historico-pasta" type="button" data-abrir-compra="${escapar(id)}">
                <span class="historico-pasta-icone" aria-hidden="true">📁</span>
                <span class="historico-pasta-info"><strong>${formatarData(dataDaCompra(compra))} · ${escapar(mercadoDaCompra(compra))}</strong><small>Usuário: ${escapar(usuarioDaCompra(compra))}</small><small>${rotuloQuantidade(totalItensComprados(compra))} · ${moeda(totalDaCompra(compra))}</small></span>
                <span class="historico-pasta-acao">Abrir</span>
            </button>`;
        }).join("")
        : '<p class="historico-vazio">Nenhuma compra encontrada.</p>';
}

function abrirCompra(id) {
    const filtradas = comprasFiltradas(campoBusca.value);
    const compra = filtradas.find((item, indice) => idDaCompra(item, indice) === id);
    if (!compra) return;
    compraAbertaId = id;
    document.getElementById("tituloListaHistorico").textContent = "Lista da compra";
    listaHistorico.innerHTML = `<article class="historico-pasta-detalhe">
        <header><button type="button" class="btn-voltar-compra" data-voltar-compras>← Voltar</button><div><small>Compra salva</small><h3>${formatarData(dataDaCompra(compra))} · ${escapar(mercadoDaCompra(compra))}</h3><p>Usuário: <strong>${escapar(usuarioDaCompra(compra))}</strong></p></div><strong>${moeda(totalDaCompra(compra))}</strong></header>
        <div class="historico-itens-compra">${itensDaCompra(compra).map(item => `<div class="historico-item-compra"><span><strong>${escapar(item.nome || "Item")}</strong><small>${escapar(item.categoria || "Sem categoria")} · ${descricaoQuantidadeEPreco(item)}</small></span><strong>${moeda(subtotalDoItem(item))}</strong></div>`).join("") || '<p class="historico-vazio">Sem itens detalhados.</p>'}</div>
    </article>`;
    listaHistorico.scrollIntoView({ behavior: "smooth", block: "start" });
}

function aplicarPeriodo() {
    compraAbertaId = null;
    comprasVisiveis = filtrarComprasPorPeriodo(compras, periodoSelecionado);
    atualizarResumo();
    renderizarCategorias();
    renderizarPastas(campoBusca.value);
}

async function carregarCompras() {
    listaHistorico.innerHTML = '<p class="historico-vazio">Carregando compras salvas...</p>';
    const locais = lerHistoricoLocal();
    let remotas = [];

    for (const compra of locais) {
        enfileirarColetaPreco(compra);
    }
    await sincronizarColetasPendentes();

    try {
        const dados = await api.get("/coleta-precos/compras/historico");
        remotas = Array.isArray(dados) ? dados : [];
    } catch (_erroColeta) {
        try {
            const dadosLegados = await api.get("/listas/historico");
            remotas = Array.isArray(dadosLegados) ? dadosLegados : [];
        } catch (_erroLista) {
            remotas = [];
        }
    }

    compras = combinarHistoricos(remotas, locais);
    preencherSeletorDeDias();
    aplicarPeriodo();
}

graficoCategorias.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-categoria]");
    if (!botao) return;
    graficoCategorias.querySelectorAll("[data-categoria]").forEach(item => item.classList.toggle("ativo", item === botao));
    mostrarCategoria(botao.dataset.categoria);
});

listaHistorico.addEventListener("click", evento => {
    const abrir = evento.target.closest("[data-abrir-compra]");
    if (abrir) return abrirCompra(abrir.dataset.abrirCompra);
    if (evento.target.closest("[data-voltar-compras]")) {
        compraAbertaId = null;
        renderizarPastas(campoBusca.value);
    }
});

seletorPeriodo.addEventListener("change", evento => { periodoSelecionado = evento.target.value; aplicarPeriodo(); });
campoBusca.addEventListener("input", evento => { compraAbertaId = null; renderizarPastas(evento.target.value); });

document.getElementById("btnLimparHistorico").addEventListener("click", () => {
    if (window.confirm("Zerar o histórico salvo apenas neste aparelho? As compras da sua conta continuam protegidas no servidor.")) {
        localStorage.removeItem("historicoCompras");
        localStorage.removeItem("ultimaCompra");
        window.location.reload();
    }
});

function limparTextoPdf(valor) {
    return String(valor ?? "")
        .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function escaparTextoPdf(valor) {
    return limparTextoPdf(valor)
        .replaceAll("\\", "\\\\")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)");
}

function criarPdfMinhaLista(comprasSelecionadas) {
    const largura = 595;
    const altura = 842;
    const margem = 48;
    const paginas = [];
    let comandos = [];
    let y = 755;

    const escrever = (texto, tamanho = 11, negrito = false, cor = "0.08 0.12 0.20") => {
        comandos.push("BT /" + (negrito ? "F2" : "F1") + " " + tamanho + " Tf " + cor + " rg " + margem + " " + y + " Td (" + escaparTextoPdf(texto) + ") Tj ET");
        y -= tamanho + 7;
    };

    const novaPagina = () => {
        if (comandos.length) paginas.push(comandos.join("\n"));
        comandos = [
            "0.03 0.10 0.20 rg 0 782 595 60 re f",
            "0.18 0.44 0.95 rg 0 778 595 4 re f",
            "BT /F2 22 Tf 1 1 1 rg 48 802 Td (MINHA LISTA) Tj ET"
        ];
        y = 755;
    };

    const garantirEspaco = (alturaNecessaria = 70) => {
        if (y < 55 + alturaNecessaria) novaPagina();
    };

    novaPagina();
    escrever("Exportado em " + new Date().toLocaleString("pt-BR"), 9, false, "0.35 0.42 0.52");
    y -= 8;

    comprasSelecionadas.forEach((compra, indiceCompra) => {
        const itens = itensDaCompra(compra);
        garantirEspaco(85);
        escrever(dataDaCompra(compra).toLocaleDateString("pt-BR") + " - " + mercadoDaCompra(compra), 15, true);
        escrever("Comprador: " + usuarioDaCompra(compra), 10, false, "0.30 0.36 0.45");
        y -= 5;

        itens.forEach((item, indiceItem) => {
            garantirEspaco(55);
            const quantidade = quantidadeCompradaDoItem(item);
            const medida = limparTextoPdf(item.medida || item.unidade || "unidade");
            const categoria = limparTextoPdf(item.categoria || "Sem categoria");
            escrever((indiceItem + 1) + ". " + limparTextoPdf(item.nome || item.produto || "Item"), 11, true);
            escrever(categoria + " | " + numero(quantidade) + " " + medida + " x " + moeda(precoUnitarioDoItem(item)) + " = " + moeda(subtotalDoItem(item)), 9, false, "0.25 0.31 0.40");
            y -= 4;
        });

        garantirEspaco(45);
        escrever("Total da compra: " + moeda(totalDaCompra(compra)), 12, true, "0.08 0.40 0.24");
        if (indiceCompra < comprasSelecionadas.length - 1) {
            comandos.push("0.82 0.85 0.90 RG 0.7 w " + margem + " " + y + " m " + (largura - margem) + " " + y + " l S");
            y -= 22;
        }
    });

    const resumo = resumirCompras(comprasSelecionadas);
    garantirEspaco(75);
    y -= 8;
    escrever("RESUMO", 13, true, "0.18 0.44 0.95");
    escrever("Compras: " + resumo.quantidadeCompras + " | Itens: " + numero(resumo.itensComprados) + " | Total: " + moeda(resumo.totalGasto), 11, true);
    paginas.push(comandos.join("\n"));

    const objetos = [];
    const adicionarObjeto = conteudo => {
        objetos.push(conteudo);
        return objetos.length;
    };

    adicionarObjeto("<< /Type /Catalog /Pages 2 0 R >>");
    adicionarObjeto("");
    adicionarObjeto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    adicionarObjeto("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    const referenciasPaginas = [];
    paginas.forEach(conteudo => {
        const paginaId = objetos.length + 1;
        const conteudoId = paginaId + 1;
        referenciasPaginas.push(paginaId + " 0 R");
        adicionarObjeto("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + largura + " " + altura + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + conteudoId + " 0 R >>");
        adicionarObjeto("<< /Length " + conteudo.length + " >>\nstream\n" + conteudo + "\nendstream");
    });
    objetos[1] = "<< /Type /Pages /Kids [" + referenciasPaginas.join(" ") + "] /Count " + paginas.length + " >>";

    let pdf = "%PDF-1.4\n%âãÏÓ\n";
    const offsets = [0];
    objetos.forEach((objeto, indice) => {
        offsets.push(pdf.length);
        pdf += (indice + 1) + " 0 obj\n" + objeto + "\nendobj\n";
    });
    const inicioXref = pdf.length;
    pdf += "xref\n0 " + (objetos.length + 1) + "\n0000000000 65535 f \n";
    offsets.slice(1).forEach(offset => {
        pdf += String(offset).padStart(10, "0") + " 00000 n \n";
    });
    pdf += "trailer\n<< /Size " + (objetos.length + 1) + " /Root 1 0 R >>\nstartxref\n" + inicioXref + "\n%%EOF";

    return new Uint8Array([...pdf].map(caractere => caractere.charCodeAt(0) & 255));
}

async function exportarMinhaListaPdf() {
    if (!comprasVisiveis.length) {
        window.alert("Não há compras neste período para exportar.");
        return;
    }

    const arquivo = new File(
        [criarPdfMinhaLista(comprasVisiveis)],
        "MINHA LISTA.pdf",
        { type: "application/pdf" }
    );

    if (navigator.share && navigator.canShare?.({ files: [arquivo] })) {
        try {
            await navigator.share({
                title: "MINHA LISTA",
                text: "Minha lista de compras do Smart List.",
                files: [arquivo]
            });
            return;
        } catch (erro) {
            if (erro?.name !== "AbortError") console.warn("Não foi possível compartilhar o PDF.", erro);
            if (erro?.name === "AbortError") return;
        }
    }

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = "MINHA LISTA.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const botaoExportarHistorico = document.getElementById("btnExportarHistorico");
botaoExportarHistorico.textContent = "Exportar PDF";
botaoExportarHistorico.addEventListener("click", exportarMinhaListaPdf);

carregarCompras();
