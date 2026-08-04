/**
 * Gravação por linha nas tabelas do Supabase.
 *
 * Por que este arquivo existe:
 *
 * O sistema antigo mandava TODO o estado (todos os alunos, todas as notas,
 * todas as faltas) de uma vez, num único bloco. Isso causava dois problemas:
 *
 *   1. Estourava o limite de 1 MiB por documento do Firestore, e a falha era
 *      engolida — o professor via "salvo" e o dado não ia.
 *   2. Dois professores salvando ao mesmo tempo se sobrescreviam: quem
 *      salvasse por último apagava o lançamento do outro por completo.
 *
 * Aqui cada lançamento grava APENAS a sua linha (`upsert` com chave própria).
 * O professor A mexendo na nota do aluno X não toca na linha do professor B.
 */

import { supabase, supabaseConfigurado, chamarBancoDireto } from './supabase';
import type { GradeRecord, User, Course, ClassSection, Subject } from '../types';
import { UserRole } from '../types';

/* ==========================================================================
 * CONVERSORES entre o formato do front-end e o do banco
 * ========================================================================== */

/** 'NÃO APTO' -> 'NAO_APTO' (o banco usa enum sem acento nem espaço) */
function paraResultadoBanco(r?: string): string {
  // Normaliza antes de comparar: os mapas trazem "F. NOTA", "F.NOTA" e
  // "REP.FALTAS" com espaçamento variável. Sem isto qualquer variação caía no
  // padrão "PENDENTE" — o aluno reprovado por falta de nota aparecia como se
  // ainda não tivesse sido avaliado.
  const limpo = (r || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/\.\s*/g, ". ")
    .trim();

  switch (limpo) {
    case 'APTO': return 'APTO';
    case 'NÃO APTO':
    case 'NAO APTO': return 'NAO_APTO';
    case 'F. NOTA':
    case 'F NOTA': return 'F_NOTA';
    case 'REP. FALTAS':
    case 'REP FALTAS': return 'REP_FALTAS';
    case 'DISPENSADO': return 'DISPENSADO';
    case 'DESISTENTE': return 'DESISTENTE';
    default: return 'PENDENTE';
  }
}

/** Caminho inverso, para quando os dados voltam do banco. */
export function paraResultadoApp(r?: string): GradeRecord['result'] {
  switch (r) {
    case 'APTO': return 'APTO';
    case 'NAO_APTO': return 'NÃO APTO';
    case 'F_NOTA': return 'F. NOTA';
    case 'REP_FALTAS': return 'REP. FALTAS';
    case 'DISPENSADO': return 'DISPENSADO';
    case 'DESISTENTE': return 'DESISTENTE';
    default: return 'Pendente';
  }
}

/** 'SÁBADO' -> 'SABADO' */
function paraTurnoBanco(t?: string): string {
  const limpo = (t || 'MATUTINO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return ['MATUTINO', 'VESPERTINO', 'NOTURNO', 'SABADO', 'EAD'].includes(limpo) ? limpo : 'MATUTINO';
}

function paraSituacaoBanco(s?: string): string {
  const limpo = (s || 'ATIVO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return ['ATIVO', 'INATIVO', 'TRANCADO', 'CONCLUIDO', 'TRANSFERIDO'].includes(limpo) ? limpo : 'ATIVO';
}

/** Números vazios viram NULL, não 0 — 0 é uma nota, vazio é "não lançado". */
function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function texto(v: any): string | null {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
}

/** Identificador estável do diário. Mesma turma + disciplina + período = mesmo diário. */
export function idDiario(classId: string, subjectId: string, periodo: string): string {
  return `diario_${classId}_${subjectId}_${periodo}`.replace(/[^\w-]/g, '_');
}

export interface ResultadoGravacao {
  ok: boolean;
  erro?: string;
}

/* ------------------------------------------------- cabeçalho do diário */

export interface CabecalhoDoDiario {
  inicioModulo: string;
  terminoModulo: string;
  aulasPrevistas: string;
  aulasDadas: string;
}

/**
 * Grava o cabeçalho do diário: início e término do módulo, aulas previstas e
 * aulas dadas.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * Estes quatro campos viviam só no navegador do professor, numa chave por turma
 * e disciplina. A tela aceitava o que ele digitava e dava a entender que estava
 * salvo — mas não havia coluna para eles em tabela nenhuma.
 *
 * Quem abrisse o mesmo diário em outro computador via os campos em branco, e
 * limpar os dados do site apagava tudo sem aviso. O diário impresso saía sem o
 * período do módulo.
 *
 * Agora eles moram na tabela `diarios`, junto do resto do diário.
 */
export async function salvarCabecalhoDoDiario(
  classId: string,
  subjectId: string,
  periodo: string,
  dados: Partial<CabecalhoDoDiario>,
  professorId?: string | null
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!classId || !subjectId) return { ok: false, erro: 'Diário sem turma ou disciplina.' };

  const diario = idDiario(classId, subjectId, periodo);

  // GRAVAÇÃO POR HTTP DIRETO, DE PROPÓSITO.
  //
  // A versão anterior usava a biblioteca do Supabase e ficava pendurada para
  // sempre: sem dado, sem erro, sem exceção. A tela mostrava "Salvando..."
  // indefinidamente e o cabeçalho nunca chegava ao servidor.
  //
  // A mesma requisição por HTTP direto foi medida respondendo em 819 ms e
  // gravando corretamente. Por isso este caminho — ele tem prova, o outro não.
  //
  // `return=representation` faz o banco devolver as linhas alteradas. É assim
  // que sabemos se gravou DE VERDADE: quando as regras de acesso barram uma
  // alteração, o banco responde "200, nenhuma linha" — sucesso aparente, nada
  // gravado. Zero linhas é tratado como falha.
  const r = await chamarBancoDireto(`diarios?id=eq.${encodeURIComponent(diario)}`, {
    metodo: 'PATCH',
    corpo: {
      data_inicio: texto(dados.inicioModulo),
      data_termino: texto(dados.terminoModulo),
      aulas_previstas: num(dados.aulasPrevistas),
      aulas_dadas: num(dados.aulasDadas),
    },
  });

  if (!r.ok) {
    const motivo = (r.erro || '').toLowerCase();
    if (motivo.includes('row-level security') || r.status === 403) {
      return { ok: false, erro: 'Este diário não é seu ou já está fechado para lançamentos.' };
    }
    if (motivo.includes('column') && motivo.includes('does not exist')) {
      return {
        ok: false,
        erro: 'O banco ainda não tem os campos do cabeçalho. Rode o arquivo supabase/13_cabecalho_do_diario.sql.',
      };
    }
    return { ok: false, erro: r.erro };
  }

  if (r.dados.length === 0) {
    return {
      ok: false,
      erro: `o diário deste período ainda não existe no servidor, ou você não tem permissão para alterá-lo. ` +
            `(código do diário: ${diario})`,
    };
  }

  return { ok: true };
}

/** Lê o cabeçalho do diário. Devolve null quando o diário ainda não existe. */
export async function carregarCabecalhoDoDiario(
  classId: string,
  subjectId: string,
  periodo: string
): Promise<CabecalhoDoDiario | null> {
  if (!supabaseConfigurado || !classId || !subjectId) return null;

  // Mesma decisão da gravação: HTTP direto, com tempo limite. Uma leitura que
  // nunca responde deixaria o diário travado em "carregando" para sempre.
  const id = idDiario(classId, subjectId, periodo);
  const r = await chamarBancoDireto(
    `diarios?id=eq.${encodeURIComponent(id)}&select=data_inicio,data_termino,aulas_previstas,aulas_dadas`,
    { tempoLimite: 10000 }
  );

  if (!r.ok || r.dados.length === 0) return null;

  const d = r.dados[0] as any;
  return {
    inicioModulo: d.data_inicio ?? '',
    terminoModulo: d.data_termino ?? '',
    aulasPrevistas: d.aulas_previstas != null ? String(d.aulas_previstas) : '',
    aulasDadas: d.aulas_dadas != null ? String(d.aulas_dadas) : '',
  };
}

function falha(contexto: string, error: any): ResultadoGravacao {
  const msg = error?.message || String(error);
  console.error(`[Banco] ${contexto}: ${msg}`);
  return { ok: false, erro: msg };
}

/**
 * Grava em lotes pequenos.
 *
 * O Postgres tem tempo limite por instrucao (statement timeout). Um upsert com
 * milhares de linhas de uma vez estoura esse limite e a gravacao inteira falha
 * com "canceling statement due to statement timeout". Quebrando em lotes,
 * cada instrucao termina rapido.
 */
const TAMANHO_LOTE = 200;

async function upsertEmLotes(
  tabela: string,
  linhas: any[],
  onConflict: string,
  contexto: string,
  ignoreDuplicates = false
): Promise<ResultadoGravacao> {
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict, ignoreDuplicates });
    if (error) return falha(`${contexto} (lote ${Math.floor(i / TAMANHO_LOTE) + 1})`, error);
  }
  return { ok: true };
}

/* ==========================================================================
 * ESTRUTURA (catálogos) — precisa existir antes das notas, por causa das
 * chaves estrangeiras. Só ADMIN/SECRETARIA consegue gravar: para os outros
 * papéis o RLS recusa, e isso é o comportamento correto.
 * ========================================================================== */

export async function publicarEstrutura(dados: {
  courses: Course[];
  subjects: Subject[];
  classes: ClassSection[];
  users: User[];
  currentPeriod: string;
  grades?: GradeRecord[];
}): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { courses, subjects, classes, users, currentPeriod, grades } = dados;

  // --- cursos
  if (courses.length) {
    const r = await upsertEmLotes('cursos', courses.map(c => ({
        id: c.id,
        nome: c.name,
        descricao: texto(c.description),
        carga_horaria: num(c.totalWorkload),
        // OS TURNOS NÃO ERAM GRAVADOS. A coluna existe desde o primeiro dia e
        // ficava sempre vazia: quem marcasse um curso como só EAD ou só Sábado
        // perdia essa informação em silêncio. Ninguém percebia porque a tela,
        // quando não recebe turno nenhum, desenha os três padrões por conta
        // própria — a tela concordava com o usuário e o banco não sabia de nada.
        // O banco espera SABADO sem acento; `paraTurnoBanco` faz essa conversão.
        turnos: Array.from(new Set((c.shifts ?? []).map(s => paraTurnoBanco(s as string)))),
        ativo: c.active !== false && c.status !== 'INATIVO',
      })), 'id', 'gravar cursos');
    if (!r.ok) return r;
  }

  // --- disciplinas (dependem de curso)
  const cursoIds = new Set(courses.map(c => c.id));
  const disciplinasValidas = subjects.filter(s => cursoIds.has(s.courseId));
  if (disciplinasValidas.length) {
    const r = await upsertEmLotes('disciplinas', disciplinasValidas.map(s => ({
        id: s.id,
        curso_id: s.courseId,
        nome: s.name,
        modulo: s.module ?? 1,
        carga_horaria: s.workload ?? 0,
      })), 'id', 'gravar disciplinas');
    if (!r.ok) return r;
  }

  // --- turmas (dependem de curso)
  const turmasValidas = classes.filter(c => cursoIds.has(c.courseId));
  if (turmasValidas.length) {
    const r = await upsertEmLotes('turmas', turmasValidas.map(c => ({
        id: c.id,
        curso_id: c.courseId,
        nome: c.name,
        codigo: texto(c.code),
        turno: paraTurnoBanco(c.shift),
        modulo: c.module ?? 1,
        ano: c.year ?? new Date().getFullYear(),
        semestre: c.semester ?? 1,
        horario: texto(c.scheduleText),
        fechada_s1: !!c.closedS1,
        fechada_s2: !!c.closedS2,
        fechada_definitivo: !!c.closedDefinitive,
        eh_dependencia: !!c.isDependency,
      })), 'id', 'gravar turmas');
    if (!r.ok) return r;
  }

  // --- professores
  const professores = users.filter(u => u.role === UserRole.TEACHER);
  if (professores.length) {
    const cpfsVistos = new Set<string>();
    const r = await upsertEmLotes('professores', professores.map(p => {
        // CPF é único no banco. Repetido vira NULL em vez de derrubar a gravação inteira.
        let cpf = texto(p.cpf);
        if (cpf && cpfsVistos.has(cpf)) cpf = null;
        if (cpf) cpfsVistos.add(cpf);
        return {
          id: p.id,
          nome: p.name,
          matricula: texto(p.enrollment),
          cpf,
          email: texto(p.email),
          telefone: texto(p.phone),
          situacao: p.active === false ? 'INATIVO' : 'ATIVO',
        };
      }), 'id', 'gravar professores');
    if (!r.ok) return r;
  }

  // --- alunos
  const turmaIds = new Set(turmasValidas.map(c => c.id));
  const alunos = users.filter(u => u.role === UserRole.STUDENT);
  if (alunos.length) {
    const cpfsVistos = new Set<string>();
    const matriculasVistas = new Set<string>();
    const linhas: any[] = [];
    for (const a of alunos) {
      const matricula = texto(a.enrollment) || a.id;
      if (matriculasVistas.has(matricula)) continue;   // matrícula é única
      matriculasVistas.add(matricula);

      let cpf = texto(a.cpf);
      if (cpf && cpfsVistos.has(cpf)) cpf = null;
      if (cpf) cpfsVistos.add(cpf);

      linhas.push({
        id: a.id,
        matricula,
        dossie: texto(a.dossierNumber),
        nome: a.name,
        cpf,
        email: texto(a.email),
        telefone: texto(a.phone),
        curso_id: a.courseId && cursoIds.has(a.courseId) ? a.courseId : null,
        turma_id: a.classId && turmaIds.has(a.classId) ? a.classId : null,
        situacao: paraSituacaoBanco(a.status),
      });
    }
    if (linhas.length) {
      const r = await upsertEmLotes('alunos', linhas, 'id', 'gravar alunos');
      if (!r.ok) return r;
    }
  }

  // --- matrículas (aluno na turma)
  const matriculas = alunos
    .filter(a => a.classId && turmaIds.has(a.classId))
    .map(a => ({ aluno_id: a.id, turma_id: a.classId as string }));
  if (matriculas.length) {
    const r = await upsertEmLotes('matriculas', matriculas, 'aluno_id,turma_id', 'gravar matrículas', true);
    if (!r.ok) return r;

    // TRANSFERÊNCIA: remove a matrícula da turma ANTIGA.
    //
    // Sem isto, o aluno transferido continuava matriculado nas duas turmas ao
    // mesmo tempo no banco — aparecia na lista da turma de origem e na de
    // destino, e o professor antigo continuava enxergando os dados dele.
    for (const m of matriculas) {
      const { error } = await supabase
        .from('matriculas')
        .delete()
        .eq('aluno_id', m.aluno_id)
        .neq('turma_id', m.turma_id);
      if (error) {
        console.warn('[Banco] limpar matrícula antiga:', error.message);
        break;   // não é motivo para abortar a publicação inteira
      }
    }
  }

  // --- diários (turma + disciplina + período), com o professor responsável
  const professorDoDiario = new Map<string, string>();
  for (const p of professores) {
    for (const j of p.assignedJournals ?? []) {
      professorDoDiario.set(`${j.classId}|${j.subjectId}`, p.id);
    }
  }

  // ATENÇÃO: aqui NÃO se cria um diário para cada combinação possível de
  // turma x disciplina. Isso gerava um produto cartesiano com milhares de
  // linhas e derrubava a gravação com "statement timeout".
  //
  // Um diário só existe quando alguém de fato leciona aquilo. Então criamos
  // apenas os pares que têm professor designado ou que já têm nota lançada.
  // Os demais são criados sob demanda, no momento do primeiro lançamento.
  const disciplinaIds = new Set(disciplinasValidas.map(s => s.id));
  const paresNecessarios = new Set<string>(professorDoDiario.keys());
  for (const g of grades ?? []) {
    if (g.classId && g.subjectId) paresNecessarios.add(`${g.classId}|${g.subjectId}`);
  }

  const porTurma = new Map(turmasValidas.map(t => [t.id, t]));
  const diarios: any[] = [];
  for (const par of paresNecessarios) {
    const [turmaId, disciplinaId] = par.split('|');
    const turma = porTurma.get(turmaId);
    if (!turma || !disciplinaIds.has(disciplinaId)) continue;   // ignora referências órfãs
    diarios.push({
      id: idDiario(turmaId, disciplinaId, currentPeriod),
      turma_id: turmaId,
      disciplina_id: disciplinaId,
      professor_id: professorDoDiario.get(par) ?? null,
      periodo: currentPeriod,
      fechado: !!turma.closedDefinitive,
    });
  }

  if (diarios.length) {
    const r = await upsertEmLotes('diarios', diarios, 'id', 'gravar diários');
    if (!r.ok) return r;
  }

  return { ok: true };
}

/**
 * Exclui um curso do banco de verdade.
 *
 * Por que isto precisou existir separado do `publicarEstrutura`:
 *
 * A sincronização automática da estrutura só faz `upsert` — ela grava o que
 * existe na lista local, mas nunca apaga uma linha que sumiu da lista. Um
 * curso removido pela tela desaparecia do navegador de quem excluiu, a
 * sincronização rodava, gravava os cursos restantes, e a linha do curso
 * excluído continuava intacta na tabela. Em qualquer outro aparelho (ou na
 * próxima recarga da mesma tela), `carregarEstrutura` lia a tabela de novo e
 * trazia o curso "excluído" de volta — porque, para o banco, ele nunca tinha
 * saído.
 */
export async function excluirCurso(id: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('cursos').delete().eq('id', id);
  if (error) return falha('excluir curso', error);
  return { ok: true };
}

/** Mesma lógica do curso, para quando uma disciplina é excluída pela tela. */
export async function excluirDisciplina(id: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('disciplinas').delete().eq('id', id);
  if (error) return falha('excluir disciplina', error);
  return { ok: true };
}

/** Mesma lógica do curso, para quando uma turma é excluída pela tela. */
export async function excluirTurma(id: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('turmas').delete().eq('id', id);
  if (error) return falha('excluir turma', error);
  return { ok: true };
}

/** Mesma lógica do curso, para quando um aluno é excluído pela tela. */
export async function excluirAluno(id: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('alunos').delete().eq('id', id);
  if (error) return falha('excluir aluno', error);
  return { ok: true };
}

/** Mesma lógica do curso, para quando um professor é excluído pela tela. */
/**
 * Apaga um comunicado do banco.
 *
 * O `.select()` no fim é essencial: sem ele, uma exclusão barrada pela
 * segurança do banco volta SEM erro e com zero linhas apagadas — e o portal
 * acreditava que tinha dado certo. A mensagem sumia da tela, continuava no
 * servidor, e voltava na sincronização seguinte. Silêncio, não recusa.
 */
export async function excluirMensagem(id: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { data, error } = await supabase
    .from('mensagens')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) return falha('excluir mensagem', error);
  if (!data || data.length === 0) {
    return { ok: false, erro: 'O banco não autorizou apagar este comunicado — ele continua lá.' };
  }
  return { ok: true };
}

export async function excluirProfessor(id: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('professores').delete().eq('id', id);
  if (error) return falha('excluir professor', error);
  return { ok: true };
}

/* ==========================================================================
 * CALENDÁRIO ACADÊMICO
 *
 * São as datas que TRAVAM o lançamento de nota de todo mundo: fechamento da
 * S1, da S2, definitivo e o conselho de classe.
 *
 * Antes viajavam dentro do retrato geral do estado — um JSON único com o
 * portal inteiro. Três problemas com isso: o arquivo é gravado por completo,
 * então duas pessoas mexendo ao mesmo tempo se sobrescreviam; só gestão
 * conseguia gravá-lo; e ao trocar a "geração" dos dados o retrato é descartado
 * e as datas voltavam sozinhas para o padrão de fábrica.
 *
 * Agora ficam em `eventos_calendario`, com uma linha por data. As regras do
 * banco já estavam prontas para esta tabela: todo mundo logado lê (o professor
 * precisa enxergar o prazo), só gestão escreve.
 * ========================================================================== */

export interface EventoCalendario {
  id: string;
  title: string;
  date: string;
  type: string;
  description: string;
}

export async function carregarEventosCalendario(): Promise<EventoCalendario[] | null> {
  if (!supabaseConfigurado) return null;

  // Ordenado por data: o cartão do calendário mostra na ordem recebida, e o
  // banco devolve sem ordem definida. Sem isto, "Fechamento da S1" aparecia
  // depois do "Conselho de Classe" só porque a linha foi atualizada por último.
  const { data, error } = await supabase
    .from('eventos_calendario')
    .select('id, titulo, data, tipo, descricao')
    .order('data', { ascending: true });

  if (error) {
    console.warn('[Banco] carregar calendário:', error.message);
    return null;   // null = "não consegui ler", diferente de "está vazio"
  }

  return (data ?? []).map(e => ({
    id: (e as any).id,
    title: (e as any).titulo,
    date: (e as any).data,
    type: (e as any).tipo,
    description: (e as any).descricao ?? '',
  }));
}

/**
 * Grava as datas do calendário.
 *
 * Grava linha a linha (upsert por id), não o conjunto todo: mudar a data da S1
 * não toca nas outras três. É justamente o que o retrato único não permitia.
 */
export async function salvarEventosCalendario(
  eventos: EventoCalendario[]
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!eventos.length) return { ok: true };

  const { error } = await supabase.from('eventos_calendario').upsert(
    eventos.map(e => ({
      id: e.id,
      titulo: e.title,
      data: e.date,
      tipo: e.type,
      descricao: e.description,
    })),
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[Banco] gravar calendário:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/**
 * Período letivo atual e lista de períodos disponíveis.
 *
 * Fica numa tabela própria, de leitura aberta a qualquer pessoa logada —
 * diferente do retrato geral (que só a gestão pode ler). É essa leitura
 * pública que faltava: sem ela, o navegador do professor nunca descobria o
 * período certo, ficava preso no valor padrão do código, e todo lançamento
 * dele ia para um diário do período errado (que não existe e que ele não
 * tem permissão de criar).
 */
export async function carregarPeriodoAtual(): Promise<{ periodoAtual: string; periodos: string[] } | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('config_sistema')
    .select('periodo_atual, periodos_disponiveis')
    .eq('id', 'principal')
    .maybeSingle();

  if (error) {
    console.warn('[Banco] carregar período atual:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    periodoAtual: (data as any).periodo_atual,
    periodos: (data as any).periodos_disponiveis ?? [],
  };
}

/** Só a gestão consegue gravar (a regra do banco recusa qualquer outro papel). */
export async function salvarPeriodoAtual(
  periodoAtual: string,
  periodos: string[]
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { error } = await supabase.from('config_sistema').upsert(
    {
      id: 'principal',
      periodo_atual: periodoAtual,
      periodos_disponiveis: periodos,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[Banco] gravar período atual:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/* ==========================================================================
 * LANÇAMENTOS — uma linha por vez
 * ========================================================================== */

/**
 * Garante que o diário existe antes de gravar a nota nele.
 *
 * PROCURA ANTES DE CRIAR — e a ordem importa.
 *
 * Antes esta função ia direto ao `upsert`. Para o professor isso era fatal: o
 * banco (com razão) não deixa professor criar diário, o upsert falhava, a
 * função devolvia `null` e `salvarNota` desistia. Resultado: **o professor
 * clicava em "Salvar Notas", a tela não reclamava, e a nota não saía do
 * navegador.** O diário já existia — só não era ele quem podia criá-lo.
 *
 * Agora: se o diário já está lá, devolve o id e pronto. Só tenta criar quando
 * realmente não existe, que é o caso da secretaria montando a estrutura.
 */
async function garantirDiario(
  classId: string,
  subjectId: string,
  periodo: string,
  professorId?: string | null
): Promise<string | null> {
  const id = idDiario(classId, subjectId, periodo);

  const { data: existente } = await supabase
    .from('diarios')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (existente) return id;

  const { error } = await supabase.from('diarios').upsert(
    {
      id,
      turma_id: classId,
      disciplina_id: subjectId,
      periodo,
      ...(professorId ? { professor_id: professorId } : {}),
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (error) {
    console.error('[Banco] garantir diário:', error.message);
    return null;
  }
  return id;
}

/**
 * Grava UMA nota. Só a linha daquele aluno naquele diário é tocada.
 *
 * O banco recusa se: o diário não é deste professor, ou o diário está fechado.
 * Essa checagem é feita no Postgres, não aqui — então não tem como burlar
 * pelo navegador.
 */
export async function salvarNota(
  nota: GradeRecord,
  periodo: string,
  professorId?: string | null
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!nota.classId || !nota.subjectId || !nota.studentId) {
    return { ok: false, erro: 'Lançamento sem turma, disciplina ou aluno.' };
  }

  const diario = await garantirDiario(nota.classId, nota.subjectId, periodo, professorId);
  if (!diario) return { ok: false, erro: 'Não foi possível localizar o diário.' };

  const { error } = await supabase.from('notas').upsert(
    {
      diario_id: diario,
      aluno_id: nota.studentId,
      av1: num(nota.av1), av2: num(nota.av2), av3: num(nota.av3), rec_s1: num(nota.recS1),
      s1: num(nota.s1),
      av4: num(nota.av4), av5: num(nota.av5), av6: num(nota.av6), rec_s2: num(nota.recS2),
      s2: num(nota.s2),
      extra: num(nota.extra),
      conselho: num(nota.conselho),
      afc: num(nota.afc),
      pf: num(nota.pf),
      conceito: texto(nota.concept),
      resultado: paraResultadoBanco(nota.result),
      importado: !!nota.isHistoricalImport,
    },
    { onConflict: 'diario_id,aluno_id' }   // <- a chave que garante 1 nota por aluno/diário
  );

  if (error) {
    if (error.message?.toLowerCase().includes('row-level security')) {
      return { ok: false, erro: 'Este diário não é seu ou já está fechado para lançamentos.' };
    }
    return falha('gravar nota', error);
  }
  return { ok: true };
}

/** Grava o total de faltas de UM aluno em UMA disciplina. */
export async function salvarFaltas(
  classId: string,
  subjectId: string,
  studentId: string,
  total: number,
  periodo: string
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const diario = await garantirDiario(classId, subjectId, periodo);
  if (!diario) return { ok: false, erro: 'Não foi possível localizar o diário.' };

  const { error } = await supabase.from('faltas_diretas').upsert(
    { diario_id: diario, aluno_id: studentId, quantidade: Math.max(0, Math.trunc(total || 0)) },
    { onConflict: 'diario_id,aluno_id' }
  );

  if (error) {
    if (error.message?.toLowerCase().includes('row-level security')) {
      return { ok: false, erro: 'Este diário não é seu ou já está fechado para lançamentos.' };
    }
    return falha('gravar faltas', error);
  }
  return { ok: true };
}

/**
 * Registra UMA aula do diário de classe, com a chamada dos alunos.
 *
 * Esta era a maior lacuna do sistema: o diário de classe é lançado pelo
 * PROFESSOR, mas ficava guardado apenas no retrato geral da escola — que só a
 * gestão tem permissão de gravar. Na prática, toda aula registrada por
 * professor se perdia ao trocar de computador ou limpar o navegador.
 *
 * Agora a aula vai para a tabela `aulas` e as presenças para `frequencia`,
 * ambas com regras que permitem o professor dono do diário gravar.
 */
export async function salvarAula(
  classId: string,
  subjectId: string,
  periodo: string,
  aula: {
    id?: string;
    date: string;
    lessonsCount: number;
    topic?: string;
    records?: { [studentId: string]: 'P' | 'F' };
  },
  professorId?: string | null
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!classId || !subjectId || !aula.date) {
    return { ok: false, erro: 'Aula sem turma, disciplina ou data.' };
  }

  const diario = await garantirDiario(classId, subjectId, periodo, professorId);
  if (!diario) return { ok: false, erro: 'Não foi possível localizar o diário.' };

  const idAula = aula.id || `aula_${diario}_${aula.date}`.replace(/[^\w-]/g, '_');

  const { error } = await supabase.from('aulas').upsert(
    {
      id: idAula,
      diario_id: diario,
      data: aula.date,
      qtd_aulas: aula.lessonsCount ?? 1,
      conteudo: texto(aula.topic),
    },
    { onConflict: 'id' }
  );

  if (error) {
    if (error.message?.toLowerCase().includes('row-level security')) {
      return { ok: false, erro: 'Este diário não é seu ou já está fechado para lançamentos.' };
    }
    return falha('gravar aula', error);
  }

  // Chamada: uma linha por aluno.
  const presencas = Object.entries(aula.records ?? {});
  if (presencas.length) {
    const linhas = presencas.map(([alunoId, presenca]) => ({
      aula_id: idAula,
      aluno_id: alunoId,
      presenca: presenca === 'F' ? 'F' : 'P',
    }));
    const r = await upsertEmLotes('frequencia', linhas, 'aula_id,aluno_id', 'gravar frequência');
    if (!r.ok) return r;
  }

  return { ok: true };
}

/* ==========================================================================
 * ACESSOS EM MASSA
 *
 * A importação de planilha cadastra os alunos, mas não criava conta de acesso
 * para nenhum deles. Com 250 alunos, a secretaria teria que cadastrar um por
 * um para que pudessem entrar. Esta função encontra quem está sem acesso e
 * cria as contas em lote.
 * ========================================================================== */

export interface RelatorioAcessos {
  total: number;
  criados: number;
  falhas: number;
  erros: string[];
}

/** Lista os alunos que ainda não conseguem entrar no portal. */
export async function alunosSemAcesso(): Promise<{ id: string; nome: string; matricula: string }[]> {
  if (!supabaseConfigurado) return [];
  const { data, error } = await supabase
    .from('alunos')
    .select('id, nome, matricula')
    .is('usuario_id', null)
    .eq('situacao', 'ATIVO');

  if (error) {
    console.error('[Banco] listar alunos sem acesso:', error.message);
    return [];
  }
  return (data ?? []) as any[];
}

/**
 * Cria as contas de acesso dos alunos que ainda não têm.
 * Senha inicial = matrícula, com troca obrigatória no primeiro acesso.
 */
/**
 * Move o aluno de turma e/ou curso NO BANCO.
 *
 * A tela de transferência gravava só o próprio histórico dela. O aluno
 * continuava na turma antiga em `alunos` e em `matriculas`, então boletim,
 * diários, notas e chamada seguiam apontando para o lugar errado — e a tela
 * ainda assim dizia "transferência realizada".
 *
 * Aqui as duas pontas são acertadas: a ficha do aluno e a matrícula. A
 * matrícula antiga é apagada em vez de acumulada, senão o aluno apareceria na
 * lista das duas turmas ao mesmo tempo.
 *
 * Transferência só de TURNO não passa por aqui: turno é característica da
 * turma, não do aluno. Para mudar o turno de verdade é preciso escolher uma
 * turma daquele turno, que é o caminho "Transferência de Turma".
 */
export async function transferirAluno(
  alunoId: string,
  destino: { turmaId?: string; cursoId?: string }
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!alunoId) return { ok: false, erro: 'Transferência sem aluno.' };
  if (!destino.turmaId && !destino.cursoId) {
    return { ok: false, erro: 'Transferência sem turma nem curso de destino.' };
  }

  const mudancas: Record<string, string> = {};
  if (destino.turmaId) mudancas.turma_id = destino.turmaId;
  if (destino.cursoId) mudancas.curso_id = destino.cursoId;

  const { error: erroFicha } = await supabase.from('alunos').update(mudancas).eq('id', alunoId);
  if (erroFicha) return { ok: false, erro: `não foi possível mover a ficha do aluno (${erroFicha.message}).` };

  if (destino.turmaId) {
    const { error: erroMatricula } = await supabase
      .from('matriculas')
      .upsert({ aluno_id: alunoId, turma_id: destino.turmaId }, { onConflict: 'aluno_id,turma_id' });
    if (erroMatricula) {
      return { ok: false, erro: `a ficha foi movida, mas a matrícula falhou (${erroMatricula.message}).` };
    }

    // Sem isto o aluno fica matriculado nas duas turmas ao mesmo tempo.
    const { error: erroLimpeza } = await supabase
      .from('matriculas')
      .delete()
      .eq('aluno_id', alunoId)
      .neq('turma_id', destino.turmaId);
    if (erroLimpeza) {
      return { ok: false, erro: `o aluno ficou matriculado na turma antiga também (${erroLimpeza.message}).` };
    }

    // ENTRAR NOS DIÁRIOS DA TURMA NOVA
    //
    // A regra da escola é "ao matricular, o aluno é vinculado a todos os
    // diários da turma". Ao matricular isso já acontecia; ao TRANSFERIR, não —
    // o aluno chegava na turma nova e não aparecia em nenhuma planilha de
    // notas. O professor abria o diário e ele simplesmente não estava lá.
    //
    // As notas da turma antiga não são apagadas: são o histórico dele.
    const { data: diariosDestino, error: erroDiarios } = await supabase
      .from('diarios')
      .select('id')
      .eq('turma_id', destino.turmaId);

    if (erroDiarios) {
      return { ok: false, erro: `o aluno foi movido, mas não entrou nos diários (${erroDiarios.message}).` };
    }

    const linhas = (diariosDestino ?? []).map(d => ({ diario_id: (d as any).id, aluno_id: alunoId }));
    if (linhas.length > 0) {
      // `ignoreDuplicates` para o caso de já existir linha (transferir de volta,
      // por exemplo): não pode apagar a nota que já estava lançada.
      const { error: erroNotas } = await supabase
        .from('notas')
        .upsert(linhas, { onConflict: 'diario_id,aluno_id', ignoreDuplicates: true });
      if (erroNotas) {
        return { ok: false, erro: `o aluno foi movido, mas não entrou nos diários (${erroNotas.message}).` };
      }
    }
  }

  return { ok: true };
}

/**
 * Liga a ficha do aluno a uma conta de login que já existe.
 *
 * Usado quando a criação da conta esbarra em "login já está em uso": em vez de
 * desistir, procura essa conta pela matrícula e amarra as duas pontas.
 *
 * Confere o papel antes de amarrar. Sem essa conferência, uma matrícula que por
 * acaso coincidisse com o login de um professor ou funcionário faria a ficha do
 * aluno apontar para a conta dele.
 */
async function vincularContaExistente(
  alunoId: string,
  matricula: string
): Promise<{ ok: boolean; erro?: string }> {
  const { data: conta, error: erroBusca } = await supabase
    .from('usuarios')
    .select('id, papel')
    .eq('login', matricula)
    .maybeSingle();

  if (erroBusca) return { ok: false, erro: `não foi possível localizar a conta (${erroBusca.message}).` };
  if (!conta) return { ok: false, erro: `o login "${matricula}" está em uso, mas a conta não foi encontrada.` };
  if ((conta as any).papel !== 'ALUNO') {
    return { ok: false, erro: `o login "${matricula}" já pertence a um ${String((conta as any).papel).toLowerCase()}. Troque a matrícula.` };
  }

  // Se essa conta já estiver amarrada a OUTRA ficha, não desamarra: seria
  // trocar o dono do login sem ninguém perceber.
  const { data: jaUsada } = await supabase
    .from('alunos')
    .select('id')
    .eq('usuario_id', (conta as any).id)
    .neq('id', alunoId)
    .maybeSingle();

  if (jaUsada) {
    return { ok: false, erro: `o login "${matricula}" já pertence a outro aluno cadastrado.` };
  }

  const { error } = await supabase
    .from('alunos')
    .update({ usuario_id: (conta as any).id })
    .eq('id', alunoId);

  if (error) return { ok: false, erro: `não foi possível ligar a conta à ficha (${error.message}).` };
  return { ok: true };
}

/**
 * Espera uma ficha aparecer no banco antes de criar a conta de acesso dela.
 *
 * POR QUE ISTO EXISTE
 *
 * As telas de cadastro salvam primeiro no navegador; a ida ao banco acontece
 * logo depois, em segundo plano. Quem chamava a criação de conta em seguida
 * usava `setTimeout(3500)` — uma aposta de que 3,5 segundos bastariam.
 *
 * Quando não bastavam (internet lenta, lote grande em fila), a conta nascia
 * sem ficha para amarrar. O resultado é o pior tipo de erro: a tela dizia
 * "acesso criado", e o problema só aparecia dias depois, quando a pessoa
 * tentava entrar e encontrava o portal vazio.
 *
 * Agora esperamos o registro de verdade — conferindo a cada segundo, por até
 * 20 segundos — em vez de contar o tempo e torcer.
 */
async function esperarFichaNoBanco(
  tabela: 'alunos' | 'professores',
  coluna: 'matricula' | 'id',
  valor: string,
  segundos = 20,
): Promise<string | null> {
  for (let tentativa = 0; tentativa < segundos; tentativa++) {
    const { data } = await supabase.from(tabela).select('id').eq(coluna, valor).maybeSingle();
    if ((data as any)?.id) return (data as any).id as string;
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

/**
 * Cria a conta de acesso de UM aluno recém-cadastrado à mão.
 *
 * O cadastro individual criava a conta sem informar a qual ficha ela pertence.
 * A conta nascia solta: o aluno conseguia entrar, e o portal abria sem notas,
 * sem turma e sem boletim — porque não achava a ficha dele. Nenhuma mensagem de
 * erro aparecia, nem para o aluno nem para a secretaria.
 *
 * A importação em massa já fazia certo. Esta função põe o cadastro individual
 * no mesmo caminho.
 */
export async function criarAcessoDeUmAluno(
  criarAcesso: (d: any) => Promise<{ ok: boolean; mensagem?: string }>,
  matricula: string,
  nome: string,
): Promise<{ ok: boolean; erro?: string }> {
  const mat = (matricula || '').trim();
  if (mat.length < 4) {
    return { ok: false, erro: `a matrícula "${mat}" é curta demais (mínimo 4 caracteres).` };
  }

  const alunoId = await esperarFichaNoBanco('alunos', 'matricula', mat);
  if (!alunoId) {
    return {
      ok: false,
      erro: `a ficha do aluno ainda não chegou ao banco de dados. ` +
            `O cadastro está salvo; use o botão "Gerar acessos dos alunos" daqui a pouco para criar o login.`,
    };
  }

  const res = await criarAcesso({
    nome,
    login: mat,
    papel: 'ALUNO',
    email: `${mat}@aluno.oc.local`,
    vincularA: alunoId,
    senha: mat,
  });

  if (res.ok) return { ok: true };

  // Login já existe: em vez de tentar criar de novo e falhar sempre, amarra a
  // conta que já está lá à ficha deste aluno.
  if (/já está em uso|already (been )?registered|duplicate/i.test(res.mensagem || '')) {
    const vinculado = await vincularContaExistente(alunoId, mat);
    return vinculado.ok ? { ok: true } : { ok: false, erro: vinculado.erro };
  }

  return { ok: false, erro: res.mensagem };
}

/**
 * Cria a conta de acesso de um professor ou funcionário recém-cadastrado.
 *
 * Mesma correção do aluno: espera a ficha existir no banco antes de criar a
 * conta, em vez de apostar num tempo fixo.
 */
export async function criarAcessoDeUmDocente(
  criarAcesso: (d: any) => Promise<{ ok: boolean; mensagem?: string }>,
  dados: { fichaId: string; nome: string; login: string; email?: string; papel: 'PROFESSOR' | 'SECRETARIA' | 'ADMIN'; senha?: string },
): Promise<{ ok: boolean; senhaInicial?: string; loginUsado?: string; erro?: string }> {
  // Só PROFESSOR tem ficha em `professores` para amarrar. Secretaria e
  // administrador existem apenas em `usuarios`.
  let vincularA: string | undefined;
  if (dados.papel === 'PROFESSOR') {
    const id = await esperarFichaNoBanco('professores', 'id', dados.fichaId);
    if (!id) {
      return {
        ok: false,
        erro: 'a ficha do professor ainda não chegou ao banco de dados. O cadastro está salvo; crie o acesso dele daqui a pouco.',
      };
    }
    vincularA = id;
  }

  // NOME DE USUÁRIO REPETIDO NÃO PODE DEIXAR A PESSOA SEM ACESSO.
  //
  // O login é montado a partir do nome. Duas professoras chamadas Maria —
  // "Maria Silva" e "Maria Souza" — geravam o mesmo usuário, e a segunda
  // recebia "o login já está em uso": a ficha era salva, o acesso não. Ela
  // simplesmente não conseguia entrar, e ninguém percebia até ela reclamar.
  //
  // Aconteceu no primeiro teste real, em 01/08, com "prof_teste".
  //
  // Agora, se o nome já existir, tentamos o mesmo com 2, 3, 4... no fim, até
  // achar um livre. Quem decide se está livre é o servidor, que é a única
  // fonte confiável — conferir pela lista do navegador daria falso negativo.
  let ultimoErro = '';
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const login = tentativa === 0 ? dados.login : `${dados.login}${tentativa + 1}`;

    const res = await criarAcesso({
      nome: dados.nome,
      login,
      papel: dados.papel,
      email: dados.email,
      vincularA,
      senha: dados.senha,
    });

    if (res.ok) {
      return { ok: true, senhaInicial: (res as any).senhaInicial, loginUsado: login };
    }

    ultimoErro = res.mensagem || '';
    const nomeOcupado = /já está em uso|already (been )?registered|duplicate/i.test(ultimoErro);
    if (!nomeOcupado) break;   // falha por outro motivo: insistir não adianta
  }

  return { ok: false, erro: ultimoErro };
}

export async function criarAcessosDosAlunos(
  criarAcesso: (d: any) => Promise<{ ok: boolean; mensagem?: string }>,
  aoProgredir?: (feitos: number, total: number) => void
): Promise<RelatorioAcessos> {
  const pendentes = await alunosSemAcesso();
  const relatorio: RelatorioAcessos = { total: pendentes.length, criados: 0, falhas: 0, erros: [] };

  for (let i = 0; i < pendentes.length; i++) {
    const aluno = pendentes[i];
    const matricula = (aluno.matricula || '').trim();

    if (matricula.length < 4) {
      relatorio.falhas++;
      relatorio.erros.push(`${aluno.nome}: matrícula "${matricula}" curta demais (mínimo 4).`);
      continue;
    }

    const res = await criarAcesso({
      nome: aluno.nome,
      login: matricula,
      papel: 'ALUNO',
      email: `${matricula}@aluno.oc.local`,
      vincularA: aluno.id,
      senha: matricula,
    });

    if (res.ok) {
      relatorio.criados++;
    } else if (/já está em uso|already (been )?registered|duplicate/i.test(res.mensagem || '')) {
      // CONTA ÓRFÃ
      //
      // A conta existe, mas a ficha do aluno não aponta para ela. Acontece
      // quando a criação foi interrompida no meio: o login nasceu e o vínculo
      // não. O efeito é traiçoeiro — o aluno consegue entrar e o portal não
      // acha a ficha dele, então abre vazio, sem erro nenhum na tela.
      //
      // Antes isto era contado como falha e o botão nunca mais resolvia:
      // tentava criar de novo, esbarrava no mesmo login, falhava de novo.
      // Agora, em vez de recriar, amarra a conta que já existe.
      const vinculado = await vincularContaExistente(aluno.id, matricula);
      if (vinculado.ok) {
        relatorio.criados++;
      } else {
        relatorio.falhas++;
        if (relatorio.erros.length < 20) relatorio.erros.push(`${aluno.nome}: ${vinculado.erro}`);
      }
    } else {
      relatorio.falhas++;
      if (relatorio.erros.length < 20) relatorio.erros.push(`${aluno.nome}: ${res.mensagem}`);
    }

    aoProgredir?.(i + 1, pendentes.length);
  }

  return relatorio;
}

/* ==========================================================================
 * DOCUMENTOS DO ALUNO
 *
 * Quem envia é o ALUNO. Ficava no retrato geral da escola, que só a gestão
 * grava — então o envio do aluno nunca chegava ao servidor.
 * ========================================================================== */

export async function salvarDocumentoAluno(doc: {
  id: string;
  studentId: string;
  name: string;
  status: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
}): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!doc.studentId) return { ok: false, erro: 'Documento sem aluno.' };

  const { error } = await supabase.from('documentos_aluno').upsert(
    {
      id: doc.id,
      aluno_id: doc.studentId,
      tipo: doc.name,
      caminho: texto(doc.fileUrl),
      nome_arquivo: texto(doc.fileName),
      situacao: doc.status || 'PENDENTE',
      enviado_em: doc.uploadedAt || null,
    },
    { onConflict: 'id' }
  );

  if (error) {
    if (error.message?.toLowerCase().includes('row-level security')) {
      return { ok: false, erro: 'Só é possível enviar documentos do próprio cadastro.' };
    }
    return falha('gravar documento do aluno', error);
  }
  return { ok: true };
}

export async function carregarDocumentosAluno(): Promise<any[] | null> {
  if (!supabaseConfigurado) return null;
  const { data, error } = await supabase.from('documentos_aluno').select('*');
  if (error) {
    console.error('[Banco] carregar documentos:', error.message);
    return null;
  }
  return (data ?? []).map((d: any) => ({
    id: d.id,
    studentId: d.aluno_id,
    name: d.tipo,
    status: d.situacao,
    fileUrl: d.caminho ?? undefined,
    fileName: d.nome_arquivo ?? undefined,
    uploadedAt: d.enviado_em ?? undefined,
  }));
}

/* ==========================================================================
 * MENSAGENS E NOTIFICAÇÕES
 *
 * Também eram escritas por professor e aluno, mas ficavam só no retrato geral
 * da escola — que apenas a gestão pode gravar. Mensagem enviada por professor
 * sumia ao trocar de máquina.
 * ========================================================================== */

export async function salvarMensagem(msg: {
  id: string;
  senderName?: string;
  recipientId?: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  destinoGrupo?: string;
}): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) return { ok: false, erro: 'Sem sessão ativa.' };

  // O destinatário pode ser uma PESSOA ou um GRUPO.
  //
  // O sistema usa valores como 'ALL', 'ALL_TEACHERS' e 'TURMA:<id>' para
  // grupos. Esses não são identificadores de pessoa e não podem ir para a
  // coluna de destinatário — o banco recusa com "invalid input syntax for
  // type uuid". Aqui a distinção é feita pelo formato.
  // ANEXO E ÁUDIO: SÓ A GESTÃO ENVIA
  //
  // Na tela, só o painel administrativo tem o botão de anexar e o de gravar
  // áudio — professor e aluno apenas visualizam o que recebem. Mas "não ter
  // botão" não é regra: quem souber montar a requisição contorna.
  //
  // Aqui a regra é de verdade. Se quem não é gestão tentar enviar anexo, o
  // anexo é descartado e a mensagem segue só com o texto — em vez de recusar
  // tudo e a pessoa perder o que escreveu.
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', sessao.user.id)
    .maybeSingle();

  const ehGestao = ['ADMIN', 'SECRETARIA'].includes((perfil as any)?.papel);
  if (!ehGestao && (msg.attachmentUrl || msg.attachmentType || msg.attachmentName)) {
    console.warn('[Banco] Anexo removido: apenas a gestão pode enviar arquivo ou áudio.');
    msg = { ...msg, attachmentUrl: undefined, attachmentType: undefined, attachmentName: undefined };
  }

  const ehUuid = (v?: string) =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  // MENSAGEM PARA UMA PESSOA: TRADUZIR O ID
  //
  // A coluna `destinatario_id` aponta para `usuarios`. Só que o portal
  // identifica aluno e professor pelo id da FICHA (`std_...`, `prof_...`), que
  // é outro. Antes, qualquer id que não parecesse UUID caía em `destino_grupo`
  // — ou seja, uma mensagem para um aluno específico virava "grupo" com o nome
  // do id dele, e não chegava a ninguém. Sem erro na tela.
  let destinatario: string | null = ehUuid(msg.recipientId) ? msg.recipientId! : null;

  if (!destinatario && msg.recipientId && !msg.destinoGrupo && !/^(ALL|TURMA:)/i.test(msg.recipientId)) {
    for (const tabela of ['alunos', 'professores'] as const) {
      const { data } = await supabase
        .from(tabela)
        .select('usuario_id')
        .eq('id', msg.recipientId)
        .maybeSingle();
      const uid = (data as any)?.usuario_id;
      if (uid) { destinatario = uid; break; }
    }
  }

  const grupo = msg.destinoGrupo ?? (destinatario ? null : (msg.recipientId || null));

  // `ignoreDuplicates` em vez de atualizar.
  //
  // Com "inserir OU atualizar", reenviar a mesma mensagem vira UPDATE — e o
  // banco só permite UPDATE para a gestão. Resultado: professor e aluno viam a
  // mensagem recusada com "violates row-level security policy". Mensagem
  // enviada não se edita: se já existe, não faz nada.
  const { error } = await supabase.from('mensagens').upsert(
    {
      id: msg.id,
      remetente_id: sessao.user.id,          // o banco exige que seja quem está logado
      remetente_nome: texto(msg.senderName),
      destinatario_id: destinatario,
      destino_grupo: texto(grupo),
      conteudo: msg.content,
      anexo_caminho: texto(msg.attachmentUrl),
      anexo_tipo: texto(msg.attachmentType),
      anexo_nome: texto(msg.attachmentName),
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  if (error) return falha('gravar mensagem', error);
  return { ok: true };
}

export async function carregarMensagens(): Promise<any[] | null> {
  if (!supabaseConfigurado) return null;
  const { data, error } = await supabase
    .from('mensagens')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[Banco] carregar mensagens:', error.message);
    return null;
  }
  return (data ?? []).map((m: any) => ({
    id: m.id,
    senderId: m.remetente_id,
    senderName: m.remetente_nome ?? '',
    recipientId: m.destinatario_id ?? m.destino_grupo ?? 'ALL',
    content: m.conteudo,
    date: m.criado_em,
    attachmentUrl: m.anexo_caminho ?? undefined,
    attachmentType: m.anexo_tipo ?? undefined,
    attachmentName: m.anexo_nome ?? undefined,
  }));
}

/** Lê as aulas e a chamada, no formato que o front-end já usa. */
export async function carregarAulas(): Promise<any[] | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('aulas')
    .select('id, data, qtd_aulas, conteudo, diarios!inner(turma_id, disciplina_id, professor_id), frequencia(aluno_id, presenca)');

  if (error) {
    console.error('[Banco] carregar aulas:', error.message);
    return null;
  }

  return (data ?? []).map((a: any) => {
    const records: { [alunoId: string]: 'P' | 'F' } = {};
    for (const f of a.frequencia ?? []) records[f.aluno_id] = f.presenca;
    return {
      id: a.id,
      subjectId: a.diarios?.disciplina_id ?? '',
      classId: a.diarios?.turma_id ?? '',
      date: a.data,
      lessonsCount: a.qtd_aulas ?? 1,
      teacherId: a.diarios?.professor_id ?? '',
      topic: a.conteudo ?? '',
      records,
    };
  });
}

/* ==========================================================================
 * LEITURA
 * ========================================================================== */

/**
 * Lê do BANCO a estrutura acadêmica: cursos, disciplinas, turmas, professores
 * e alunos.
 *
 * Por que isto é importante:
 *
 * Antes, esses dados vinham de um retrato JSON guardado no Storage. Havia duas
 * fontes de verdade para a mesma informação — as tabelas e o retrato — e elas
 * discordavam. Na prática: limpar as tabelas não adiantava, porque o retrato
 * restaurava tudo de volta na recarga seguinte.
 *
 * Agora o que tem tabela vem da tabela. Fonte única.
 */
export async function carregarEstrutura(): Promise<{
  courses: Course[];
  subjects: Subject[];
  classes: ClassSection[];
  users: User[];
} | null> {
  if (!supabaseConfigurado) return null;

  const [rCursos, rDisc, rTurmas, rProf, rAlunos, rDiarios] = await Promise.all([
    supabase.from('cursos').select('*'),
    supabase.from('disciplinas').select('*'),
    supabase.from('turmas').select('*'),
    supabase.from('professores').select('*'),
    supabase.from('alunos').select('*'),
    supabase.from('diarios').select('professor_id, turma_id, disciplina_id'),
  ]);

  const erro = rCursos.error || rDisc.error || rTurmas.error || rProf.error || rAlunos.error || rDiarios.error;
  if (erro) {
    console.error('[Banco] carregar estrutura:', erro.message);
    return null;
  }

  const courses: Course[] = (rCursos.data ?? []).map((c: any) => ({
    id: c.id,
    name: c.nome,
    description: c.descricao ?? '',
    totalWorkload: c.carga_horaria ?? undefined,
    // Lista vazia vira `undefined` de propósito: os cursos antigos foram
    // gravados sem turno nenhum, e a tela já sabe mostrar os três padrões
    // quando o dado falta. Devolver [] faria esses cursos aparecerem sem
    // turno algum — pior do que o comportamento de hoje.
    shifts: Array.isArray(c.turnos) && c.turnos.length
      ? c.turnos.map((t: string) => paraTurnoApp(t))
      : undefined,
    status: c.ativo ? 'ATIVO' : 'INATIVO',
    active: !!c.ativo,
  }));

  const subjects: Subject[] = (rDisc.data ?? []).map((s: any) => ({
    id: s.id,
    courseId: s.curso_id,
    name: s.nome,
    module: s.modulo ?? 1,
    workload: s.carga_horaria ?? 0,
  })) as Subject[];

  const classes: ClassSection[] = (rTurmas.data ?? []).map((t: any) => ({
    id: t.id,
    name: t.nome,
    code: t.codigo ?? undefined,
    courseId: t.curso_id,
    shift: paraTurnoApp(t.turno),
    module: t.modulo ?? 1,
    year: t.ano ?? new Date().getFullYear(),
    semester: t.semestre ?? 1,
    closedS1: !!t.fechada_s1,
    closedS2: !!t.fechada_s2,
    closedDefinitive: !!t.fechada_definitivo,
    isDependency: !!t.eh_dependencia,
    scheduleText: t.horario ?? undefined,
  }));

  // Diários de cada professor viram a lista de acessos dele.
  const diariosPorProfessor = new Map<string, { classId: string; subjectId: string }[]>();
  for (const d of (rDiarios.data ?? []) as any[]) {
    if (!d.professor_id) continue;
    const lista = diariosPorProfessor.get(d.professor_id) ?? [];
    lista.push({ classId: d.turma_id, subjectId: d.disciplina_id });
    diariosPorProfessor.set(d.professor_id, lista);
  }

  const professores: User[] = (rProf.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.nome,
    username: p.matricula || p.id,
    email: p.email ?? '',
    role: UserRole.TEACHER,
    enrollment: p.matricula ?? undefined,
    cpf: p.cpf ?? undefined,
    phone: p.telefone ?? undefined,
    active: p.situacao !== 'INATIVO',
    assignedJournals: diariosPorProfessor.get(p.id) ?? [],
  })) as User[];

  const alunos: User[] = (rAlunos.data ?? []).map((a: any) => ({
    id: a.id,
    name: a.nome,
    username: a.matricula,
    email: a.email ?? '',
    role: UserRole.STUDENT,
    enrollment: a.matricula,
    dossierNumber: a.dossie ?? undefined,
    cpf: a.cpf ?? undefined,
    phone: a.telefone ?? undefined,
    courseId: a.curso_id ?? undefined,
    classId: a.turma_id ?? undefined,
    status: a.situacao,
    active: a.situacao === 'ATIVO',
  })) as User[];

  return { courses, subjects, classes, users: [...professores, ...alunos] };
}

/** 'SABADO' (banco) -> 'SÁBADO' (front-end) */
function paraTurnoApp(t?: string): any {
  return t === 'SABADO' ? 'SÁBADO' : (t || 'MATUTINO');
}

/** Lê as notas que o usuário logado tem direito de ver. O RLS já filtra. */
export async function carregarNotas(): Promise<GradeRecord[] | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('notas')
    .select('*, diarios!inner(turma_id, disciplina_id)');

  if (error) {
    console.error('[Banco] carregar notas:', error.message);
    return null;
  }

  return (data ?? []).map((n: any) => ({
    id: n.id,
    subjectId: n.diarios?.disciplina_id ?? '',
    classId: n.diarios?.turma_id ?? '',
    studentId: n.aluno_id,
    av1: n.av1, av2: n.av2, av3: n.av3, recS1: n.rec_s1,
    s1: n.s1 ?? 0,
    av4: n.av4, av5: n.av5, av6: n.av6, recS2: n.rec_s2,
    s2: n.s2 ?? 0,
    extra: n.extra,
    conselho: n.conselho,
    afc: n.afc,
    pf: n.pf ?? 0,
    concept: n.conceito ?? '',
    result: paraResultadoApp(n.resultado),
    isHistoricalImport: n.importado ?? false,
  }));
}

/** Lê as faltas no formato de mapa que o front-end já usa. */
export async function carregarFaltas(): Promise<Record<string, number> | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('faltas_diretas')
    .select('quantidade, aluno_id, diarios!inner(turma_id, disciplina_id)');

  if (error) {
    console.error('[Banco] carregar faltas:', error.message);
    return null;
  }

  const mapa: Record<string, number> = {};
  for (const f of (data ?? []) as any[]) {
    const chave = `${f.diarios?.turma_id}_${f.diarios?.disciplina_id}_${f.aluno_id}`;
    mapa[chave] = f.quantidade ?? 0;
  }
  return mapa;
}
