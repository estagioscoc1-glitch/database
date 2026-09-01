/**
 * MENU REQUERIMENTOS — acesso ao banco de dados.
 *
 * Este arquivo é a ÚNICA porta entre a tela de Requerimentos e o Supabase.
 * A tela nunca fala com o banco direto: ela chama as funções daqui. Assim,
 * se algum dia a estrutura da tabela mudar, só este arquivo precisa mudar.
 *
 * Depende das tabelas criadas por supabase/15_requerimentos.sql. Se aquele
 * script ainda não tiver sido rodado no Supabase, as funções abaixo devolvem
 * lista vazia e escrevem um aviso no console — o resto do portal continua
 * funcionando normalmente.
 *
 * ATENÇÃO PRA QUANDO FOR PUBLICAR: este arquivo precisa existir dentro do
 * repositório, em src/lib/supabaseRequerimentos.ts. Já aconteceu de um
 * arquivo desta pasta ficar só no computador e nunca ser enviado, e o build
 * do Cloudflare falhar em silêncio por dias (foi o caso do
 * supabaseMatricula.ts). Confira o "Success" no Cloudflare Pages.
 */

import { supabase } from './supabase';

export type SituacaoRequerimento =
  | 'SOLICITADO'
  | 'EM_ANDAMENTO'
  | 'PRONTO'
  | 'ENTREGUE'
  | 'CANCELADO';

export const SITUACOES: { valor: SituacaoRequerimento; rotulo: string; cor: string }[] = [
  { valor: 'SOLICITADO',   rotulo: 'Solicitado',   cor: 'bg-slate-100 text-slate-700 border-slate-200' },
  { valor: 'EM_ANDAMENTO', rotulo: 'Em andamento', cor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'PRONTO',       rotulo: 'Pronto',       cor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { valor: 'ENTREGUE',     rotulo: 'Entregue',     cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { valor: 'CANCELADO',    rotulo: 'Cancelado',    cor: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export interface TipoRequerimento {
  id: string;
  nome: string;
  categoria: string;
  prazoDias: number;
  taxa: number;
  taxaObrigatoria: boolean;
  exigeCurso: boolean;
  observacao?: string;
  ativo: boolean;
  ordem: number;
}

export interface Requerimento {
  id: string;
  protocolo: string;
  alunoId?: string;
  alunoNome: string;
  alunoMatricula?: string;
  cursoNome?: string;
  tipoId?: string;
  tipoNome: string;
  situacao: SituacaoRequerimento;
  solicitadoEm: string;   // AAAA-MM-DD
  prazoEm?: string;
  entregueEm?: string;
  taxa: number;
  taxaPaga: boolean;
  observacoes?: string;
  atendente?: string;
}

/** Traduz o erro cru do Postgres pra uma frase que a secretaria entende. */
function explicar(erro: { message: string; code?: string }): string {
  const m = erro.message || '';
  if (m.includes('does not exist') || erro.code === '42P01') {
    return 'As tabelas de Requerimentos ainda não foram criadas no banco. Rode o arquivo supabase/15_requerimentos.sql no Supabase.';
  }
  if (erro.code === '42501' || m.includes('row-level security')) {
    return 'Seu usuário não tem permissão pra isso. Só Administração e Secretaria mexem em Requerimentos.';
  }
  if (erro.code === '23505') {
    return 'Já existe um registro com esse mesmo nome ou protocolo.';
  }
  return m;
}

// ---------------------------------------------------------------- TIPOS

function tipoDoBanco(t: any): TipoRequerimento {
  return {
    id: t.id,
    nome: t.nome,
    categoria: t.categoria ?? 'OUTROS',
    prazoDias: t.prazo_dias ?? 5,
    taxa: Number(t.taxa ?? 0),
    taxaObrigatoria: !!t.taxa_obrigatoria,
    exigeCurso: !!t.exige_curso,
    observacao: t.observacao ?? undefined,
    ativo: t.ativo !== false,
    ordem: t.ordem ?? 0,
  };
}

export async function listarTipos(): Promise<{ tipos: TipoRequerimento[]; erro?: string }> {
  const { data, error } = await supabase
    .from('requerimentos_tipos')
    .select('*')
    .order('ordem', { ascending: true });

  if (error) {
    console.warn('[Requerimentos] Falha ao carregar tipos:', error.message);
    return { tipos: [], erro: explicar(error) };
  }
  return { tipos: (data ?? []).map(tipoDoBanco) };
}

export async function salvarTipo(tipo: Partial<TipoRequerimento> & { nome: string }): Promise<{ erro?: string }> {
  const linha: any = {
    nome: tipo.nome,
    categoria: tipo.categoria ?? 'OUTROS',
    prazo_dias: tipo.prazoDias ?? 5,
    taxa: tipo.taxa ?? 0,
    taxa_obrigatoria: tipo.taxaObrigatoria ?? false,
    exige_curso: tipo.exigeCurso ?? false,
    observacao: tipo.observacao ?? null,
    ativo: tipo.ativo !== false,
    ordem: tipo.ordem ?? 0,
  };
  if (tipo.id) linha.id = tipo.id;

  const { error } = await supabase.from('requerimentos_tipos').upsert(linha, { onConflict: 'id' });
  if (error) return { erro: explicar(error) };
  return {};
}

export async function apagarTipo(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('requerimentos_tipos').delete().eq('id', id);
  if (error) return { erro: explicar(error) };
  return {};
}

// -------------------------------------------------------- REQUERIMENTOS

function requerimentoDoBanco(r: any): Requerimento {
  return {
    id: r.id,
    protocolo: r.protocolo,
    alunoId: r.aluno_id ?? undefined,
    alunoNome: r.aluno_nome,
    alunoMatricula: r.aluno_matricula ?? undefined,
    cursoNome: r.curso_nome ?? undefined,
    tipoId: r.tipo_id ?? undefined,
    tipoNome: r.tipo_nome,
    situacao: (r.situacao ?? 'SOLICITADO') as SituacaoRequerimento,
    solicitadoEm: r.solicitado_em,
    prazoEm: r.prazo_em ?? undefined,
    entregueEm: r.entregue_em ?? undefined,
    taxa: Number(r.taxa ?? 0),
    taxaPaga: !!r.taxa_paga,
    observacoes: r.observacoes ?? undefined,
    atendente: r.atendente ?? undefined,
  };
}

export async function listarRequerimentos(): Promise<{ lista: Requerimento[]; erro?: string }> {
  const { data, error } = await supabase
    .from('requerimentos')
    .select('*')
    .order('solicitado_em', { ascending: false })
    .limit(1000);

  if (error) {
    console.warn('[Requerimentos] Falha ao carregar pedidos:', error.message);
    return { lista: [], erro: explicar(error) };
  }
  return { lista: (data ?? []).map(requerimentoDoBanco) };
}

/**
 * Monta o número de protocolo: REQ-2026-0031.
 *
 * Conta quantos pedidos já existem no ano e soma 1. Não é à prova de duas
 * pessoas clicando no mesmo instante — por isso a coluna "protocolo" é UNIQUE
 * no banco: se acontecer, a segunda gravação é recusada em vez de gerar dois
 * pedidos com o mesmo número, e a tela tenta de novo.
 */
export async function gerarProtocolo(): Promise<string> {
  const ano = new Date().getFullYear();
  const { count } = await supabase
    .from('requerimentos')
    .select('id', { count: 'exact', head: true })
    .gte('solicitado_em', `${ano}-01-01`)
    .lte('solicitado_em', `${ano}-12-31`);

  const proximo = (count ?? 0) + 1;
  return `REQ-${ano}-${String(proximo).padStart(4, '0')}`;
}

/** Soma dias corridos a uma data AAAA-MM-DD e devolve no mesmo formato. */
export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(dataISO + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

export async function salvarRequerimento(req: Requerimento): Promise<{ erro?: string }> {
  const linha = {
    id: req.id,
    protocolo: req.protocolo,
    aluno_id: req.alunoId ?? null,
    aluno_nome: req.alunoNome,
    aluno_matricula: req.alunoMatricula ?? null,
    curso_nome: req.cursoNome ?? null,
    tipo_id: req.tipoId ?? null,
    tipo_nome: req.tipoNome,
    situacao: req.situacao,
    solicitado_em: req.solicitadoEm,
    prazo_em: req.prazoEm ?? null,
    entregue_em: req.entregueEm ?? null,
    taxa: req.taxa,
    taxa_paga: req.taxaPaga,
    observacoes: req.observacoes ?? null,
    atendente: req.atendente ?? null,
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase.from('requerimentos').upsert(linha, { onConflict: 'id' });
  if (error) return { erro: explicar(error) };
  return {};
}

export async function mudarSituacao(
  id: string,
  situacao: SituacaoRequerimento
): Promise<{ erro?: string }> {
  const patch: any = { situacao, atualizado_em: new Date().toISOString() };
  // Marcar como entregue grava a data sozinho; desmarcar limpa a data, senão
  // ficaria uma "data de entrega" num pedido que voltou pra fila.
  patch.entregue_em = situacao === 'ENTREGUE' ? new Date().toISOString().split('T')[0] : null;

  const { error } = await supabase.from('requerimentos').update(patch).eq('id', id);
  if (error) return { erro: explicar(error) };
  return {};
}

export async function marcarTaxaPaga(id: string, paga: boolean): Promise<{ erro?: string }> {
  const { error } = await supabase
    .from('requerimentos')
    .update({ taxa_paga: paga, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) return { erro: explicar(error) };
  return {};
}

export async function apagarRequerimento(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('requerimentos').delete().eq('id', id);
  if (error) return { erro: explicar(error) };
  return {};
}
