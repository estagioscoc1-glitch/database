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
  /** Quando verdadeiro, a vaga aparece no painel do aluno para inscrição. */
  inscricoesAbertas?: boolean;
  inscricoesAte?: string;
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
  inscricoesAbertas: !!v.inscricoes_abertas,
  inscricoesAte: v.inscricoes_ate ?? undefined,
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
/**
 * Grava as quatro notas do supervisor na vaga E, se a média fechar, já copia
 * para o histórico do aluno na hora — não espera o Fechar Vaga.
 *
 * POR QUE MUDOU: antes a nota só valia depois de fechar a vaga, e o intervalo
 * entre lançar e fechar gerava reclamação de demora. Agora vale na hora.
 *
 * O QUE ISSO MUDA NA PRÁTICA: uma vez copiada para o histórico, corrigir essa
 * nota deixa de ser "o supervisor lança de novo" — precisa passar por
 * corrigirNotaHistorico(), que só o administrador usa. O supervisor pode até
 * reabrir esta tela e mudar os campos, mas a correção no histórico é sempre
 * feita pelo admin, de propósito: nota de histórico não deve mudar sozinha
 * sem alguém da gestão saber.
 *
 * Fechar Vaga continua existindo, só que agora não copia nota nenhuma — serve
 * só para travar novas inclusões e liberar o recibo do supervisor.
 */
export async function lancarNotas(
  a: AlunoNaVaga, vaga: VagaEstagio, quem?: string
): Promise<{ erro?: string; foiParaOHistorico?: boolean }> {
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
  if (error) return { erro: explicar(error) };

  if (media === null) return { foiParaOHistorico: false };

  const nomeOficial = nomeOficialDoComponente(vaga.curso, vaga.componente);
  const { error: erroHist } = await supabase.from('estagios').upsert({
    id: `est_${a.alunoId}_${nomeOficial}`.replace(/[^\w-]/g, '_'),
    aluno_id: a.alunoId,
    componente: nomeOficial,
    carga_horaria: 0,
    local_realizado: vaga.localNome || null,
    professor_nome: vaga.supervisorNome || null,
    nota: media,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'aluno_id,componente' });

  // A nota da vaga já está gravada mesmo se isto falhar — o supervisor não
  // perde o trabalho. O admin fecha a diferença depois, na tela de correção.
  if (erroHist) return { erro: `Nota salva, mas não copiada ao histórico agora: ${explicar(erroHist)}. Feche a vaga para tentar de novo.`, foiParaOHistorico: false };
  return { foiParaOHistorico: true };
}

/**
 * CORREÇÃO DE NOTA JÁ LANÇADA NO HISTÓRICO — só o administrador usa.
 *
 * É o único caminho para mudar uma nota de estágio depois que ela já virou
 * histórico. O supervisor não tem este botão.
 */
export async function corrigirNotaHistorico(
  alunoId: string, componente: string, novaNota: number
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagios')
    .update({ nota: novaNota, atualizado_em: new Date().toISOString() })
    .eq('aluno_id', alunoId).eq('componente', componente);
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

// ================================================ ÁREA DO SUPERVISOR

/**
 * Descobre o cadastro de supervisor ligado ao usuário logado.
 * Devolve null quando a pessoa logada não é supervisor de estágio — nesse
 * caso a aba nem aparece no painel do professor.
 */
export async function meuCadastroSupervisor(usuarioId: string): Promise<Supervisor | null> {
  const { data, error } = await supabase
    .from('supervisores').select('*').eq('usuario_id', usuarioId).maybeSingle();
  if (error || !data) return null;
  return supDoBanco(data);
}

/**
 * As vagas do supervisor. Só as que ele PODE mexer.
 *
 * Vaga fechada NÃO aparece: o trabalho dele ali acabou, e mostrar uma lista
 * que só cresce a cada semestre atrapalharia achar a vaga do momento. O
 * histórico continua no banco e a secretaria vê tudo.
 */
export async function minhasVagas(supervisorId: string): Promise<{ lista: VagaEstagio[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_vagas')
    .select('*')
    .eq('supervisor_id', supervisorId)
    .in('situacao', ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_NOTAS'])
    .order('data_inicio', { ascending: false });
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(vagaDoBanco) };
}

/** Vincula um login existente ao cadastro do supervisor. */
export async function vincularUsuario(supervisorId: string, usuarioId: string): Promise<{ erro?: string }> {
  const { error } = await supabase
    .from('supervisores').update({ usuario_id: usuarioId }).eq('id', supervisorId);
  return error ? { erro: explicar(error) } : {};
}

// ================================================ RECIBOS E PAGAMENTO

export interface ReciboEstagio {
  id?: string;
  numero?: string;
  vagaId?: string;
  supervisorId?: string;
  supervisorNome: string;
  componente?: string;
  localNome?: string;
  qtdAlunos: number;
  valorPorAluno: number;
  valorTotal: number;
  competencia?: string;
  situacao: 'PENDENTE' | 'PAGO';
  pagoEm?: string;
  criadoEm?: string;

  /* Nomes dos alunos cobertos por este recibo, para a lista impressa. Vem da
     vaga no momento da emissão — se um aluno for tirado da vaga depois, o
     recibo já emitido não muda, porque o pagamento já foi feito com base
     nessa lista. */
  alunosNomes?: string[];
}

const reciboDoBanco = (r: any): ReciboEstagio => ({
  id: r.id, numero: r.numero, vagaId: r.vaga_id ?? undefined,
  supervisorId: r.supervisor_id ?? undefined, supervisorNome: r.supervisor_nome,
  componente: r.componente ?? '', localNome: r.local_nome ?? '',
  qtdAlunos: r.qtd_alunos ?? 0,
  valorPorAluno: Number(r.valor_por_aluno ?? 0),
  valorTotal: Number(r.valor_total ?? 0),
  competencia: r.competencia ?? '', situacao: r.situacao ?? 'PENDENTE',
  pagoEm: r.pago_em ?? undefined, criadoEm: r.criado_em,
  alunosNomes: Array.isArray(r.alunos_nomes) ? r.alunos_nomes : [],
});

export async function listarRecibos(): Promise<{ lista: ReciboEstagio[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_recibos').select('*').order('criado_em', { ascending: false });
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(reciboDoBanco) };
}

/** Número do recibo: REC-2026-0001. A coluna é única, então não duplica. */
export async function gerarNumeroRecibo(): Promise<string> {
  const ano = new Date().getFullYear();
  const { count } = await supabase
    .from('estagio_recibos').select('id', { count: 'exact', head: true })
    .like('numero', `REC-${ano}-%`);
  return `REC-${ano}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}

/**
 * Emite o recibo de uma vaga fechada.
 *
 * SÓ VAGA FECHADA GERA RECIBO. Enquanto a vaga está aberta o número de alunos
 * ainda pode mudar, e um recibo assinado com valor errado é problema.
 */
/**
 * Emite o recibo de uma vaga fechada, com o nome de cada aluno coberto.
 *
 * SÓ VAGA FECHADA GERA RECIBO. Enquanto a vaga está aberta o número de alunos
 * ainda pode mudar, e um recibo assinado com valor errado é problema.
 *
 * SAI JÁ COMO PAGO. O recibo é o próprio comprovante de pagamento ao
 * supervisor — não existe uma etapa de "vou pagar depois" entre emitir e
 * pagar. Se algum dia for preciso desfazer (recibo emitido por engano),
 * marcarReciboPago(id, false) volta para pendente.
 */
export async function emitirRecibo(
  v: VagaEstagio, nomesAlunos: string[], quem?: string
): Promise<{ erro?: string }> {
  if (v.situacao !== 'FECHADA') {
    return { erro: 'Só é possível emitir recibo de vaga fechada. Feche a vaga primeiro.' };
  }
  const numero = await gerarNumeroRecibo();
  const hoje = new Date();
  const qtdAlunos = nomesAlunos.length;
  const { error } = await supabase.from('estagio_recibos').insert({
    numero, vaga_id: v.id, supervisor_id: v.supervisorId,
    supervisor_nome: v.supervisorNome || '', componente: v.componente,
    local_nome: v.localNome, qtd_alunos: qtdAlunos,
    alunos_nomes: nomesAlunos,
    valor_por_aluno: v.valorPorAluno, valor_total: qtdAlunos * v.valorPorAluno,
    competencia: `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`,
    emitido_por: quem ?? null,
    situacao: 'PAGO',
    pago_em: hoje.toISOString().split('T')[0],
  });
  if (error) {
    if (error.code === '23505') return { erro: 'Esta vaga já tem recibo emitido.' };
    return { erro: explicar(error) };
  }
  return {};
}

/** Diz se a vaga já tem recibo emitido — para mostrar o selo de pago. */
export async function reciboDaVaga(vagaId: string): Promise<ReciboEstagio | null> {
  const { data } = await supabase
    .from('estagio_recibos').select('*').eq('vaga_id', vagaId).maybeSingle();
  return data ? reciboDoBanco(data) : null;
}

export async function marcarReciboPago(id: string, pago: boolean): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_recibos').update({
    situacao: pago ? 'PAGO' : 'PENDENTE',
    pago_em: pago ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

// ================================================ MODELOS E CRONOGRAMA

export interface ModeloEstagio {
  tipo: 'RECIBO' | 'DECLARACAO';
  titulo: string;
  paragrafos: string[];
}

export const MODELOS_ESTAGIO_PADRAO: ModeloEstagio[] = [
  {
    tipo: 'RECIBO',
    titulo: 'RECIBO DE PAGAMENTO — SUPERVISÃO DE ESTÁGIO',
    paragrafos: [
      'Recebi do COLÉGIO OSWALDO CRUZ LTDA, inscrito no CNPJ sob o nº 37.653.128/0001-64, a importância de {{VALOR_TOTAL}} ({{VALOR_EXTENSO}}), referente à supervisão de estágio curricular do componente {{COMPONENTE}}, realizado em {{LOCAL}}, com {{QTD_ALUNOS}} aluno(s), ao valor de {{VALOR_ALUNO}} por aluno.',
      'Para clareza firmo o presente recibo, dando plena e geral quitação do valor acima.',
    ],
  },
  {
    tipo: 'DECLARACAO',
    titulo: 'DECLARAÇÃO DE SUPERVISÃO DE ESTÁGIO',
    paragrafos: [
      'Declaramos para os devidos fins que {{SUPERVISOR}}, inscrito(a) no {{CONSELHO}} sob o nº {{REGISTRO}}, atuou como supervisor(a) de estágio curricular do componente {{COMPONENTE}}, realizado em {{LOCAL}}, no período de {{PERIODO}}, acompanhando {{QTD_ALUNOS}} aluno(s) desta instituição de ensino.',
    ],
  },
];

export async function carregarModeloEstagio(tipo: 'RECIBO' | 'DECLARACAO'): Promise<ModeloEstagio> {
  const padrao = MODELOS_ESTAGIO_PADRAO.find(m => m.tipo === tipo)!;
  const { data, error } = await supabase
    .from('estagio_modelos').select('*').eq('tipo', tipo).maybeSingle();
  if (error || !data || !Array.isArray(data.paragrafos) || data.paragrafos.length === 0) return padrao;
  return { tipo, titulo: data.titulo || padrao.titulo, paragrafos: data.paragrafos as string[] };
}

export async function salvarModeloEstagio(m: ModeloEstagio, quem?: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_modelos').upsert({
    tipo: m.tipo, titulo: m.titulo, paragrafos: m.paragrafos,
    editado_por: quem ?? null, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'tipo' });
  return error ? { erro: explicar(error) } : {};
}

export interface Cronograma {
  id?: string;
  periodo: string;
  titulo: string;
  conteudo: { titulo: string; texto: string }[];
  observacoes?: string;
  publicado: boolean;
}

const cronoDoBanco = (c: any): Cronograma => ({
  id: c.id, periodo: c.periodo, titulo: c.titulo,
  conteudo: Array.isArray(c.conteudo) ? c.conteudo : [],
  observacoes: c.observacoes ?? '', publicado: !!c.publicado,
});

export async function listarCronogramas(): Promise<{ lista: Cronograma[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_cronograma').select('*').order('periodo', { ascending: false });
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(cronoDoBanco) };
}

/** O que o aluno vê: só o publicado, e só o mais recente. */
export async function cronogramaPublicado(): Promise<Cronograma | null> {
  const { data, error } = await supabase
    .from('estagio_cronograma').select('*')
    .eq('publicado', true).order('periodo', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return cronoDoBanco(data);
}

export async function salvarCronograma(c: Cronograma, quem?: string): Promise<{ erro?: string }> {
  const linha: any = {
    periodo: c.periodo, titulo: c.titulo, conteudo: c.conteudo,
    observacoes: c.observacoes || null, publicado: c.publicado,
    criado_por: quem ?? null, atualizado_em: new Date().toISOString(),
  };
  if (c.id) linha.id = c.id;
  const { error } = await supabase.from('estagio_cronograma').upsert(linha, { onConflict: 'id' });
  return error ? { erro: explicar(error) } : {};
}

export async function apagarCronograma(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_cronograma').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

// ============================ LIGAÇÃO COM O HISTÓRICO DO ALUNO

export interface ResultadoTransferencia {
  copiados: number;
  semNota: number;
  jaExistiam: string[];
  erro?: string;
}

/**
 * COPIA AS NOTAS DA VAGA PARA O HISTÓRICO DO ALUNO.
 *
 * POR QUE ISTO EXISTE:
 * A vaga guarda as notas em estagio_vaga_alunos. Mas a Ficha Geral de Estágio
 * e o Histórico Escolar leem de OUTRA tabela, "estagios". Sem esta cópia, o
 * supervisor lançava a nota e a ficha do aluno continuava vazia — duas
 * verdades sobre o mesmo estágio.
 *
 * QUANDO ACONTECE: só ao FECHAR a vaga. É o momento em que a nota vira
 * definitiva. Antes disso ela ainda pode mudar, e o histórico não pode ficar
 * balançando junto.
 *
 * SEGURANÇA — três travas:
 *  1) Aluno SEM NOTA não é copiado. Copiar vazio apagaria um lançamento
 *     anterior feito à mão pela secretaria.
 *  2) A chave da tabela de destino é aluno + componente, então fechar a vaga
 *     duas vezes não duplica nada: a segunda vez apenas regrava o mesmo valor.
 *  3) Devolve a lista de quem JÁ TINHA nota lançada antes, para a coordenação
 *     saber o que foi sobrescrito em vez de descobrir depois.
 */
export async function copiarNotasParaHistorico(
  vaga: VagaEstagio,
  alunos: AlunoNaVaga[]
): Promise<ResultadoTransferencia> {
  const comNota = alunos.filter(a => mediaDoAluno(a) !== null);
  const semNota = alunos.length - comNota.length;
  if (comNota.length === 0) return { copiados: 0, semNota, jaExistiam: [] };

  // Quem já tinha lançamento neste componente, para avisar a coordenação.
  const { data: existentes } = await supabase
    .from('estagios')
    .select('aluno_id, nota')
    .eq('componente', vaga.componente)
    .in('aluno_id', comNota.map(a => a.alunoId));

  const jaExistiam = (existentes ?? [])
    .filter((e: any) => e.nota !== null && e.nota !== undefined)
    .map((e: any) => comNota.find(a => a.alunoId === e.aluno_id)?.alunoNome || e.aluno_id);

  const linhas = comNota.map(a => ({
    // Mesmo formato de id que o repositório usa, para não criar linha paralela.
    id: `est_${a.alunoId}_${vaga.componente}`.replace(/[^\w-]/g, '_'),
    aluno_id: a.alunoId,
    componente: vaga.componente,
    carga_horaria: 0,
    local_realizado: vaga.localNome || null,
    professor_nome: vaga.supervisorNome || null,
    nota: mediaDoAluno(a),
    atualizado_em: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('estagios').upsert(linhas, { onConflict: 'aluno_id,componente' });

  if (error) return { copiados: 0, semNota, jaExistiam, erro: explicar(error) };
  return { copiados: linhas.length, semNota, jaExistiam };
}

// ============================================== INSCRIÇÃO DO ALUNO

export interface InscricaoEstagio {
  id?: string;
  vagaId: string;
  alunoId: string;
  alunoNome: string;
  alunoMatricula?: string;
  situacao: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  motivoRecusa?: string;
  criadoEm?: string;
}

const inscDoBanco = (i: any): InscricaoEstagio => ({
  id: i.id, vagaId: i.vaga_id, alunoId: i.aluno_id, alunoNome: i.aluno_nome,
  alunoMatricula: i.aluno_matricula ?? '', situacao: i.situacao ?? 'PENDENTE',
  motivoRecusa: i.motivo_recusa ?? '', criadoEm: i.criado_em,
});

/** Vagas que o aluno pode ver e se inscrever. */
export async function vagasAbertasParaInscricao(): Promise<{ lista: VagaEstagio[]; erro?: string }> {
  const hoje = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('estagio_vagas').select('*')
    .eq('inscricoes_abertas', true)
    .neq('situacao', 'FECHADA')
    .or(`inscricoes_ate.is.null,inscricoes_ate.gte.${hoje}`)
    .order('data_inicio', { ascending: true });
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(vagaDoBanco) };
}

export async function minhasInscricoes(alunoId: string): Promise<{ lista: InscricaoEstagio[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_inscricoes').select('*').eq('aluno_id', alunoId);
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(inscDoBanco) };
}

export async function inscreverSe(i: InscricaoEstagio): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_inscricoes').insert({
    vaga_id: i.vagaId, aluno_id: i.alunoId, aluno_nome: i.alunoNome,
    aluno_matricula: i.alunoMatricula || null,
  });
  if (error) {
    if (error.code === '23505') return { erro: 'Você já se inscreveu nesta vaga.' };
    if (error.code === '42501') return { erro: 'As inscrições desta vaga não estão abertas ou o prazo terminou.' };
    return { erro: explicar(error) };
  }
  return {};
}

export async function cancelarInscricao(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_inscricoes').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

export async function listarInscricoesDaVaga(vagaId: string): Promise<{ lista: InscricaoEstagio[]; erro?: string }> {
  const { data, error } = await supabase
    .from('estagio_inscricoes').select('*').eq('vaga_id', vagaId).order('criado_em');
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(inscDoBanco) };
}

/**
 * Aprovar a inscrição inclui o aluno na vaga de verdade.
 *
 * As duas coisas andam juntas de propósito: aprovar sem incluir deixaria o
 * aluno achando que está no estágio sem estar na lista do supervisor.
 */
export async function aprovarInscricao(i: InscricaoEstagio, quem?: string): Promise<{ erro?: string }> {
  const r = await incluirAlunoNaVaga({
    vagaId: i.vagaId, alunoId: i.alunoId, alunoNome: i.alunoNome,
    alunoMatricula: i.alunoMatricula,
    notaConhecimento: null, notaHabilidade: null, notaAtitudes: null, notaValores: null,
    resultado: 'PENDENTE',
  });
  // "Já está na vaga" não é erro aqui: significa que a inclusão já aconteceu.
  if (r.erro && !r.erro.includes('já está')) return { erro: r.erro };

  const { error } = await supabase.from('estagio_inscricoes').update({
    situacao: 'APROVADA', analisado_por: quem ?? null,
    analisado_em: new Date().toISOString(),
  }).eq('id', i.id);
  return error ? { erro: explicar(error) } : {};
}

export async function recusarInscricao(id: string, motivo: string, quem?: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_inscricoes').update({
    situacao: 'RECUSADA', motivo_recusa: motivo || null,
    analisado_por: quem ?? null, analisado_em: new Date().toISOString(),
  }).eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

export async function abrirInscricoes(
  vagaId: string, abertas: boolean, ate?: string
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('estagio_vagas').update({
    inscricoes_abertas: abertas, inscricoes_ate: ate || null,
  }).eq('id', vagaId);
  return error ? { erro: explicar(error) } : {};
}

/**
 * Grava a ficha do supervisor na tabela de professores, DIRETO no banco.
 *
 * POR QUE ISTO EXISTE:
 * A primeira versão usava addUser, que só põe a pessoa na lista em memória e
 * espera uma sincronização em segundo plano levar ao banco. A criação da
 * conta, porém, exige a ficha JÁ gravada — ela procura por até 20 segundos e
 * desiste. Na prática dava sempre "a ficha do professor ainda não chegou ao
 * banco de dados".
 *
 * Gravando direto, a ficha existe antes de a conta ser pedida. Sem espera,
 * sem corrida entre as duas coisas.
 */
export async function criarFichaDeProfessor(
  fichaId: string,
  s: Supervisor
): Promise<{ erro?: string }> {
  const { error } = await supabase.from('professores').upsert({
    id: fichaId,
    nome: s.nome,
    cpf: s.cpf || null,
    rg: s.rg || null,
    email: s.email || null,
    telefone: s.telefone || null,
    conselho: s.conselho || null,
    conselho_numero: s.registro || null,
    // Marca de onde veio, para a secretaria saber que não é professor de sala.
    tipo_professor: 'SUPERVISOR DE ESTAGIO',
    situacao: 'ATIVO',
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) return { erro: explicar(error) };
  return {};
}

/**
 * Acha o identificador REAL do login recém-criado.
 *
 * POR QUE ISTO EXISTE:
 * A primeira versão vinculava o supervisor ao id da FICHA de professor
 * (`sup_xxx`). Só que a regra de segurança compara com o id do LOGIN, que é
 * outro número — um uuid gerado pelo Supabase. Como nunca batiam, o banco
 * devolvia vazio ao supervisor consultar o próprio cadastro, e o portal
 * concluía que ele era professor comum, mostrando o diário inteiro.
 *
 * Busca pelo login porque é o único dado que conhecemos com certeza logo
 * após a criação da conta.
 */
export async function idDoLogin(login: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('usuarios').select('id').eq('login', login).maybeSingle();
  if (error || !data) return null;
  return (data as any).id as string;
}
