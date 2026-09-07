import { supabase, supabaseConfigurado } from './supabase';

// ===========================================================================
//  OBSERVAÇÕES SOBRE O ALUNO
//
//  Bilhetes datados presos à ficha. Qualquer setor escreve; só a gestão
//  apaga — observação é registro, e quem escreveu não deve poder sumir com
//  ela depois.
//
//  A observação marcada como BLOQUEIA ESTÁGIO impede o aluno de entrar em
//  vaga. A conferência é feita na hora de incluir, com o motivo na tela.
// ===========================================================================

export const SETORES_OBSERVACAO = [
  'ESTÁGIO', 'TESOURARIA', 'COORDENAÇÃO', 'SECRETARIA', 'DIREÇÃO',
] as const;

export interface ObservacaoAluno {
  id?: string;
  alunoId: string;
  texto: string;
  setor: string;
  bloqueiaEstagio: boolean;
  autorNome?: string;
  criadoEm?: string;
}

const daLinha = (o: any): ObservacaoAluno => ({
  id: o.id,
  alunoId: o.aluno_id,
  texto: o.texto ?? '',
  setor: o.setor ?? 'SECRETARIA',
  bloqueiaEstagio: !!o.bloqueia_estagio,
  autorNome: o.autor_nome ?? '',
  criadoEm: o.criado_em,
});

/** Mensagem em português para quando a tabela ainda não foi criada. */
function explicar(erro: any): string {
  const m = String(erro?.message || erro);
  if (m.includes('observacoes_aluno') && m.includes('does not exist')) {
    return 'A tabela de observações ainda não existe no banco. Rode o arquivo supabase/32_observacoes_aluno.sql no Supabase.';
  }
  return m;
}

/** Observações de um aluno, da mais recente para a mais antiga. */
export async function listarObservacoes(
  alunoId: string
): Promise<{ lista: ObservacaoAluno[]; erro?: string }> {
  if (!supabaseConfigurado) return { lista: [] };
  const { data, error } = await supabase
    .from('observacoes_aluno')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false });
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(daLinha) };
}

export async function criarObservacao(
  o: ObservacaoAluno
): Promise<{ erro?: string }> {
  if (!supabaseConfigurado) return { erro: 'O portal não está conectado ao banco de dados.' };
  const { error } = await supabase.from('observacoes_aluno').insert({
    aluno_id: o.alunoId,
    texto: o.texto.trim(),
    setor: o.setor,
    bloqueia_estagio: o.bloqueiaEstagio,
    autor_nome: o.autorNome || null,
  });
  return error ? { erro: explicar(error) } : {};
}

export async function excluirObservacao(id: string): Promise<{ erro?: string }> {
  if (!supabaseConfigurado) return { erro: 'O portal não está conectado ao banco de dados.' };
  const { data, error } = await supabase
    .from('observacoes_aluno').delete().eq('id', id).select('id');
  if (error) return { erro: explicar(error) };
  if (!data || data.length === 0) {
    return { erro: 'O banco não autorizou apagar — só a administração e a secretaria podem.' };
  }
  return {};
}

/**
 * Quantas observações cada aluno tem, e quais estão bloqueados.
 *
 * Uma consulta só para a lista inteira, em vez de uma por aluno: é o que
 * permite marcar o aviso na busca sem deixar a tela lenta.
 */
export async function resumoDasObservacoes(): Promise<
  Record<string, { total: number; bloqueado: boolean }>
> {
  if (!supabaseConfigurado) return {};
  const { data, error } = await supabase
    .from('observacoes_aluno')
    .select('aluno_id, bloqueia_estagio');
  if (error || !data) return {};

  const mapa: Record<string, { total: number; bloqueado: boolean }> = {};
  data.forEach((o: any) => {
    const atual = mapa[o.aluno_id] || { total: 0, bloqueado: false };
    mapa[o.aluno_id] = {
      total: atual.total + 1,
      bloqueado: atual.bloqueado || !!o.bloqueia_estagio,
    };
  });
  return mapa;
}

/**
 * O que impede este aluno de entrar em vaga de estágio.
 *
 * Devolve os textos das observações bloqueantes, para a tela dizer o motivo
 * em vez de só recusar. Lista vazia = pode entrar.
 */
export async function bloqueiosDeEstagio(alunoId: string): Promise<string[]> {
  if (!supabaseConfigurado) return [];
  const { data, error } = await supabase
    .from('observacoes_aluno')
    .select('texto, setor')
    .eq('aluno_id', alunoId)
    .eq('bloqueia_estagio', true);
  if (error || !data) return [];
  return data.map((o: any) => `${o.setor}: ${o.texto}`);
}
