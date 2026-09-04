/**
 * HISTÓRICO ESCOLAR — dados do aluno e acesso ao banco.
 *
 * O documento junta três origens:
 *  1) a ficha do aluno (nome, nascimento, naturalidade, filiação);
 *  2) a grade do curso, em src/lib/historicoTextos.ts, que diz quais
 *     disciplinas existem e em que módulo;
 *  3) as notas e faltas lançadas no portal.
 *
 * O cruzamento é feito PELO NOME da disciplina. Quando uma disciplina da
 * grade não tem nota lançada, ela sai com traço — igual aos modelos em
 * branco da escola — e no caso do histórico parcial sai como "À Cursar".
 */

import { supabase } from './supabase';
import type { ModeloHistorico } from './historicoTextos';

export type TipoHistorico = 'COMPLETO' | 'PARCIAL';

export interface LinhaHistorico {
  nome: string;
  ch: number;
  conceito: string;
  faltas: string;
  /**
   * Bloco "Aproveitamento de Estudos e/ou Dependência".
   * Quando o aluno fez a disciplina em dependência, a coluna CONCEITO recebe
   * "DEP" e é AQUI que entra o conceito obtido na dependência, com o ano e
   * semestre em que ela foi cursada. Quando foi dispensado por aproveitamento
   * de estudos, a coluna CONCEITO recebe "Ap. Est.".
   */
  apMfc: string;
  apAnoSemestre: string;
}

export interface DadosHistorico {
  alunoId?: string;
  alunoNome: string;
  dataNascimento?: string;
  naturalidade?: string;
  nomePai?: string;
  nomeMae?: string;

  tipo: TipoHistorico;
  /** Data em que concluiu o estágio. Vazio no parcial. */
  estagioConcluidoEm?: string;
  frequenciaObtida?: number;
  resultadoFinal: string;
  dataEmissao: string;

  nomeSecretario: string;
  cargoSecretario: string;
  nomeDirecao: string;
  cargoDirecao: string;

  /**
   * Resolução impressa no cabeçalho. Escolhida pela secretaria, porque o
   * histórico de aluno antigo tem que trazer a resolução vigente na época em
   * que ele cursou, e não a de hoje. Vazio usa a do modelo do curso.
   */
  resolucaoImpressa?: string;
}

export const ASSINANTES_PADRAO = {
  nomeSecretario: 'Yan Neres da Silva',
  cargoSecretario: 'Secretário',
  nomeDirecao: 'Aldair Maia Santos dos Reis',
  cargoDirecao: 'Diretora',
};

/** Soma a carga horária de todas as disciplinas da grade. */
export function cargaDasDisciplinas(m: ModeloHistorico): number {
  return m.modulos.reduce(
    (s, mod) => s + mod.disciplinas.reduce((t, d) => t + (d.ch || 0), 0),
    0
  );
}

/** Percentual de frequência, arredondado como a escola imprime. */
export function percentualFrequencia(obtida?: number, total?: number): string {
  if (!obtida || !total) return '----';
  return `${Math.round((obtida / total) * 100)}%`;
}

// ------------------------------------------------------------------ BANCO

/**
 * Notas do aluno, indexadas pelo ID DA DISCIPLINA.
 *
 * A tabela "notas" não guarda o nome da disciplina: ela aponta para um
 * diário, e é o diário que sabe qual disciplina é. Por isso a consulta faz o
 * caminho notas -> diarios -> disciplina_id. Quem traduz o id para o nome é
 * a tela, usando a lista de disciplinas que o portal já tem carregada.
 *
 * A nota final considerada é a PF (média final do componente). Quando ela
 * está vazia, usamos a AFC, que é o que a tela de notas mostra como
 * fechamento quando não houve prova final.
 */
export async function carregarNotasDoAluno(
  alunoId: string
): Promise<{ porDisciplina: Record<string, number | null>; erro?: string }> {
  const { data, error } = await supabase
    .from('notas')
    .select('pf, afc, diarios!inner(disciplina_id)')
    .eq('aluno_id', alunoId);

  if (error) {
    console.warn('[Histórico] Não deu para carregar as notas:', error.message);
    return { porDisciplina: {}, erro: error.message };
  }

  const porDisciplina: Record<string, number | null> = {};
  for (const n of (data ?? []) as any[]) {
    const d = Array.isArray(n.diarios) ? n.diarios[0] : n.diarios;
    const id = d?.disciplina_id;
    if (!id) continue;
    const valor = n.pf ?? n.afc;
    // Se o aluno cursou a mesma disciplina duas vezes (dependência), fica a
    // maior nota — é a que vale para o histórico.
    const nova = valor === null || valor === undefined ? null : Number(valor);
    const atual = porDisciplina[id];
    porDisciplina[id] = atual === null || atual === undefined ? nova
      : nova === null ? atual : Math.max(atual, nova);
  }
  return { porDisciplina };
}

/** Histórico das emissões, para conferência posterior. */
export async function registrarHistorico(
  d: DadosHistorico,
  cursoNome: string,
  emitidoPor?: string
): Promise<void> {
  const { error } = await supabase.from('historicos_emitidos').insert({
    aluno_id: d.alunoId ?? null,
    aluno_nome: d.alunoNome,
    curso_nome: cursoNome,
    tipo: d.tipo,
    resultado_final: d.resultadoFinal,
    emitido_por: emitidoPor ?? null,
    data_emissao: d.dataEmissao,
  });
  if (error) console.warn('[Histórico] Não deu para registrar no histórico:', error.message);
}
