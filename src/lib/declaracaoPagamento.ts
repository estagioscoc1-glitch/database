/**
 * DECLARAÇÃO DE PAGAMENTO (IMPOSTO DE RENDA) — monta o trecho das parcelas.
 *
 * Puxa as parcelas já pagas do Financeiro (getInstallments, tabela
 * financeiro_parcelas) e transforma em texto igual ao modelo em papel que a
 * escola já usa:
 *
 *   03 (três) parcelas de R$ 305,00 (Trezentos e cinco reais), totalizando
 *   R$ 915,00 (Novecentos e quinze reais);
 *   ...
 *   Ao todo foi recebido por esta instituição, R$ 1.955,00 (Hum mil,
 *   novecentos e cinquenta e cinco reais).
 *
 * Regra de agrupamento: ordena as parcelas pagas por competência e junta em
 * grupos as que têm o MESMO valor pago e são consecutivas — é assim que o
 * modelo em papel foi montado (ex.: 3 meses a R$305, depois 2 a R$350).
 */

import { formatarDinheiro } from './supabaseContratos';
import type { Installment } from '../types/financeiro';

// ---------------------------------------------------------------------------
// VALOR POR EXTENSO — estilo bancário/cheque: "Hum" (com H) em vez de "um"
// avulso, e vírgula entre o grupo de milhar e o resto, em vez de "e". É a
// convenção usada nos documentos financeiros da escola (contrato usa outro
// estilo, mais comum — por isso esta função é própria, não reaproveitada).
// ---------------------------------------------------------------------------
const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function trio(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (d === 1) {
    partes.push(DEZ_A_DEZENOVE[u]);
  } else {
    if (d > 1) partes.push(DEZENAS[d]);
    if (u > 0) partes.push(UNIDADES[u]);
  }
  return partes.join(' e ');
}

export function valorPorExtensoBancario(valor: number): string {
  const v = Math.round((valor ?? 0) * 100) / 100;
  const inteiro = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);

  let texto: string;
  if (inteiro === 0) {
    texto = 'zero reais';
  } else {
    const milhar = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    let milharTexto = '';
    if (milhar === 1) milharTexto = 'hum mil';
    else if (milhar > 1) milharTexto = `${trio(milhar)} mil`;

    if (milharTexto && resto > 0) texto = `${milharTexto}, ${trio(resto)}`;
    else if (milharTexto) texto = milharTexto;
    else texto = trio(resto);

    texto += inteiro === 1 ? ' real' : ' reais';
  }

  if (centavos > 0) {
    texto += ` e ${trio(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }

  // "Hum" com H maiúsculo em todo "um" avulso (convenção bancária contra
  // fraude), e primeira letra da frase maiúscula.
  texto = texto.replace(/\bum\b/g, 'Hum');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------------------------------------------------------------------------
// AGRUPAMENTO DAS PARCELAS PAGAS
// ---------------------------------------------------------------------------
export interface GrupoParcelasPagas {
  quantidade: number;
  valor: number;   // valor de CADA parcela do grupo
  total: number;   // quantidade × valor (com eventuais centavos ajustados)
}

const QUANTIDADE_FEM = [
  '', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis',
  'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
];

/** Valor efetivamente pago de uma parcela — o que caiu no caixa, não o valor de tabela. */
function valorPago(p: Installment): number {
  if (p.paidValue != null) return p.paidValue;
  return (p.originalValue || 0) - (p.discountValue || 0);
}

/**
 * Agrupa parcelas pagas consecutivas (por competência) que têm o mesmo
 * valor. Só considera status === 'PAGA' — quem chamar esta função já deve
 * ter filtrado pelo aluno e pelo ano.
 */
export function agruparParcelasPagas(parcelas: Installment[]): GrupoParcelasPagas[] {
  const pagas = parcelas.filter(p => p.status === 'PAGA');
  const ordenadas = [...pagas].sort((a, b) => {
    const ca = a.competencia || a.dueDate || '';
    const cb = b.competencia || b.dueDate || '';
    return ca.localeCompare(cb);
  });

  const grupos: GrupoParcelasPagas[] = [];
  for (const p of ordenadas) {
    const valor = Math.round(valorPago(p) * 100) / 100;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && Math.abs(ultimo.valor - valor) < 0.005) {
      ultimo.quantidade += 1;
      ultimo.total = Math.round((ultimo.total + valor) * 100) / 100;
    } else {
      grupos.push({ quantidade: 1, valor, total: valor });
    }
  }
  return grupos;
}

/**
 * Monta as linhas de texto (uma por grupo + a linha de total geral), prontas
 * para entrar no documento — cada string já é uma frase completa terminada
 * em ";" (ou "." na última).
 */
export function montarLinhasPagamento(parcelas: Installment[]): { linhas: string[]; totalGeral: number } {
  const grupos = agruparParcelasPagas(parcelas);

  const linhas = grupos.map(g => {
    const qtdTxt = String(g.quantidade).padStart(2, '0');
    const extQtd = QUANTIDADE_FEM[g.quantidade] || String(g.quantidade);
    if (g.quantidade === 1) {
      return `${qtdTxt} (${extQtd}) parcela de ${formatarDinheiro(g.valor)} (${valorPorExtensoBancario(g.valor)});`;
    }
    return `${qtdTxt} (${extQtd}) parcelas de ${formatarDinheiro(g.valor)} (${valorPorExtensoBancario(g.valor)}), totalizando ${formatarDinheiro(g.total)} (${valorPorExtensoBancario(g.total)});`;
  });

  const totalGeral = Math.round(grupos.reduce((s, g) => s + g.total, 0) * 100) / 100;
  linhas.push(`Ao todo foi recebido por esta instituição, ${formatarDinheiro(totalGeral)} (${valorPorExtensoBancario(totalGeral)}).`);

  return { linhas, totalGeral };
}

/** Filtra as parcelas de UM aluno, pagas, dentro de um ano letivo (competência "MM/AAAA"). */
export function parcelasDoAlunoNoAno(
  todas: Installment[],
  studentId: string,
  ano: string
): Installment[] {
  const anoLimpo = ano.trim();
  return todas.filter(
    p => p.studentId === studentId && p.status === 'PAGA' && (p.competencia || '').endsWith(`/${anoLimpo}`)
  );
}
