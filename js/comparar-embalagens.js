import "./animations.js";
import "./acesso-premium.js";

const $ = (id) => document.getElementById(id);

const unidades = {
  g: { grupo: 'massa', base: 1, rotulo: 'g', referencia: 'kg', fatorReferencia: 1000 },
  kg: { grupo: 'massa', base: 1000, rotulo: 'kg', referencia: 'kg', fatorReferencia: 1000 },
  ml: { grupo: 'volume', base: 1, rotulo: 'ml', referencia: 'L', fatorReferencia: 1000 },
  l: { grupo: 'volume', base: 1000, rotulo: 'L', referencia: 'L', fatorReferencia: 1000 },
  un: { grupo: 'unidade', base: 1, rotulo: 'un', referencia: 'un', fatorReferencia: 1 }
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function dados(sufixo) {
  const quantidade = Number($(`peso${sufixo}`).value);
  const preco = Number($(`preco${sufixo}`).value);
  const unidade = $(`unidade${sufixo}`).value;
  const meta = unidades[unidade];
  return { quantidade, preco, unidade, meta, base: quantidade * meta.base };
}

function descricao(item) {
  return `${numero.format(item.quantidade)} ${item.meta.rotulo}`;
}

function mostrarErro(mensagem) {
  const erro = $('erroComparacao');
  erro.textContent = mensagem;
  erro.hidden = false;
}

function limparErro() {
  $('erroComparacao').hidden = true;
}

function zerarResultado() {
  $('quantidadeNecessaria').textContent = '0 unidades';
  $('descricaoQuantidade').textContent = 'preencha as duas embalagens';
  $('textoCusto').textContent = 'Custo total:';
  $('custoEquivalente').textContent = moeda.format(0);
  $('melhorOpcao').textContent = 'Preencha os valores para comparar';
  $('economiaValor').textContent = moeda.format(0);
  $('economiaPercentual').textContent = '0%';
  $('precoUnitarioA').textContent = `${moeda.format(0)} / unidade`;
  $('precoUnitarioB').textContent = `${moeda.format(0)} / unidade`;
}

function calcular() {
  const a = dados('A');
  const b = dados('B');

  if (!a.quantidade || !b.quantidade || !a.preco || !b.preco) {
    zerarResultado();
    mostrarErro('Preencha quantidades e preços maiores que zero.');
    return;
  }

  if (a.meta.grupo !== b.meta.grupo) {
    mostrarErro('Use unidades compatíveis: peso com peso, volume com volume ou unidade com unidade.');
    return;
  }

  limparErro();
  const maior = a.base >= b.base ? { ...a, nome: 'Embalagem 1' } : { ...b, nome: 'Embalagem 2' };
  const menor = a.base >= b.base ? { ...b, nome: 'Embalagem 2' } : { ...a, nome: 'Embalagem 1' };
  const unidadesNecessarias = Math.ceil(maior.base / menor.base);
  const custoEquivalente = unidadesNecessarias * menor.preco;

  $('quantidadeNecessaria').textContent = `${unidadesNecessarias} ${unidadesNecessarias === 1 ? 'unidade' : 'unidades'}`;
  $('descricaoQuantidade').textContent = `da ${menor.nome.toLowerCase()} de ${descricao(menor)}`;
  $('textoCusto').textContent = `Custo total das ${unidadesNecessarias} ${unidadesNecessarias === 1 ? 'unidade' : 'unidades'}:`;
  $('custoEquivalente').textContent = moeda.format(custoEquivalente);

  const menorEhMelhor = custoEquivalente < maior.preco;
  const melhor = menorEhMelhor ? menor : maior;
  const quantidadeMelhor = menorEhMelhor ? unidadesNecessarias : 1;
  const custoMelhor = menorEhMelhor ? custoEquivalente : maior.preco;
  const custoPior = menorEhMelhor ? maior.preco : custoEquivalente;
  const economia = Math.max(0, custoPior - custoMelhor);
  const percentual = custoPior > 0 ? (economia / custoPior) * 100 : 0;
  const rotuloQuantidade = quantidadeMelhor === 1 ? 'unidade' : 'unidades';

  $('melhorOpcao').textContent = `Levar ${quantidadeMelhor} ${rotuloQuantidade} da ${melhor.nome.toLowerCase()} de ${descricao(melhor)}`;
  $('economiaValor').textContent = moeda.format(economia);
  $('economiaPercentual').textContent = `${numero.format(percentual)}%`;

  const refA = (a.preco / a.base) * a.meta.fatorReferencia;
  const refB = (b.preco / b.base) * b.meta.fatorReferencia;
  $('precoUnitarioA').textContent = `${moeda.format(refA)} / ${a.meta.referencia}`;
  $('precoUnitarioB').textContent = `${moeda.format(refB)} / ${b.meta.referencia}`;
}

function trocar() {
  ['peso', 'preco', 'unidade'].forEach((campo) => {
    const a = $(`${campo}A`).value;
    $(`${campo}A`).value = $(`${campo}B`).value;
    $(`${campo}B`).value = a;
  });
  calcular();
}

function limpar(focar = true) {
  $('pesoA').value = 0;
  $('unidadeA').value = 'g';
  $('precoA').value = 0;
  $('pesoB').value = 0;
  $('unidadeB').value = 'g';
  $('precoB').value = 0;
  calcular();
  if (focar) $('pesoA').focus();
}

document.querySelectorAll('#formEmbalagens input, #formEmbalagens select').forEach((campo) => {
  campo.addEventListener('input', calcular);
  campo.addEventListener('change', calcular);
});

$('trocarEmbalagens').addEventListener('click', trocar);
$('novaComparacao').addEventListener('click', () => limpar(true));
limpar(false);
