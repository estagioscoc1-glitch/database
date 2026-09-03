/**
 * CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS — tipos e utilitários.
 *
 * Este arquivo guarda o formato dos dados que alimentam o contrato e as
 * funções de formatação (dinheiro e valor por extenso). O texto do contrato
 * em si fica em src/components/contratos/ContratoPrintView.tsx.
 */

export type ModalidadeContrato = 'PRESENCIAL' | 'EAD';

/** Campos que só o aditivo de dependência usa. */
export interface DadosAditivo {
  disciplinas: string[];
  valorParcela: number;
  numParcelas: number;
}

export const PADRAO_ADITIVO: DadosAditivo = {
  disciplinas: [],
  valorParcela: 80,
  numParcelas: 6,
};

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

  /** Preenchido só quando o documento é o aditivo de dependência. */
  aditivo?: DadosAditivo;
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

// ===========================================================================
//  ACESSO AO BANCO
//  Depende das tabelas criadas por supabase/16_contratos.sql. Se aquele
//  script ainda não tiver sido rodado, tudo abaixo devolve o padrão de
//  fábrica e o portal continua funcionando normalmente.
// ===========================================================================

import { supabase } from './supabase';
import { CLAUSULAS_PRESENCIAL, CLAUSULAS_EAD } from './contratoTextos';
import type { ClausulaContrato } from './contratoTextos';

/** Texto que vale hoje: o editado no banco, ou o padrão de fábrica. */
export async function carregarClausulas(
  modalidade: ModalidadeContrato
): Promise<{ clausulas: ClausulaContrato[]; editado: boolean; erro?: string }> {
  const padrao = modalidade === 'EAD' ? CLAUSULAS_EAD : CLAUSULAS_PRESENCIAL;

  const { data, error } = await supabase
    .from('contratos_modelos')
    .select('clausulas')
    .eq('modalidade', modalidade)
    .maybeSingle();

  if (error) {
    console.warn('[Contratos] Usando o texto padrão:', error.message);
    return { clausulas: padrao, editado: false };
  }
  if (!data?.clausulas || !Array.isArray(data.clausulas) || data.clausulas.length === 0) {
    return { clausulas: padrao, editado: false };
  }
  return { clausulas: data.clausulas as ClausulaContrato[], editado: true };
}

export async function salvarClausulas(
  modalidade: ModalidadeContrato,
  clausulas: ClausulaContrato[],
  editadoPor?: string
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('contratos_modelos').upsert(
    {
      modalidade,
      clausulas,
      editado_por: editadoPor ?? null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'modalidade' }
  );
  if (error) {
    if (error.message.includes('does not exist')) {
      return { erro: 'A tabela de modelos ainda não existe. Rode supabase/16_contratos.sql no Supabase.' };
    }
    return { erro: error.message };
  }
  return {};
}

/** Volta o modelo ao texto original, apagando a versão editada. */
export async function restaurarPadrao(modalidade: ModalidadeContrato): Promise<{ erro?: string }> {
  const { error } = await supabase.from('contratos_modelos').delete().eq('modalidade', modalidade);
  if (error) return { erro: error.message };
  return {};
}

/** Registra no histórico o que foi impresso. Falha aqui não impede imprimir. */
export async function registrarEmissao(
  d: DadosContrato,
  extras: {
    matricula?: string;
    turmaNome?: string;
    emitidoPor?: string;
    temAditivoDependencia?: boolean;
    aditivoValorParcela?: number;
    aditivoNumParcelas?: number;
  } = {}
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('contratos_emitidos').insert({
    aluno_id: d.alunoId ?? null,
    aluno_nome: d.alunoNome,
    aluno_matricula: extras.matricula ?? null,
    curso_nome: d.cursoNome ?? null,
    turma_nome: extras.turmaNome ?? null,
    modulo: Number(d.modulo) || null,
    contratante_nome: d.contratanteNome,
    cpf: d.cpf ?? null,
    modalidade: d.modalidade,
    ano: d.ano,
    valor_total: d.valorTotal,
    entrada: d.entrada,
    num_parcelas: d.numParcelas,
    valor_parcela: d.valorParcela,
    tem_aditivo_dependencia: extras.temAditivoDependencia ?? false,
    aditivo_valor_parcela: extras.aditivoValorParcela ?? null,
    aditivo_num_parcelas: extras.aditivoNumParcelas ?? null,
    emitido_por: extras.emitidoPor ?? null,
    data_contrato: d.dataContrato,
  });
  if (error) {
    console.warn('[Contratos] Não deu para registrar no histórico:', error.message);
    return { erro: error.message };
  }
  return {};
}
