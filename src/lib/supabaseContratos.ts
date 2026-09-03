/**
 * CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS — tipos e utilitários.
 *
 * Este arquivo guarda o formato dos dados que alimentam o contrato e as
 * funções de formatação (dinheiro e valor por extenso). O texto do contrato
 * em si fica em src/components/contratos/ContratoPrintView.tsx.
 */

export type ModalidadeContrato = 'PRESENCIAL' | 'EAD';

export interface DadosContrato {
  // Quem assina (pode ser o próprio aluno ou o responsável)
  contratanteNome: string;
  estadoCivil?: string;
  cpf?: string;
  rg?: string;
  rgOrgao?: string;
  nacionalidade?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;

  // O beneficiário
  alunoNome: string;
  alunoId?: string;
  cursoNome?: string;

  modalidade: ModalidadeContrato;
  ano: string;
  modulo: string;

  // Valores
  valorTotal: number;
  entrada: number;
  numParcelas: number;
  valorParcela: number;
  descontoMatutino: number;
  descontoVespertino: number;
  descontoNoturno: number;
  descontoEadPercentual?: number;
  valorBiosseguranca: number;
  valorMaterialEstagio: number;

  dataContrato: string; // AAAA-MM-DD
}

/** Valores que vêm dos contratos oficiais da escola, usados como sugestão. */
export const PADRAO_CONTRATO: Omit<
  DadosContrato,
  'contratanteNome' | 'alunoNome' | 'modalidade' | 'ano' | 'modulo' | 'dataContrato'
> = {
  valorTotal: 2400,
  entrada: 90,
  numParcelas: 6,
  valorParcela: 400,
  descontoMatutino: 280,
  descontoVespertino: 250,
  descontoNoturno: 305,
  descontoEadPercentual: 37.5,
  valorBiosseguranca: 200,
  valorMaterialEstagio: 360,
};

export function formatarDinheiro(v: number): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ---------------------------------------------------------------------------
// VALOR POR EXTENSO
// O contrato exige a forma "R$ 2.400,00 (dois mil e quatrocentos reais)".
// Escrever à mão dá erro; então geramos. Cobre até 999.999,99, que é muito
// mais do que qualquer mensalidade da escola.
// ---------------------------------------------------------------------------
const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function trioPorExtenso(n: number): string {
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

export function porExtenso(valor: number): string {
  const v = Math.round((valor ?? 0) * 100) / 100;
  const inteiro = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);

  let texto = '';
  if (inteiro === 0) {
    texto = 'zero reais';
  } else {
    const milhar = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;
    const partes: string[] = [];
    if (milhar === 1) partes.push('mil');
    else if (milhar > 1) partes.push(`${trioPorExtenso(milhar)} mil`);
    if (resto > 0) {
      // "dois mil e quatrocentos" — o "e" entra quando o resto é < 100
      // ou múltiplo exato de cem, que é como se fala em português.
      const ligacao = milhar > 0 ? (resto < 100 || resto % 100 === 0 ? ' e ' : ' ') : '';
      partes.push(ligacao + trioPorExtenso(resto));
    }
    texto = partes.join('').trim() + (inteiro === 1 ? ' real' : ' reais');
  }

  if (centavos > 0) {
    texto += ` e ${trioPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }
  return texto;
}
