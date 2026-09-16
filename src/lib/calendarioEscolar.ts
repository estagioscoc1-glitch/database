/**
 * CALENDÁRIO ESCOLAR — acesso ao banco.
 *
 * Depende da tabela criada por supabase/15_calendario_escolar.sql.
 *
 * Um registro = um ano + semestre inteiro (ex: 2026/2), com todos os meses,
 * os dias marcados (início das aulas, feriados, avaliações) e as anotações
 * gerais — no mesmo formato do modelo em PDF que a secretaria já usa.
 *
 * O campo `publicado` decide se o coordenador enxerga no Painel Docente.
 * A direção pode preencher e salvar em rascunho (publicado = false) por
 * quanto tempo quiser, e só revelar quando decidir.
 */

import { supabase, supabaseConfigurado } from './supabase';

export interface ResultadoGravacao {
  ok: boolean;
  erro?: string;
}

export type TipoDiaCalendario = 'inicio' | 'feriado' | 'avaliacao';

export interface DiaMarcadoCalendario {
  dia: number;                // 1–31
  tipo: TipoDiaCalendario;    // início das aulas (verde) | feriado/destaque (laranja) | avaliação (cinza)
  rotulo?: string;            // ex: "DEP" — mostrado colado no dia, só faz sentido para "avaliacao"
  legenda?: string;           // ex: "Independência do Brasil" — vira nota abaixo do mês
}

export interface MesCalendario {
  ano: number;
  mes: number;                // 1–12
  diasLetivos: number;
  diasMarcados: DiaMarcadoCalendario[];
}

export interface AnotacaoCalendario {
  texto: string;
}

export interface CalendarioEscolarDados {
  meses: MesCalendario[];
  anotacoes: AnotacaoCalendario[];
  fraseRodape?: string;
}

export interface CalendarioEscolarRegistro {
  id?: string;
  ano: number;
  semestre: 1 | 2;
  dados: CalendarioEscolarDados;
  publicado: boolean;
  atualizadoEm?: string;
}

export const NOMES_MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const FRASE_RODAPE_PADRAO = 'A educação é a arma mais poderosa para transformar o mundo.';

/** Faixa de meses padrão de cada semestre — só o ponto de partida, dá pra adicionar/remover mês na tela. */
function mesesDoSemestre(semestre: 1 | 2): number[] {
  return semestre === 2 ? [8, 9, 10, 11, 12] : [2, 3, 4, 5, 6, 7];
}

/** Monta um calendário em branco para começar a preencher um ano/semestre novo. */
export function calendarioEmBranco(ano: number, semestre: 1 | 2): CalendarioEscolarDados {
  return {
    meses: mesesDoSemestre(semestre).map(mes => ({ ano, mes, diasLetivos: 0, diasMarcados: [] })),
    anotacoes: [],
    fraseRodape: FRASE_RODAPE_PADRAO,
  };
}

/** Carrega o calendário de um ano/semestre específico (tela de edição da direção). */
export async function carregarCalendarioEscolar(
  ano: number,
  semestre: 1 | 2
): Promise<CalendarioEscolarRegistro | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('calendario_escolar')
    .select('id, ano, semestre, dados, publicado, atualizado_em')
    .eq('ano', ano)
    .eq('semestre', semestre)
    .maybeSingle();

  if (error) {
    console.warn('[Banco] carregar calendário escolar:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: (data as any).id,
    ano: (data as any).ano,
    semestre: (data as any).semestre,
    dados: (data as any).dados,
    publicado: (data as any).publicado,
    atualizadoEm: (data as any).atualizado_em,
  };
}

/** Lista todos os ano/semestre já preenchidos, do mais recente para o mais antigo (para o seletor da tela). */
export async function listarCalendariosEscolares(): Promise<
  Array<{ ano: number; semestre: 1 | 2; publicado: boolean }>
> {
  if (!supabaseConfigurado) return [];

  const { data, error } = await supabase
    .from('calendario_escolar')
    .select('ano, semestre, publicado')
    .order('ano', { ascending: false })
    .order('semestre', { ascending: false });

  if (error) {
    console.warn('[Banco] listar calendários escolares:', error.message);
    return [];
  }
  return (data ?? []).map((d: any) => ({ ano: d.ano, semestre: d.semestre, publicado: d.publicado }));
}

/** Salva (cria ou atualiza) o calendário de um ano/semestre. Não mexe em `publicado` — use alternarPublicacao para isso. */
export async function salvarCalendarioEscolar(
  registro: CalendarioEscolarRegistro
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { error } = await supabase.from('calendario_escolar').upsert(
    {
      ano: registro.ano,
      semestre: registro.semestre,
      dados: registro.dados,
      publicado: registro.publicado,
    },
    { onConflict: 'ano,semestre' }
  );

  if (error) {
    console.error('[Banco] salvar calendário escolar:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/** Liga/desliga a visibilidade para o coordenador, sem precisar reenviar o calendário inteiro. */
export async function alternarPublicacaoCalendarioEscolar(
  ano: number,
  semestre: 1 | 2,
  publicado: boolean
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { error } = await supabase
    .from('calendario_escolar')
    .update({ publicado })
    .eq('ano', ano)
    .eq('semestre', semestre);

  if (error) {
    console.error('[Banco] publicar/ocultar calendário escolar:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/**
 * Carrega o calendário publicado mais recente — é o que o coordenador vê no
 * Painel Docente. Volta `null` se a direção ainda não publicou nenhum.
 */
export async function carregarCalendarioPublicado(): Promise<CalendarioEscolarRegistro | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('calendario_escolar')
    .select('id, ano, semestre, dados, publicado, atualizado_em')
    .eq('publicado', true)
    .order('ano', { ascending: false })
    .order('semestre', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[Banco] carregar calendário publicado:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: (data as any).id,
    ano: (data as any).ano,
    semestre: (data as any).semestre,
    dados: (data as any).dados,
    publicado: (data as any).publicado,
    atualizadoEm: (data as any).atualizado_em,
  };
}

/** Soma os dias letivos de todos os meses do calendário. */
export function totalDiasLetivos(dados: CalendarioEscolarDados): number {
  return dados.meses.reduce((soma, mes) => soma + (mes.diasLetivos || 0), 0);
}
