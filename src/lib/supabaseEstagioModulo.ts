/**
 * MÓDULO DE ESTÁGIO — acesso ao banco.
 *
 * Depende das tabelas criadas por supabase/24_estagios_modulo.sql.
 *
 * IMPORTANTE: esta é a camada NOVA, ligada ao banco de verdade. Não confundir
 * com o EstagiosManager antigo, dentro de Movimentação, que guarda tudo no
 * localStorage — ou seja, só no navegador de quem lançou. Aquela tela e esta
 * não conversam entre si.
 */

import { supabase } from './supabase';

export interface Supervisor {
  id?: string;
  nome: string;
  cpf?: string;
  rg?: string;
  conselho?: string;
  registro?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  chavePix?: string;
  usuarioId?: string;
  ativo: boolean;
  observacoes?: string;
}

export interface LocalEstagio {
  id?: string;
  nome: string;
  tipo?: string;
  cnpj?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  telefone?: string;
  responsavel?: string;
  capacidade?: number;
  convenioAte?: string;
  ativo: boolean;
  observacoes?: string;
}

export interface EstagioCatalogo {
  id?: string;
  curso: string;
  componente: string;
  cargaHoraria: number;
  valorPorAluno: number;
  ordem: number;
  compConhecimento: string[];
  compHabilidade: string[];
  compAtitudes: string[];
  compValores: string[];
  ativo: boolean;
}

export const TIPOS_LOCAL = ['HOSPITAL', 'CLINICA', 'UBS', 'CAIS', 'ESCOLA', 'OUTRO'];
export const CURSOS_ESTAGIO = ['ENFERMAGEM', 'RADIOLOGIA', 'SEGURANCA', 'INSTRUMENTACAO'];

/** Traduz o erro cru do banco para uma frase que a secretaria entende. */
function explicar(e: { message?: string; code?: string }): string {
  const m = e?.message || '';
  if (m.includes('does not exist') || e?.code === '42P01') {
    return 'As tabelas do módulo de estágio ainda não existem. Rode supabase/24_estagios_modulo.sql no Supabase.';
  }
  if (e?.code === '42501' || m.includes('row-level security')) {
    return 'Seu usuário não tem permissão. Só Administração e Secretaria mexem aqui.';
  }
  if (e?.code === '23505') return 'Já existe um registro igual a esse.';
  return m;
}

// ------------------------------------------------------------ SUPERVISORES

const supDoBanco = (s: any): Supervisor => ({
  id: s.id, nome: s.nome, cpf: s.cpf ?? '', rg: s.rg ?? '',
  conselho: s.conselho ?? '', registro: s.registro ?? '',
  telefone: s.telefone ?? '', email: s.email ?? '', endereco: s.endereco ?? '',
  banco: s.banco ?? '', agencia: s.agencia ?? '', conta: s.conta ?? '',
  chavePix: s.chave_pix ?? '', usuarioId: s.usuario_id ?? undefined,
  ativo: s.ativo !== false, observacoes: s.observacoes ?? '',
});

export async function listarSupervisores(): Promise<{ lista: Supervisor[]; erro?: string }> {
  const { data, error } = await supabase.from('supervisores').select('*').order('nome');
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(supDoBanco) };
}

export async function salvarSupervisor(s: Supervisor): Promise<{ erro?: string }> {
  const linha: any = {
    nome: s.nome, cpf: s.cpf || null, rg: s.rg || null,
    conselho: s.conselho || null, registro: s.registro || null,
    telefone: s.telefone || null, email: s.email || null, endereco: s.endereco || null,
    banco: s.banco || null, agencia: s.agencia || null, conta: s.conta || null,
    chave_pix: s.chavePix || null, ativo: s.ativo,
    observacoes: s.observacoes || null, atualizado_em: new Date().toISOString(),
  };
  if (s.id) linha.id = s.id;
  const { error } = await supabase.from('supervisores').upsert(linha, { onConflict: 'id' });
  return error ? { erro: explicar(error) } : {};
}

export async function apagarSupervisor(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('supervisores').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

// ------------------------------------------------------------------ LOCAIS

const localDoBanco = (l: any): LocalEstagio => ({
  id: l.id, nome: l.nome, tipo: l.tipo ?? '', cnpj: l.cnpj ?? '',
  endereco: l.endereco ?? '', bairro: l.bairro ?? '', cidade: l.cidade ?? '',
  telefone: l.telefone ?? '', responsavel: l.responsavel ?? '',
  capacidade: l.capacidade ?? undefined, convenioAte: l.convenio_ate ?? '',
  ativo: l.ativo !== false, observacoes: l.observacoes ?? '',
});

export async function listarLocais(): Promise<{ lista: LocalEstagio[]; erro?: string }> {
  const { data, error } = await supabase.from('locais_estagio').select('*').order('nome');
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(localDoBanco) };
}

export async function salvarLocal(l: LocalEstagio): Promise<{ erro?: string }> {
  const linha: any = {
    nome: l.nome, tipo: l.tipo || null, cnpj: l.cnpj || null,
    endereco: l.endereco || null, bairro: l.bairro || null, cidade: l.cidade || null,
    telefone: l.telefone || null, responsavel: l.responsavel || null,
    capacidade: l.capacidade ?? null, convenio_ate: l.convenioAte || null,
    ativo: l.ativo, observacoes: l.observacoes || null,
  };
  if (l.id) linha.id = l.id;
  const { error } = await supabase.from('locais_estagio').upsert(linha, { onConflict: 'id' });
  return error ? { erro: explicar(error) } : {};
}

export async function apagarLocal(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('locais_estagio').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

// --------------------------------------------------------------- CATÁLOGO

const catDoBanco = (c: any): EstagioCatalogo => ({
  id: c.id, curso: c.curso, componente: c.componente,
  cargaHoraria: c.carga_horaria ?? 0,
  valorPorAluno: Number(c.valor_por_aluno ?? 0),
  ordem: c.ordem ?? 0,
  compConhecimento: Array.isArray(c.comp_conhecimento) ? c.comp_conhecimento : [],
  compHabilidade: Array.isArray(c.comp_habilidade) ? c.comp_habilidade : [],
  compAtitudes: Array.isArray(c.comp_atitudes) ? c.comp_atitudes : [],
  compValores: Array.isArray(c.comp_valores) ? c.comp_valores : [],
  ativo: c.ativo !== false,
});

export async function listarCatalogo(): Promise<{ lista: EstagioCatalogo[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagios_catalogo').select('*').order('curso').order('ordem');
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(catDoBanco) };
}

export async function salvarCatalogo(c: EstagioCatalogo): Promise<{ erro?: string }> {
  const linha: any = {
    curso: c.curso, componente: c.componente,
    carga_horaria: c.cargaHoraria, valor_por_aluno: c.valorPorAluno, ordem: c.ordem,
    comp_conhecimento: c.compConhecimento, comp_habilidade: c.compHabilidade,
    comp_atitudes: c.compAtitudes, comp_valores: c.compValores, ativo: c.ativo,
  };
  if (c.id) linha.id = c.id;
  const { error } = await supabase.from('estagios_catalogo').upsert(linha, { onConflict: 'id' });
  return error ? { erro: explicar(error) } : {};
}

export function formatarDinheiro(v: number): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================================================== VAGAS

export type SituacaoVaga = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_NOTAS' | 'FECHADA' | 'CANCELADA';

export const SITUACOES_VAGA: { valor: SituacaoVaga; rotulo: string; cor: string }[] = [
  { valor: 'ABERTA',           rotulo: 'Aberta',          cor: 'bg-slate-100 text-slate-700 border-slate-200' },
  { valor: 'EM_ANDAMENTO',     rotulo: 'Em andamento',    cor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { valor: 'AGUARDANDO_NOTAS', rotulo: 'Aguardando notas',cor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'FECHADA',          rotulo: 'Fechada',         cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { valor: 'CANCELADA',        rotulo: 'Cancelada',       cor: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export interface VagaEstagio {
  id?: string;
  codigo: string;
  catalogoId?: string;
  componente: string;
  curso?: string;
  supervisorId?: string;
  supervisorNome?: string;
  localId?: string;
  localNome?: string;
  turno?: string;
  dataInicio?: string;
  dataFim?: string;
  vagasTotal: number;
  situacao: SituacaoVaga;
  tokenAcesso?: string;
  valorPorAluno: number;
  fechadaEm?: string;
}

export interface AlunoNaVaga {
  id?: string;
  vagaId: string;
  alunoId: string;
  alunoNome: string;
  alunoMatricula?: string;
  notaConhecimento: number | null;
  notaHabilidade: number | null;
  notaAtitudes: number | null;
  notaValores: number | null;
  resultado: string;
  observacoes?: string;
  mensalidadeOk?: boolean;
  seguroOk?: boolean;
  kitOk?: boolean;
}

/**
 * Média da ficha: média das quatro competências.
 * Devolve null quando NENHUMA foi lançada, para a tela mostrar traço em vez
 * de zero — não lançado é diferente de nota zero.
 */
export function mediaDoAluno(a: AlunoNaVaga): number | null {
  const notas = [a.notaConhecimento, a.notaHabilidade, a.notaAtitudes, a.notaValores]
    .filter((n): n is number => n !== null && n !== undefined && !isNaN(n));
  if (notas.length === 0) return null;
  return notas.reduce((s, n) => s + n, 0) / notas.length;
}

/** Chave de acesso do supervisor. Aleatória, para não ser adivinhável. */
export function gerarToken(): string {
  const a = Math.random().toString(36).slice(2, 10);
  const b = Math.random().toString(36).slice(2, 10);
  return `${a}${b}`.toUpperCase();
}

const vagaDoBanco = (v: any): VagaEstagio => ({
  id: v.id, codigo: v.codigo, catalogoId: v.catalogo_id ?? undefined,
  componente: v.componente, curso: v.curso ?? undefined,
  supervisorId: v.supervisor_id ?? undefined, supervisorNome: v.supervisor_nome ?? '',
  localId: v.local_id ?? undefined, localNome: v.local_nome ?? '',
  turno: v.turno ?? '', dataInicio: v.data_inicio ?? '', dataFim: v.data_fim ?? '',
  vagasTotal: v.vagas_total ?? 0, situacao: (v.situacao ?? 'ABERTA') as SituacaoVaga,
  tokenAcesso: v.token_acesso ?? undefined,
  valorPorAluno: Number(v.valor_por_aluno ?? 0),
  fechadaEm: v.fechada_em ?? undefined,
});

export async function listarVagas(): Promise<{ lista: VagaEstagio[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_vagas').select('*').order('criado_em', { ascending: false });
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(vagaDoBanco) };
}

export async function salvarVaga(v: VagaEstagio): Promise<{ erro?: string; id?: string }> {
  const linha: any = {
    codigo: v.codigo, catalogo_id: v.catalogoId || null,
    componente: v.componente, curso: v.curso || null,
    supervisor_id: v.supervisorId || null, supervisor_nome: v.supervisorNome || null,
    local_id: v.localId || null, local_nome: v.localNome || null,
    turno: v.turno || null, data_inicio: v.dataInicio || null, data_fim: v.dataFim || null,
    vagas_total: v.vagasTotal, situacao: v.situacao,
    token_acesso: v.tokenAcesso || gerarToken(),
    valor_por_aluno: v.valorPorAluno,
  };
  if (v.id) linha.id = v.id;
  const { data, error } = await supabase
    .from('estagio_vagas').upsert(linha, { onConflict: 'id' }).select('id').single();
  if (error) return { erro: explicar(error) };
  return { id: data?.id };
}

export async function mudarSituacaoVaga(id: string, situacao: SituacaoVaga, quem?: string): Promise<{ erro?: string }> {
  const patch: any = { situacao };
  // Fechar registra data e autor. É o que autoriza gerar o recibo depois.
  if (situacao === 'FECHADA') {
    patch.fechada_em = new Date().toISOString();
    patch.fechada_por = quem ?? null;
  } else {
    patch.fechada_em = null;
    patch.fechada_por = null;
  }
  const { error } = await supabase.from('estagio_vagas').update(patch).eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

export async function apagarVaga(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_vagas').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

// -------------------------------------------------- ALUNOS DENTRO DA VAGA

const alunoDoBanco = (a: any): AlunoNaVaga => ({
  id: a.id, vagaId: a.vaga_id, alunoId: a.aluno_id, alunoNome: a.aluno_nome,
  alunoMatricula: a.aluno_matricula ?? '',
  notaConhecimento: a.nota_conhecimento === null ? null : Number(a.nota_conhecimento),
  notaHabilidade: a.nota_habilidade === null ? null : Number(a.nota_habilidade),
  notaAtitudes: a.nota_atitudes === null ? null : Number(a.nota_atitudes),
  notaValores: a.nota_valores === null ? null : Number(a.nota_valores),
  resultado: a.resultado ?? 'PENDENTE', observacoes: a.observacoes ?? '',
  mensalidadeOk: a.mensalidade_ok ?? undefined,
  seguroOk: a.seguro_ok ?? undefined,
  kitOk: a.kit_ok ?? undefined,
});

export async function listarAlunosDaVaga(vagaId: string): Promise<{ lista: AlunoNaVaga[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_vaga_alunos').select('*').eq('vaga_id', vagaId).order('aluno_nome');
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(alunoDoBanco) };
}

export async function incluirAlunoNaVaga(a: AlunoNaVaga): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_vaga_alunos').insert({
    vaga_id: a.vagaId, aluno_id: a.alunoId, aluno_nome: a.alunoNome,
    aluno_matricula: a.alunoMatricula || null,
    mensalidade_ok: a.mensalidadeOk ?? null,
    seguro_ok: a.seguroOk ?? null,
    kit_ok: a.kitOk ?? null,
  });
  if (error) {
    if (error.code === '23505') return { erro: 'Este aluno já está nesta vaga.' };
    return { erro: explicar(error) };
  }
  return {};
}

export async function removerAlunoDaVaga(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_vaga_alunos').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

/** Grava as quatro notas. Usada pela secretaria e pelo supervisor. */
export async function lancarNotas(a: AlunoNaVaga, quem?: string): Promise<{ erro?: string }> {
  const media = mediaDoAluno(a);
  const { error } = await supabase.from('estagio_vaga_alunos').update({
    nota_conhecimento: a.notaConhecimento,
    nota_habilidade: a.notaHabilidade,
    nota_atitudes: a.notaAtitudes,
    nota_valores: a.notaValores,
    // O resultado é calculado, não digitado: evita ficha e resumo divergirem.
    resultado: media === null ? 'PENDENTE' : media >= 6 ? 'APTO' : 'NÃO APTO',
    observacoes: a.observacoes || null,
    lancado_em: new Date().toISOString(),
    lancado_por: quem ?? null,
  }).eq('id', a.id);
  return error ? { erro: explicar(error) } : {};
}

export async function atualizarPreRequisitos(
  id: string, campos: { mensalidadeOk?: boolean; seguroOk?: boolean; kitOk?: boolean }
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_vaga_alunos').update({
    mensalidade_ok: campos.mensalidadeOk ?? null,
    seguro_ok: campos.seguroOk ?? null,
    kit_ok: campos.kitOk ?? null,
  }).eq('id', id);
  return error ? { erro: explicar(error) } : {};
}
