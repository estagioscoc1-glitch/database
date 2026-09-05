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
