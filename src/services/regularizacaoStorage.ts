import { supabase } from '../lib/supabase';
import { addFinancialAuditLog, explicarErroFinanceiro } from './financeiroStorage';

// ===========================================================================
//  REGULARIZAÇÃO FINANCEIRA RETROATIVA
//
//  Regras que este arquivo segue à risca, porque o pedido foi explícito:
//  - NUNCA mexe em financeiro_parcelas, financeiro_recibos ou qualquer
//    tabela do financeiro normal — regularização vive isolada, do lado.
//  - NUNCA presume pagamento sem dado — se não achar o aluno (por matrícula
//    OU nome) na base viva, a linha vai pro relatório como "não encontrado"
//    e NÃO é gravada.
//  - Toda gravação (normal ou retroativa) deixa rastro em
//    financeiro_status_alteracoes_log.
// ===========================================================================

export type TipoRegularizacao = 'PARCELA' | 'SEGURO' | 'KIT' | 'JALECO' | 'OUTRO';
export type StatusRegularizacao = 'PAGO' | 'PENDENTE';

export interface RegistroRegularizacao {
  id: string;
  alunoId: string;
  alunoMatricula: string;
  alunoNome: string;
  tipo: TipoRegularizacao;
  numeroParcela: number | null;
  competencia: string | null;
  status: StatusRegularizacao;
  dataPagamento: string | null;
  observacoes: string | null;
  origemPlanilha: string | null;
  criadoPor: string;
  criadoEm: string;
  atualizadoPor: string | null;
  atualizadoEm: string;
}

function linhaDoBanco(l: any): RegistroRegularizacao {
  return {
    id: l.id, alunoId: l.aluno_id, alunoMatricula: l.aluno_matricula, alunoNome: l.aluno_nome,
    tipo: l.tipo, numeroParcela: l.numero_parcela, competencia: l.competencia, status: l.status,
    dataPagamento: l.data_pagamento, observacoes: l.observacoes, origemPlanilha: l.origem_planilha,
    criadoPor: l.criado_por, criadoEm: l.criado_em, atualizadoPor: l.atualizado_por, atualizadoEm: l.atualizado_em,
  };
}

export async function listarRegularizacoes(): Promise<RegistroRegularizacao[]> {
  const { data, error } = await supabase.from('financeiro_regularizacao_retroativa').select('*').order('aluno_nome');
  if (error) { console.warn('[Regularização] listar:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(linhaDoBanco);
}

export async function listarRegularizacoesDoAluno(alunoId: string): Promise<RegistroRegularizacao[]> {
  const { data, error } = await supabase.from('financeiro_regularizacao_retroativa').select('*').eq('aluno_id', alunoId);
  if (error) { console.warn('[Regularização] listar do aluno:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map(linhaDoBanco);
}

/**
 * Importa em lote — SÓ grava as linhas que já vieram casadas com um aluno
 * de verdade (alunoId preenchido pelo cruzamento na tela). Nada de
 * inventar aluno nem gravar "meio encontrado".
 */
export async function importarRegularizacoesEmLote(
  registros: Array<{
    alunoId: string; alunoMatricula: string; alunoNome: string; tipo: TipoRegularizacao;
    numeroParcela?: number | null; competencia?: string | null; status: StatusRegularizacao;
    dataPagamento?: string | null; origemPlanilha?: string | null;
  }>,
  user: string
): Promise<{ ok: boolean; erro?: string; quantidadeImportada?: number }> {
  if (registros.length === 0) return { ok: true, quantidadeImportada: 0 };

  const linhas = registros.map(r => ({
    aluno_id: r.alunoId, aluno_matricula: r.alunoMatricula, aluno_nome: r.alunoNome,
    tipo: r.tipo, numero_parcela: r.numeroParcela ?? null, competencia: r.competencia ?? null,
    status: r.status, data_pagamento: r.dataPagamento ?? null, origem_planilha: r.origemPlanilha ?? null,
    criado_por: user,
  }));

  const { error, data } = await supabase.from('financeiro_regularizacao_retroativa').insert(linhas).select('id');
  if (error) return { ok: false, erro: explicarErroFinanceiro(error) };

  // Log de auditoria — uma linha por registro importado.
  for (const r of registros) {
    await registrarAlteracaoStatus({
      alunoId: r.alunoId, alunoNome: r.alunoNome, tipoRegistro: r.tipo,
      statusAnterior: null, statusNovo: r.status, competencia: r.competencia ?? null,
      numeroParcela: r.numeroParcela ?? null, dataPagamento: r.dataPagamento ?? null,
      origem: 'RETROATIVO', usuario: user, motivo: 'Importação em lote de regularização retroativa',
    });
  }

  await addFinancialAuditLog(user, 'REGULARIZACAO_RETROATIVA_IMPORTADA', `${registros.length} registro(s) de regularização retroativa importado(s).`);
  return { ok: true, quantidadeImportada: data?.length ?? registros.length };
}

/** Edição manual de um registro já importado — mês, parcela, status, data, tudo editável. */
export async function editarRegularizacao(
  id: string,
  campos: Partial<Pick<RegistroRegularizacao, 'tipo' | 'numeroParcela' | 'competencia' | 'status' | 'dataPagamento' | 'observacoes'>>,
  user: string
): Promise<boolean> {
  const { data: atual } = await supabase.from('financeiro_regularizacao_retroativa').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('financeiro_regularizacao_retroativa').update({
    ...(campos.tipo !== undefined ? { tipo: campos.tipo } : {}),
    ...(campos.numeroParcela !== undefined ? { numero_parcela: campos.numeroParcela } : {}),
    ...(campos.competencia !== undefined ? { competencia: campos.competencia } : {}),
    ...(campos.status !== undefined ? { status: campos.status } : {}),
    ...(campos.dataPagamento !== undefined ? { data_pagamento: campos.dataPagamento } : {}),
    ...(campos.observacoes !== undefined ? { observacoes: campos.observacoes } : {}),
    atualizado_por: user,
  }).eq('id', id);
  if (error) return false;

  if (atual && campos.status !== undefined && campos.status !== atual.status) {
    await registrarAlteracaoStatus({
      alunoId: atual.aluno_id, alunoNome: atual.aluno_nome, tipoRegistro: atual.tipo, registroId: id,
      statusAnterior: atual.status, statusNovo: campos.status,
      competencia: campos.competencia ?? atual.competencia, numeroParcela: campos.numeroParcela ?? atual.numero_parcela,
      dataPagamento: campos.dataPagamento ?? atual.data_pagamento, origem: 'RETROATIVO', usuario: user,
      motivo: 'Edição manual de registro de regularização',
    });
  }
  return true;
}

export async function excluirRegularizacao(id: string, user: string): Promise<boolean> {
  const { data: atual } = await supabase.from('financeiro_regularizacao_retroativa').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase.from('financeiro_regularizacao_retroativa').delete().eq('id', id);
  if (error) return false;
  if (atual) {
    await addFinancialAuditLog(user, 'REGULARIZACAO_EXCLUIDA', `Registro de regularização (${atual.tipo}) excluído para ${atual.aluno_nome}.`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// LOG DE AUDITORIA DE MUDANÇA DE STATUS (normal + retroativo)
// ---------------------------------------------------------------------------

export interface AlteracaoStatusLog {
  id: string; alunoId: string; alunoNome: string; tipoRegistro: string; registroId: string | null;
  statusAnterior: string | null; statusNovo: string; competencia: string | null; numeroParcela: number | null;
  dataPagamento: string | null; origem: 'NORMAL' | 'RETROATIVO'; usuario: string; quando: string; motivo: string | null;
}

export async function registrarAlteracaoStatus(params: {
  alunoId: string; alunoNome: string; tipoRegistro: string; registroId?: string;
  statusAnterior: string | null; statusNovo: string; competencia?: string | null; numeroParcela?: number | null;
  dataPagamento?: string | null; origem: 'NORMAL' | 'RETROATIVO'; usuario: string; motivo?: string;
}): Promise<void> {
  const { error } = await supabase.from('financeiro_status_alteracoes_log').insert({
    aluno_id: params.alunoId, aluno_nome: params.alunoNome, tipo_registro: params.tipoRegistro,
    registro_id: params.registroId ?? null, status_anterior: params.statusAnterior, status_novo: params.statusNovo,
    competencia: params.competencia ?? null, numero_parcela: params.numeroParcela ?? null,
    data_pagamento: params.dataPagamento ?? null, origem: params.origem, usuario: params.usuario,
    motivo: params.motivo ?? null,
  });
  if (error) console.warn('[Regularização] log de alteração:', explicarErroFinanceiro(error));
}

export async function listarLogAlteracoes(alunoId?: string): Promise<AlteracaoStatusLog[]> {
  let query = supabase.from('financeiro_status_alteracoes_log').select('*').order('quando', { ascending: false });
  if (alunoId) query = query.eq('aluno_id', alunoId);
  const { data, error } = await query;
  if (error) { console.warn('[Regularização] listar log:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map((l: any) => ({
    id: l.id, alunoId: l.aluno_id, alunoNome: l.aluno_nome, tipoRegistro: l.tipo_registro, registroId: l.registro_id,
    statusAnterior: l.status_anterior, statusNovo: l.status_novo, competencia: l.competencia, numeroParcela: l.numero_parcela,
    dataPagamento: l.data_pagamento, origem: l.origem, usuario: l.usuario, quando: l.quando, motivo: l.motivo,
  }));
}

// ---------------------------------------------------------------------------
// CONFIGURAÇÃO "MÓDULO/TURMA → QUAL PARCELA CAI EM QUAL MÊS"
// ---------------------------------------------------------------------------

export interface ConfigParcelaTurma {
  turmaId: string; turmaNome: string; competenciaReferencia: string; numeroParcelaReferencia: number;
}

export async function listarConfigParcelaTurma(): Promise<ConfigParcelaTurma[]> {
  const { data, error } = await supabase.from('financeiro_config_parcela_turma').select('*');
  if (error) { console.warn('[Regularização] config turma:', explicarErroFinanceiro(error)); return []; }
  return (data ?? []).map((l: any) => ({
    turmaId: l.turma_id, turmaNome: l.turma_nome,
    competenciaReferencia: l.competencia_referencia, numeroParcelaReferencia: l.numero_parcela_referencia,
  }));
}

export async function salvarConfigParcelaTurma(c: ConfigParcelaTurma, user: string): Promise<boolean> {
  const { error } = await supabase.from('financeiro_config_parcela_turma').upsert({
    turma_id: c.turmaId, turma_nome: c.turmaNome, competencia_referencia: c.competenciaReferencia,
    numero_parcela_referencia: c.numeroParcelaReferencia, atualizado_por: user,
  });
  return !error;
}

/**
 * Dado o mapa de referência de uma turma e uma competência qualquer,
 * calcula qual número de parcela cai nesse mês — pra frente ou pra trás.
 * Ex.: referência "09/2026" = parcela 7; pra "04/2026" (5 meses antes) dá
 * parcela 2; pra "01/2027" (4 meses depois) dá parcela 11.
 */
export function calcularNumeroParcela(config: ConfigParcelaTurma, competencia: string): number {
  const [mesRef, anoRef] = config.competenciaReferencia.split('/').map(Number);
  const [mesAlvo, anoAlvo] = competencia.split('/').map(Number);
  const diffMeses = (anoAlvo * 12 + mesAlvo) - (anoRef * 12 + mesRef);
  return config.numeroParcelaReferencia + diffMeses;
}

// ---------------------------------------------------------------------------
// VISIBILIDADE DA ABA FINANCEIRO NA ÁREA DO ALUNO
// ---------------------------------------------------------------------------

export type ModoVisibilidadeFinanceiro = 'OCULTO' | 'TODOS' | 'SELETIVO';

export async function getVisibilidadeConfig(): Promise<ModoVisibilidadeFinanceiro> {
  const { data, error } = await supabase.from('financeiro_visibilidade_config').select('modo').eq('id', 'default').maybeSingle();
  if (error || !data) return 'OCULTO';
  return data.modo;
}

export async function salvarVisibilidadeModo(modo: ModoVisibilidadeFinanceiro, user: string): Promise<boolean> {
  const { error } = await supabase.from('financeiro_visibilidade_config').upsert({ id: 'default', modo, atualizado_por: user });
  if (!error) await addFinancialAuditLog(user, 'VISIBILIDADE_FINANCEIRO_ALTERADA', `Modo de visibilidade da aba Financeiro do aluno alterado para: ${modo}.`);
  return !error;
}

export async function listarAlunosLiberados(): Promise<string[]> {
  const { data, error } = await supabase.from('financeiro_visibilidade_alunos').select('aluno_id');
  if (error) return [];
  return (data ?? []).map((l: any) => l.aluno_id);
}

export async function liberarAlunos(alunoIds: string[], user: string): Promise<boolean> {
  if (alunoIds.length === 0) return true;
  const linhas = alunoIds.map(id => ({ aluno_id: id, liberado_por: user }));
  const { error } = await supabase.from('financeiro_visibilidade_alunos').upsert(linhas);
  if (!error) await addFinancialAuditLog(user, 'FINANCEIRO_LIBERADO_ALUNOS', `Aba Financeiro liberada para ${alunoIds.length} aluno(s).`);
  return !error;
}

export async function ocultarAlunos(alunoIds: string[], user: string): Promise<boolean> {
  if (alunoIds.length === 0) return true;
  const { error } = await supabase.from('financeiro_visibilidade_alunos').delete().in('aluno_id', alunoIds);
  if (!error) await addFinancialAuditLog(user, 'FINANCEIRO_OCULTADO_ALUNOS', `Aba Financeiro ocultada para ${alunoIds.length} aluno(s).`);
  return !error;
}

/** O que a área do aluno chama pra decidir se mostra a aba ou não. */
export async function financeiroVisivelParaAluno(alunoId: string): Promise<boolean> {
  const modo = await getVisibilidadeConfig();
  if (modo === 'TODOS') return true;
  if (modo === 'OCULTO') return false;
  const liberados = await listarAlunosLiberados();
  return liberados.includes(alunoId);
}

/**
 * Seguro só vale por 1 ano a partir da data de pagamento — depois disso
 * conta como vencido de novo, mesmo estando marcado como "pago" no
 * registro. Usado tanto na sugestão automática de Vagas de Estágio quanto
 * na checagem de pré-requisito do próprio aluno.
 */
export function seguroAindaValido(dataPagamento: string | null, hoje: Date = new Date()): boolean {
  if (!dataPagamento) return false;
  const pago = new Date(dataPagamento + 'T00:00:00');
  const umAnoDepois = new Date(pago);
  umAnoDepois.setFullYear(umAnoDepois.getFullYear() + 1);
  return hoje <= umAnoDepois;
}

// ---------------------------------------------------------------------------
// CRUZAMENTO (matrícula → nome) — usado pela tela de importação
// ---------------------------------------------------------------------------

export interface ResultadoCruzamento<T> {
  encontradosPorMatricula: Array<T & { alunoId: string; alunoNomeSistema: string }>;
  encontradosPorNome: Array<T & { alunoId: string; alunoNomeSistema: string; matriculaOriginal: string }>;
  naoEncontrados: T[];
  nomesDuplicados: Array<{ nome: string; quantidade: number }>;
}

function normalizarNome(s: string): string {
  return (s || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z ]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');
}

export function cruzarComAlunosDoSistema<T extends { matricula: string; nome: string }>(
  registros: T[],
  alunosDoSistema: Array<{ id: string; enrollment?: string; name: string }>
): ResultadoCruzamento<T> {
  const porMatricula = new Map(alunosDoSistema.filter(a => a.enrollment).map(a => [a.enrollment as string, a]));
  const porNome = new Map<string, typeof alunosDoSistema>();
  alunosDoSistema.forEach(a => {
    const n = normalizarNome(a.name);
    if (!porNome.has(n)) porNome.set(n, []);
    (porNome.get(n) as any[]).push(a);
  });

  const encontradosPorMatricula: any[] = [];
  const encontradosPorNome: any[] = [];
  const naoEncontrados: T[] = [];
  const duplicadosSet = new Map<string, number>();

  for (const r of registros) {
    const porMat = porMatricula.get(r.matricula);
    if (porMat) {
      encontradosPorMatricula.push({ ...r, alunoId: porMat.id, alunoNomeSistema: porMat.name });
      continue;
    }
    const nomeNorm = normalizarNome(r.nome);
    const candidatos = (porNome.get(nomeNorm) as any[]) || [];
    if (candidatos.length === 1) {
      encontradosPorNome.push({ ...r, alunoId: candidatos[0].id, alunoNomeSistema: candidatos[0].name, matriculaOriginal: r.matricula });
    } else if (candidatos.length > 1) {
      duplicadosSet.set(nomeNorm, candidatos.length);
      naoEncontrados.push(r);
    } else {
      naoEncontrados.push(r);
    }
  }

  return {
    encontradosPorMatricula, encontradosPorNome, naoEncontrados,
    nomesDuplicados: Array.from(duplicadosSet.entries()).map(([nome, quantidade]) => ({ nome, quantidade })),
  };
}
