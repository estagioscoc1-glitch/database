import { supabase } from './supabase';

// ===========================================================================
//  ADITIVO DE CONTRATO — biblioteca
// ===========================================================================

function explicar(erro: any): string {
  const m = String(erro?.message || erro);
  if (m.includes('contrato_aditivo') && m.includes('does not exist')) {
    return 'O Aditivo de Contrato ainda não foi instalado no banco. Rode o arquivo 42_aditivo_contrato.sql no Supabase.';
  }
  return m;
}

export interface Aditivo {
  id: string;
  titulo: string;
  texto: string;
  ativo: boolean;
  criadoPor?: string;
  criadoEm: string;
  totalAssinaturas?: number;
  /** undefined = vale para todos os alunos. Preenchido = só para este aluno. */
  destinatarioAlunoId?: string;
  destinatarioAlunoNome?: string;
}

const aditivoDoBanco = (a: any): Aditivo => ({
  id: a.id, titulo: a.titulo, texto: a.texto, ativo: a.ativo,
  criadoPor: a.criado_por ?? undefined, criadoEm: a.criado_em,
  destinatarioAlunoId: a.destinatario_aluno_id ?? undefined,
  destinatarioAlunoNome: a.destinatario_aluno_nome ?? undefined,
});

/** Todos os aditivos, mais recentes primeiro — tela do admin. */
export async function listarTodosAditivos(): Promise<{ lista: Aditivo[]; erro?: string }> {
  const { data, error } = await supabase
    .from('contrato_aditivos').select('*').order('criado_em', { ascending: false });
  if (error) return { lista: [], erro: explicar(error) };

  const lista = (data ?? []).map(aditivoDoBanco);
  for (const a of lista) {
    const { count } = await supabase
      .from('contrato_aditivo_assinaturas').select('id', { count: 'exact', head: true }).eq('aditivo_id', a.id);
    a.totalAssinaturas = count ?? 0;
  }
  return { lista };
}

export async function criarAditivo(
  titulo: string, texto: string, quem: string,
  destinatario?: { alunoId: string; alunoNome: string }
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('contrato_aditivos').insert({
    titulo, texto, criado_por: quem,
    destinatario_aluno_id: destinatario?.alunoId || null,
    destinatario_aluno_nome: destinatario?.alunoNome || null,
  });
  return error ? { erro: explicar(error) } : {};
}

export async function ativarDesativarAditivo(id: string, ativo: boolean): Promise<{ erro?: string }> {
  const { error } = await supabase.from('contrato_aditivos').update({ ativo }).eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

/** Aditivos ativos que ESTE aluno ainda não assinou — para mostrar no painel dele. */
export async function aditivosPendentesDoAluno(alunoId: string): Promise<Aditivo[]> {
  // "or" traz os que valem para todos (destinatario_aluno_id vazio) JUNTO
  // com os que foram endereçados a este aluno específico.
  const { data: ativos, error } = await supabase
    .from('contrato_aditivos').select('*').eq('ativo', true)
    .or(`destinatario_aluno_id.is.null,destinatario_aluno_id.eq.${alunoId}`)
    .order('criado_em');
  if (error || !ativos || ativos.length === 0) return [];

  const { data: assinados } = await supabase
    .from('contrato_aditivo_assinaturas').select('aditivo_id').eq('aluno_id', alunoId);
  const idsAssinados = new Set((assinados ?? []).map((s: any) => s.aditivo_id));

  return ativos.filter((a: any) => !idsAssinados.has(a.id)).map(aditivoDoBanco);
}

export async function assinarAditivo(aditivoId: string, alunoId: string, alunoNome: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('contrato_aditivo_assinaturas').insert({
    aditivo_id: aditivoId, aluno_id: alunoId, aluno_nome: alunoNome,
  });
  if (error) {
    if (error.code === '23505') return {}; // já tinha assinado — não é erro
    return { erro: explicar(error) };
  }
  return {};
}

export async function listarAssinantesDoAditivo(aditivoId: string): Promise<{ alunoNome: string; assinadoEm: string }[]> {
  const { data } = await supabase
    .from('contrato_aditivo_assinaturas').select('aluno_nome, assinado_em')
    .eq('aditivo_id', aditivoId).order('assinado_em', { ascending: false });
  return (data ?? []).map((d: any) => ({ alunoNome: d.aluno_nome, assinadoEm: d.assinado_em }));
}
