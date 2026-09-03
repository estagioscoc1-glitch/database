/**
 * FICHA GERAL DE ESTÁGIO — dados e cálculos.
 *
 * COMO AS NOTAS FUNCIONAM AQUI:
 *
 * A ficha tem cinco colunas de nota por componente — conhecimento técnico,
 * habilidade técnica, atitudes pessoais, valores éticos e média final. Elas
 * NÃO são cinco notas diferentes: todas repetem a mesma nota que já foi
 * lançada naquele estágio, no módulo de Estágios do portal.
 *
 * É assim que a escola preenche na prática. Nas fichas que serviram de
 * modelo, a de Radiologia traz 8, 8, 8, 8, 8 na linha inteira e a de Saúde
 * Mental traz 9, 9, 9, 9, 9. Guardar cinco cópias do mesmo número no banco
 * só criaria chance de um dia divergirem entre si.
 *
 * A ÚNICA conta que o sistema faz é a média geral do estagiário, no pé da
 * ficha: média simples das notas dos componentes, sem peso por carga horária.
 *
 * Uma observação sobre as fichas antigas: a planilha da escola tinha um erro
 * de fórmula na média geral — dividia a soma das notas por 101 em vez de pelo
 * número de componentes, mostrando 8,2178 onde o correto era 8,30. Aqui a
 * conta é feita certa, então as médias podem sair levemente diferentes das
 * fichas antigas. É a correção, não uma divergência.
 */

import { supabase } from './supabase';

export interface ComponenteEstagio {
  componente: string;
  cargaHoraria: number;
  local: string;
  supervisor: string;
  supervisorRegistro: string;
  /** A nota lançada no estágio. É ela que se repete nas cinco colunas. */
  nota: number | null;
}

export interface ConfigFicha {
  resolucao: string;
  nomeSecretario: string;
  cargoSecretario: string;
  nomeCoordenacao: string;
  cargoCoordenacao: string;
  nomeDirecao: string;
  cargoDirecao: string;
  mediaParaAprovar: number;
}

export const CONFIG_PADRAO: ConfigFicha = {
  resolucao: 'Resolução CEE/GO nº 018/2022',
  nomeSecretario: 'Yan Neres da Silva',
  cargoSecretario: 'Secretário',
  nomeCoordenacao: 'Jefferson A. Machado B. de Castro',
  cargoCoordenacao: 'COREN-GO 683-492 ENF · Gerente de Estágio',
  nomeDirecao: 'Aldair Maia Santos dos Reis',
  cargoDirecao: 'Diretora',
  mediaParaAprovar: 6.0,
};

/** Resolução conhecida por curso — só sugestão inicial, é editável. */
export function resolucaoSugerida(nomeCurso?: string): string {
  const n = (nomeCurso || '').toUpperCase();
  if (n.includes('RADIOLOGIA')) return 'Resolução CEE 041/2022';
  return 'Resolução CEE/GO nº 018/2022';
}

/** Média geral: média simples dos componentes que já têm nota lançada. */
export function mediaGeral(cs: ComponenteEstagio[]): number | null {
  const notas = cs
    .map(c => c.nota)
    .filter((n): n is number => n !== null && n !== undefined && !isNaN(n));
  if (notas.length === 0) return null;
  return notas.reduce((s, n) => s + n, 0) / notas.length;
}

export function formatarNota(n: number | null): string {
  return n === null || n === undefined || isNaN(n) ? '—' : n.toFixed(1).replace('.', ',');
}

/** Nível descritivo que a ficha imprime no rodapé. */
export function nivelDaMedia(m: number | null): string {
  if (m === null) return '—';
  if (m < 4) return 'NÍVEL I';
  if (m < 6) return 'NÍVEL II';
  if (m < 8) return 'NÍVEL III';
  if (m < 9) return 'NÍVEL IV';
  return 'NÍVEL V';
}

// ------------------------------------------------------------------ BANCO

function linhaParaComponente(e: any): ComponenteEstagio {
  return {
    componente: e.componente || '',
    cargaHoraria: Number(e.carga_horaria ?? 0),
    local: e.local_realizado || '',
    supervisor: e.professor_nome || '',
    supervisorRegistro: e.supervisor_registro || '',
    nota: e.nota === null || e.nota === undefined ? null : Number(e.nota),
  };
}

export async function carregarEstagiosDoAluno(
  alunoId: string
): Promise<{ componentes: ComponenteEstagio[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagios')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('componente', { ascending: true });

  if (error) {
    const m = (error.message || '').toLowerCase();
    if (m.includes('does not exist')) {
      return { componentes: [], erro: 'A tabela de estágios ainda não existe no banco. Rode supabase/20_estagios.sql.' };
    }
    return { componentes: [], erro: error.message };
  }
  return { componentes: (data ?? []).map(linhaParaComponente) };
}

/** Grava o registro do supervisor no conselho (COREN, CRTR...). */
export async function salvarRegistroSupervisor(
  alunoId: string,
  componente: string,
  registro: string
): Promise<{ erro?: string }> {
  const { error } = await supabase
    .from('estagios')
    .update({ supervisor_registro: registro || null, atualizado_em: new Date().toISOString() })
    .eq('aluno_id', alunoId)
    .eq('componente', componente);

  if (error) {
    if ((error.message || '').includes('supervisor_registro')) {
      return { erro: 'A coluna do registro ainda não existe. Rode supabase/18_ficha_estagio.sql no Supabase.' };
    }
    return { erro: error.message };
  }
  return {};
}

export async function carregarConfig(cursoId?: string, nomeCurso?: string): Promise<ConfigFicha> {
  const base = { ...CONFIG_PADRAO, resolucao: resolucaoSugerida(nomeCurso) };
  if (!cursoId) return base;

  const { data, error } = await supabase
    .from('ficha_estagio_config')
    .select('*')
    .eq('curso_id', cursoId)
    .maybeSingle();

  if (error || !data) return base;
  return {
    resolucao: data.resolucao || base.resolucao,
    nomeSecretario: data.nome_secretario || base.nomeSecretario,
    cargoSecretario: data.cargo_secretario || base.cargoSecretario,
    nomeCoordenacao: data.nome_coordenacao || base.nomeCoordenacao,
    cargoCoordenacao: data.cargo_coordenacao || base.cargoCoordenacao,
    nomeDirecao: data.nome_direcao || base.nomeDirecao,
    cargoDirecao: data.cargo_direcao || base.cargoDirecao,
    mediaParaAprovar: Number(data.media_para_aprovar ?? base.mediaParaAprovar),
  };
}

export async function salvarConfig(cursoId: string, c: ConfigFicha): Promise<{ erro?: string }> {
  const { error } = await supabase.from('ficha_estagio_config').upsert(
    {
      curso_id: cursoId,
      resolucao: c.resolucao,
      nome_secretario: c.nomeSecretario,
      cargo_secretario: c.cargoSecretario,
      nome_coordenacao: c.nomeCoordenacao,
      cargo_coordenacao: c.cargoCoordenacao,
      nome_direcao: c.nomeDirecao,
      cargo_direcao: c.cargoDirecao,
      media_para_aprovar: c.mediaParaAprovar,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'curso_id' }
  );
  if (error) {
    if (error.message.includes('does not exist')) {
      return { erro: 'A tabela de configuração ainda não existe. Rode supabase/18_ficha_estagio.sql.' };
    }
    return { erro: error.message };
  }
  return {};
}
