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
import type { GradeRecord, User, Course, ClassSection, Subject, DependencyEnrollment } from '../types';
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
 * Carrega as contas de gestão (administração e secretaria).
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * O portal montava a lista de pessoas lendo as tabelas `alunos` e
 * `professores`. Gestão não está em nenhuma das duas — mora só em `usuarios`.
 * Resultado: a coordenação mandava recado para o professor, ele lia, e não
 * tinha para quem responder: a central de mensagens não listava ninguém da
 * secretaria.
 *
 * As regras do banco já permitiam essa leitura (`p_usuarios_select` libera para
 * gestão e para professor). Faltava pedir.
 *
 * O aluno continua fora: para ele, `usuarios` só devolve a própria linha, e é
 * assim que deve ser — ele não precisa da lista de funcionários da escola.
 */
export async function carregarContasDeGestao(): Promise<
  { id: string; name: string; email: string; papel: string }[] | null
> {
  if (!supabaseConfigurado) return null;
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, login, papel, ativo')
    .in('papel', ['ADMIN', 'SECRETARIA'])
    .eq('ativo', true)
    .order('nome');

  if (error) {
    // Aluno recebe recusa aqui, e é esperado: não é falha para avisar na tela.
    console.warn('[Banco] carregar contas de gestão:', error.message);
    return null;
  }
  return (data ?? []).map((u: any) => ({
    id: u.id,
    name: u.nome || u.login,
    email: u.login,
    papel: u.papel,
  }));
}

/* ------------------------------------------------------------ estágio */

export interface EstagioGravado {
  id: string;
  studentId: string;
  subjectName: string;
  workload: number;
  location: string;
  teacherName?: string;
  grade: number | null;
  updatedAt?: string;
}

/**
 * Identificador estável do lançamento de estágio.
 *
 * Vem do par aluno + componente, que é a chave natural: a secretaria pensa
 * "a nota de Saúde Mental da Maria", não "o registro 4712". Calcular o id em
 * vez de sortear evita duplicata quando a mesma ficha é lançada duas vezes.
 */
export function idEstagio(studentId: string, componente: string): string {
  return `est_${studentId}_${componente}`.replace(/[^\w-]/g, '_');
}

/**
 * Grava um lançamento de estágio.
 *
 * Antes, isso vivia dentro do retrato geral do sistema — um único arquivo JSON
 * regravado inteiro a cada alteração. Duas pessoas lançando ao mesmo tempo se
 * sobrescreviam em silêncio. Aqui cada lançamento é uma linha própria: quem
 * lança Saúde Mental não toca em Geriatria.
 */
export async function salvarEstagio(e: EstagioGravado): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!e.studentId || !e.subjectName) return { ok: false, erro: 'Aluno ou componente não informado.' };

  const { data, error } = await supabase
    .from('estagios')
    .upsert({
      id: idEstagio(e.studentId, e.subjectName),
      aluno_id: e.studentId,
      componente: e.subjectName,
      carga_horaria: Math.max(0, Math.trunc(e.workload || 0)),
      local_realizado: texto(e.location),
      professor_nome: texto(e.teacherName),
      nota: e.grade === null || e.grade === undefined ? null : Number(e.grade),
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'aluno_id,componente' })
    .select('id');

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('does not exist') && msg.includes('estagios')) {
      return { ok: false, erro: 'O banco ainda não tem a tabela de estágios. Rode supabase/20_estagios.sql.' };
    }
    if (msg.includes('row-level security')) {
      return { ok: false, erro: 'Apenas a secretaria pode lançar estágio.' };
    }
    if (msg.includes('violates foreign key')) {
      return { ok: false, erro: 'Este aluno ainda não existe no servidor. Aguarde a sincronização e tente de novo.' };
    }
    return falha('gravar estágio', error);
  }

  // 200 sem linha é recusa silenciosa das regras de acesso — nunca sucesso.
  if (!data || data.length === 0) {
    return { ok: false, erro: 'Nada foi gravado: o aluno não existe no servidor ou você não tem permissão.' };
  }
  return { ok: true };
}

export async function excluirEstagio(studentId: string, componente: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('estagios').delete()
    .eq('aluno_id', studentId).eq('componente', componente);
  if (error) return falha('excluir estágio', error);
  return { ok: true };
}

/**
 * Lê os lançamentos de estágio que o usuário logado pode ver.
 *
 * Para a gestão, todos. Para o aluno, apenas os dele — o filtro é do banco,
 * não da tela, então nem chega ao navegador o que não é dele.
 */
export async function carregarEstagios(): Promise<EstagioGravado[] | null> {
  if (!supabaseConfigurado) return null;
  const { data, error } = await supabase
    .from('estagios')
    .select('*')
    .order('aluno_id')
    .order('componente');

  if (error) {
    console.error('[Banco] carregar estágios:', error.message);
    return null;
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    studentId: r.aluno_id,
    subjectName: r.componente,
    workload: r.carga_horaria ?? 0,
    location: r.local_realizado ?? '',
    teacherName: r.professor_nome ?? '',
    grade: r.nota === null || r.nota === undefined ? null : Number(r.nota),
    updatedAt: r.atualizado_em,
  }));
}

/* ------------------------------------------- registro de conteúdo programático */

export interface LinhaDeConteudo {
  data: string;
  conteudo: string;
  observacoes: string;
}

/** Linhas por página impressa. Vem do formulário em papel da secretaria. */
export const LINHAS_POR_PAGINA = 30;
/** Páginas por disciplina. */
export const PAGINAS_DE_CONTEUDO = 10;
export const TOTAL_DE_LINHAS = LINHAS_POR_PAGINA * PAGINAS_DE_CONTEUDO;

/**
 * Grava o registro de conteúdo programático de um diário.
 *
 * Segue exatamente o caminho do cabeçalho do diário — HTTP direto, com tempo
 * limite e `return=representation` — e pelo mesmo motivo: a biblioteca do
 * Supabase ficava pendurada aqui sem dado, sem erro e sem exceção, deixando a
 * tela em "Salvando..." para sempre.
 *
 * Linhas totalmente vazias são descartadas antes de gravar. Um formulário
 * recém-aberto tem 270 linhas em branco; guardá-las seria escrever 270 objetos
 * vazios a cada tecla digitada.
 */
export async function salvarConteudoProgramatico(
  classId: string,
  subjectId: string,
  periodo: string,
  linhas: LinhaDeConteudo[]
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!classId || !subjectId) return { ok: false, erro: 'Turma ou disciplina não informada.' };

  const diario = idDiario(classId, subjectId, periodo);

  // A POSIÇÃO DA LINHA IMPORTA E PRECISA SOBREVIVER.
  //
  // O professor escreve na linha 40 e deixa as anteriores em branco de
  // propósito — são aulas que ainda não aconteceram. Guardar só as
  // preenchidas, sem dizer ONDE estavam, faria tudo subir para o topo quando
  // recarregasse. O índice viaja junto com o conteúdo.
  const preenchidas = linhas
    .map((l, i) => ({ i, ...l }))
    .filter(l => (l.data || '').trim() || (l.conteudo || '').trim() || (l.observacoes || '').trim())
    .map(l => ({
      i: l.i,
      data: (l.data || '').trim(),
      conteudo: (l.conteudo || '').trim(),
      observacoes: (l.observacoes || '').trim(),
    }));

  const r = await chamarBancoDireto(`diarios?id=eq.${encodeURIComponent(diario)}`, {
    metodo: 'PATCH',
    corpo: { conteudo_programatico: { versao: 1, linhas: preenchidas } },
  });

  if (!r.ok) {
    const motivo = (r.erro || '').toLowerCase();
    if (motivo.includes('row-level security') || r.status === 403) {
      return { ok: false, erro: 'Este diário não é seu ou já está fechado para lançamentos.' };
    }
    if (motivo.includes('column') && motivo.includes('does not exist')) {
      return {
        ok: false,
        erro: 'O banco ainda não tem o campo do conteúdo programático. Rode o arquivo supabase/17_conteudo_programatico.sql.',
      };
    }
    return { ok: false, erro: r.erro };
  }

  // 200 com zero linhas é sucesso aparente sem nada gravado — é assim que as
  // regras de acesso recusam. Tratar como falha é o que impede a tela de
  // dizer "salvo" quando nada saiu do lugar.
  if (r.dados.length === 0) {
    return {
      ok: false,
      erro: `o diário deste período ainda não existe no servidor, ou você não tem permissão para alterá-lo. ` +
            `(código do diário: ${diario})`,
    };
  }

  return { ok: true };
}

/**
 * Lê o registro de conteúdo programático.
 *
 * Devolve sempre o formulário completo, com as linhas em branco no lugar
 * certo — a tela não precisa saber que o banco guarda só o que foi preenchido.
 */
export async function carregarConteudoProgramatico(
  classId: string,
  subjectId: string,
  periodo: string
): Promise<LinhaDeConteudo[] | null> {
  if (!supabaseConfigurado || !classId || !subjectId) return null;

  const id = idDiario(classId, subjectId, periodo);
  const r = await chamarBancoDireto(
    `diarios?id=eq.${encodeURIComponent(id)}&select=conteudo_programatico`,
    { tempoLimite: 10000 }
  );

  if (!r.ok || r.dados.length === 0) return null;

  const vazias = (): LinhaDeConteudo[] =>
    Array.from({ length: TOTAL_DE_LINHAS }, () => ({ data: '', conteudo: '', observacoes: '' }));

  const bruto = (r.dados[0] as any)?.conteudo_programatico;
  if (!bruto || !Array.isArray(bruto.linhas)) return vazias();

  const linhas = vazias();
  for (const l of bruto.linhas) {
    const i = Number(l?.i);
    if (!Number.isInteger(i) || i < 0 || i >= TOTAL_DE_LINHAS) continue;
    linhas[i] = {
      data: String(l.data ?? ''),
      conteudo: String(l.conteudo ?? ''),
      observacoes: String(l.observacoes ?? ''),
    };
  }
  return linhas;
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

  // UM ERRO NUMA TABELA NÃO PODE MAIS CALAR TODAS AS SEGUINTES.
  //
  // Cada bloco abaixo terminava com `return r`. A ordem é cursos, disciplinas,
  // turmas, professores, alunos, matrículas, diários — então um CPF repetido
  // num professor fazia alunos, matrículas e diários pararem de ser gravados.
  // Como o intervalo de 3 segundos repete os MESMOS dados, ele falhava igual
  // para sempre, e na tela havia só o aviso laranja.
  //
  // Agora tudo que pode ser gravado é gravado, e no fim o portal informa TUDO
  // o que ficou de fora. Só os cursos continuam sendo parada obrigatória:
  // disciplinas, turmas e alunos apontam para eles por chave estrangeira, e
  // sem o curso nada mais entra mesmo.
  const erros: string[] = [];

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
    if (!r.ok) return r;   // sem curso, nada mais entra (chave estrangeira)
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
    if (!r.ok) erros.push(r.erro || 'disciplinas');
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
        disciplina_dependencia_id: c.dependencySubjectId || null,
      })), 'id', 'gravar turmas');
    if (!r.ok) erros.push(r.erro || 'turmas');
  }

  // --- professores
  const professores = users.filter(u => u.role === UserRole.TEACHER);
  if (professores.length) {
    const cpfsVistos = new Set<string>();
    // MATRÍCULA TAMBÉM É ÚNICA NO BANCO, e isso faltava aqui.
    //
    // O CPF já tinha esta proteção; a matrícula não. E a matrícula era gerada
    // por contagem de professores, então repetia sozinha assim que alguém era
    // excluído. Uma repetida derrubava a gravação de TODOS os professores.
    // Repetida vira NULL: fica um professor sem matrícula (visível e fácil de
    // corrigir na tela) em vez de nenhum professor gravado.
    const matriculasVistas = new Set<string>();
    const r = await upsertEmLotes('professores', professores.map(p => {
        // CPF é único no banco. Repetido vira NULL em vez de derrubar a gravação inteira.
        let cpf = texto(p.cpf);
        if (cpf && cpfsVistos.has(cpf)) cpf = null;
        if (cpf) cpfsVistos.add(cpf);

        let matricula = texto(p.enrollment);
        if (matricula && matriculasVistas.has(matricula)) matricula = null;
        if (matricula) matriculasVistas.add(matricula);

        return {
          id: p.id,
          nome: p.name,
          matricula,
          cpf,
          email: texto(p.email),
          telefone: texto(p.phone),
          situacao: p.active === false ? 'INATIVO' : 'ATIVO',
        };
      }), 'id', 'gravar professores');
    if (!r.ok) erros.push(r.erro || 'professores');
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
      if (!r.ok) erros.push(r.erro || 'alunos');
    }
  }

  // --- matrículas (aluno na turma)
  //
  // UM ALUNO PODE ESTAR EM VÁRIAS TURMAS AO MESMO TEMPO. É A REGRA DA ESCOLA.
  //
  // Ele cursa 2026/1, depois 2026/2, depois 2027/1 — e precisa manter cadastro
  // e boletim SEPARADOS de cada semestre. Também pode cursar uma dependência em
  // paralelo com a turma normal. A tabela `matriculas` sempre suportou isso
  // (a chave é aluno + turma), mas aqui as matrículas saíam SÓ de `classId`,
  // que é um campo único: uma turma por aluno, e ponto.
  //
  // Pior: logo abaixo havia uma limpeza que apagava toda matrícula do aluno em
  // qualquer OUTRA turma. Matricular no semestre novo não somava — TRANSFERIA.
  // O semestre anterior perdia a matrícula, o aluno deixava de enxergar aquele
  // diário (a regra `estou_matriculado` do banco depende dela) e o boletim
  // antigo sumia para ele. Na tela da secretaria continuava tudo lá.
  //
  // Agora a matrícula é reconstruída também pelas NOTAS: se o aluno tem nota
  // numa turma, ele cursa aquela turma. Vale para semestre passado, semestre
  // atual e dependência, sem distinção.
  const idsDeAluno = new Set(alunos.map(a => a.id));
  const porTurmaId = new Map(turmasValidas.map(t => [t.id, t]));
  const periodoDaTurma = (id?: string | null) => {
    const t = id ? porTurmaId.get(id) : undefined;
    return t ? `${t.year ?? ''}|${t.semester ?? ''}` : null;
  };

  const matriculasPorChave = new Map<string, { aluno_id: string; turma_id: string }>();
  const turmaAtualDoAluno = new Map<string, string>();

  for (const a of alunos) {
    if (a.classId && turmaIds.has(a.classId)) {
      matriculasPorChave.set(`${a.id}|${a.classId}`, { aluno_id: a.id, turma_id: a.classId });
      turmaAtualDoAluno.set(a.id, a.classId);
    }
  }

  // NOTA NUMA TURMA NÃO BASTA PARA SER MATRÍCULA VÁLIDA — DEPENDE DO SEMESTRE.
  //
  // Aceitar toda turma com nota quebrava a TRANSFERÊNCIA: ela apaga a matrícula
  // antiga no banco, mas as notas da turma de origem continuam existindo, e a
  // sincronização recriava a matrícula três segundos depois. O aluno voltava a
  // aparecer nas duas turmas, e o professor antigo continuava enxergando ele.
  //
  // A regra que separa os dois casos é o semestre:
  //   - outra turma no MESMO semestre  -> é transferência, não acumula;
  //   - turma de OUTRO semestre        -> é o histórico dele, mantém;
  //   - dependência                    -> sempre mantém, é paralela por natureza.
  for (const g of grades ?? []) {
    if (!g.classId || !g.studentId) continue;
    if (!turmaIds.has(g.classId) || !idsDeAluno.has(g.studentId)) continue;

    const turma = porTurmaId.get(g.classId);
    const atual = turmaAtualDoAluno.get(g.studentId);

    if (turma && !turma.isDependency && atual && g.classId !== atual) {
      if (periodoDaTurma(g.classId) === periodoDaTurma(atual)) continue;   // turma de origem
    }

    matriculasPorChave.set(`${g.studentId}|${g.classId}`, {
      aluno_id: g.studentId,
      turma_id: g.classId,
    });
  }

  const todasAsMatriculas = [...matriculasPorChave.values()];

  if (todasAsMatriculas.length) {
    const r = await upsertEmLotes('matriculas', todasAsMatriculas, 'aluno_id,turma_id', 'gravar matrículas', true);
    if (!r.ok) erros.push(r.erro || 'matrículas');

    // LIMPEZA DE TRANSFERÊNCIA — AGORA SÓ DENTRO DO MESMO SEMESTRE.
    //
    // Transferência é mudar de turma DENTRO de um semestre: o aluno saiu do
    // matutino e foi para o noturno, e não pode aparecer nos dois. Isso
    // continua sendo limpo.
    //
    // O que esta limpeza NÃO pode mais fazer é apagar matrícula de OUTRO
    // semestre. Era exatamente isso que transformava "matriculei no semestre
    // novo" em "transferi o aluno".
    const legitimasPorAluno = new Map<string, Set<string>>();
    for (const m of todasAsMatriculas) {
      const atual = legitimasPorAluno.get(m.aluno_id) ?? new Set<string>();
      atual.add(m.turma_id);
      legitimasPorAluno.set(m.aluno_id, atual);
    }

    for (const [alunoId, turmasDoAluno] of legitimasPorAluno) {
      // Semestres em que este aluno tem matrícula legítima. Só neles a limpeza
      // pode agir — nos outros ela não tem informação suficiente para julgar.
      const periodos = new Set<string>();
      for (const tid of turmasDoAluno) {
        const t = porTurmaId.get(tid);
        if (t) periodos.add(`${t.year ?? ''}|${t.semester ?? ''}`);
      }
      if (!periodos.size) continue;

      const aRemover = turmasValidas
        .filter(t => periodos.has(`${t.year ?? ''}|${t.semester ?? ''}`))
        .filter(t => !turmasDoAluno.has(t.id))
        .map(t => t.id);

      if (!aRemover.length) continue;

      const lista = `(${aRemover.map(t => `"${t}"`).join(',')})`;
      const { error } = await supabase
        .from('matriculas')
        .delete()
        .eq('aluno_id', alunoId)
        .in('turma_id', aRemover.length ? aRemover : ['__nenhuma__']);
      if (error) {
        console.warn('[Banco] limpar matrícula antiga:', error.message, lista);
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

    // O PERÍODO DO DIÁRIO É O DA TURMA, NÃO O QUE ESTÁ SELECIONADO NA TELA.
    //
    // Antes vinha de `currentPeriod`. Com a tela em 2026/2, uma turma de 2025/2
    // ganhava um diário carimbado 2026/2 — e o `id`, calculado com o mesmo
    // período, também. Trocar o período letivo reescrevia o carimbo de diários
    // antigos, e a linha passava a discordar de si mesma: `id` terminando em
    // `_2027_1` com a coluna `periodo` dizendo `2026/1`.
    //
    // O estrago vinha depois. Na volta ao período anterior, o sistema calculava
    // o id correto, não achava a linha (que estava com o id torto) e tentava
    // INSERIR outra — batendo em `unique (turma_id, disciplina_id, periodo)`.
    // A publicação inteira travava com "duplicate key", a cada três segundos,
    // para sempre. Era o erro que acendia o aviso laranja sem explicação.
    //
    // Uma turma pertence a um semestre e só a ele. O diário dela também.
    const periodoDaTurma = (turma.year && turma.semester)
      ? `${turma.year}/${turma.semester}`
      : currentPeriod;

    diarios.push({
      id: idDiario(turmaId, disciplinaId, periodoDaTurma),
      turma_id: turmaId,
      disciplina_id: disciplinaId,
      professor_id: professorDoDiario.get(par) ?? null,
      periodo: periodoDaTurma,
      fechado: !!turma.closedDefinitive,
    });
  }

  if (diarios.length) {
    const r = await upsertEmLotes('diarios', diarios, 'id', 'gravar diários');
    if (!r.ok) erros.push(r.erro || 'diários');
  }

  if (erros.length) {
    // Sem duplicar a mesma mensagem várias vezes: um CPF repetido costuma
    // derrubar mais de um bloco e o aviso na tela ficaria ilegível.
    const unicos = [...new Set(erros)];
    return { ok: false, erro: unicos.join(' | ') };
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

/**
 * Remove APENAS a conta de login (tabela `usuarios`) de alguém — nunca a
 * ficha acadêmica, nem notas, nem frequência, nem histórico escolar.
 *
 * Por que isto precisou existir: a tela "Gerenciar Usuários Cadastrados"
 * chamava `excluirAluno`, que apaga a linha em `alunos` — e isso arrasta em
 * cascata matrícula, TODAS as notas, frequência, faltas diretas, histórico
 * escolar e documentos do aluno. Um clique em "excluir usuário" (que devia
 * só tirar o acesso de alguém que saiu da escola) apagava o histórico
 * acadêmico inteiro da pessoa, sem volta.
 *
 * A ficha em `alunos` tem `usuario_id references usuarios(id) on delete set
 * null` — ou seja, apagar só a conta de login desliga o acesso e deixa a
 * ficha (e todo o histórico ligado a ela) intacta, como registro
 * permanente. É isto que "excluir usuário" deveria sempre ter feito.
 */
export async function excluirContaDeLogin(usuarioId: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('usuarios').delete().eq('id', usuarioId);
  if (error) return falha('excluir conta de login', error);
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

/**
 * Liga ou desliga o ACESSO de uma conta, pelo login.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * Remover ou inativar um funcionário na tela mexia só na lista do navegador.
 * A conta em `usuarios` continuava intacta, e `email_por_login` só exige
 * `u.ativo` — ou seja, a pessoa desligada sumia da lista da secretaria e
 * continuava entrando no portal, com permissão de secretaria, indefinidamente.
 * Ninguém percebia, porque na tela ela já não aparecia.
 *
 * A gestão pode escrever em `usuarios` (política `p_usuarios_admin_all`), e o
 * gatilho `protege_campos_criticos` só barra quem NÃO é gestão. Então esta
 * gravação é permitida vindo da secretaria e recusada vinda de qualquer outro.
 *
 * Devolve `ok: false` quando nada foi alterado — login errado ou sem permissão.
 * Quem chamar PRECISA avisar o usuário: falhar em silêncio aqui é deixar um
 * ex-funcionário com acesso.
 */
export async function definirAcessoDaConta(
  login: string,
  ativo: boolean
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const alvo = (login ?? '').trim();
  if (!alvo) return { ok: false, erro: 'Login não informado.' };

  const { data, error } = await supabase
    .from('usuarios')
    .update({ ativo })
    .ilike('login', alvo)
    .select('id');

  if (error) return falha(`${ativo ? 'reativar' : 'desativar'} acesso de ${alvo}`, error);
  if (!data || data.length === 0) {
    // 200 com zero linhas é a falha silenciosa mais perigosa deste sistema:
    // o comando "funciona" e não altera nada.
    return { ok: false, erro: `Nenhuma conta com o login "${alvo}" foi alterada.` };
  }
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
/**
 * Configuração da escola inteira: uma linha por chave em `configuracoes`.
 *
 * POR QUE MUDOU DE TABELA
 *
 * Estas funções liam e gravavam em `config_sistema` — uma tabela que NUNCA foi
 * criada em nenhum arquivo SQL. Toda chamada falhava, e a falha era engolida
 * por um `console.warn`. O período letivo, na prática, nunca saiu do navegador
 * de quem o escolheu.
 *
 * `configuracoes` existe desde o começo e tem exatamente a regra certa:
 * qualquer pessoa logada LÊ, só a gestão ESCREVE. É o que faz uma configuração
 * da escola chegar ao aluno sem lhe dar acesso ao resto.
 */
async function lerConfiguracao<T>(chave: string): Promise<T | null> {
  if (!supabaseConfigurado) return null;
  const { data, error } = await supabase
    .from('configuracoes').select('valor').eq('chave', chave).maybeSingle();
  if (error) {
    console.warn(`[Banco] ler configuração ${chave}:`, error.message);
    return null;
  }
  return (data?.valor as T) ?? null;
}

async function gravarConfiguracao(chave: string, valor: unknown): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  const { error } = await supabase.from('configuracoes').upsert(
    { chave, valor, atualizado_em: new Date().toISOString() },
    { onConflict: 'chave' }
  );
  if (error) {
    if ((error.message || '').toLowerCase().includes('row-level security')) {
      return { ok: false, erro: 'Apenas a gestão pode alterar configurações da escola.' };
    }
    return falha(`gravar configuração ${chave}`, error);
  }
  return { ok: true };
}

/** Janelas de emissão das declarações. Lida por TODOS — inclusive pelo aluno. */
export interface JanelasDeDeclaracao {
  escolaridade: { startDate: string; endDate: string };
  ctransp: { startDate: string; endDate: string };
}

export async function carregarJanelasDeDeclaracao(): Promise<JanelasDeDeclaracao | null> {
  return lerConfiguracao<JanelasDeDeclaracao>('declaracoes');
}

export async function salvarJanelasDeDeclaracao(j: JanelasDeDeclaracao): Promise<ResultadoGravacao> {
  return gravarConfiguracao('declaracoes', j);
}

export async function carregarPeriodoAtual(): Promise<{ periodoAtual: string; periodos: string[] } | null> {
  const data = await lerConfiguracao<any>('periodo');
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

  return gravarConfiguracao('periodo', {
    periodo_atual: periodoAtual,
    periodos_disponiveis: periodos,
  });
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
 * Atribui (ou remove) o professor de UM diário específico, gravando DIRETO
 * no banco, na hora — não espera o ciclo de sincronização periódica.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * A tela "Gerenciador de Acessos de Professores" só atualizava o estado
 * local do navegador ao marcar/desmarcar uma disciplina — a gravação de
 * verdade dependia inteiramente do ciclo de sincronização automática (que
 * roda a cada poucos segundos e só publica se detectar mudança desde a
 * última vez). Isso deixava uma janela onde a marcação existia só na tela:
 * se a sincronização rodasse usando um estado desatualizado (por exemplo,
 * outra aba do navegador aberta ao mesmo tempo, com uma visão antiga),
 * a atribuição sumia sozinha, sem nenhum aviso.
 *
 * Agora o clique grava direto — sem esperar, sem depender do que outra
 * aba possa achar que é verdade.
 */
export async function atribuirProfessorAoDiario(
  classId: string,
  subjectId: string,
  periodo: string,
  professorId: string | null
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const id = idDiario(classId, subjectId, periodo);
  const { error } = await supabase.from('diarios').upsert(
    {
      id,
      turma_id: classId,
      disciplina_id: subjectId,
      periodo,
      professor_id: professorId,
    },
    { onConflict: 'id' }
  );

  if (error) return falha('atribuir professor ao diário', error);
  return { ok: true };
}

/**
 * Cria a ficha de UM aluno que vai fazer SÓ dependência — sem matriculá-lo
 * em nenhuma turma regular e sem inflar notas em disciplinas que ele não
 * vai cursar.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * O único caminho de cadastro que a escola usa (Importar Planilhas) sempre
 * exige escolher uma turma de destino, e ao escolher, matricula o aluno em
 * TODAS as disciplinas do módulo daquela turma — mesmo quando ele só
 * precisa fazer uma matéria em dependência. No banco, porém, `turma_id` na
 * tabela `alunos` sempre foi opcional (a ficha nunca exigiu turma) — só
 * faltava um caminho de cadastro que respeitasse isso.
 *
 * Não cria conta de acesso aqui — isso é feito à parte, com
 * `criarAcessoDeUmAluno`, do mesmo jeito que a importação normal já faz.
 */
export async function criarAlunoSoDependencia(params: {
  nome: string;
  matricula: string;
  cursoId?: string;
}): Promise<ResultadoGravacao & { alunoId?: string }> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const nome = (params.nome || '').trim();
  const matricula = (params.matricula || '').trim();
  if (!nome) return { ok: false, erro: 'Nome do aluno é obrigatório.' };
  if (matricula.length < 4) {
    return { ok: false, erro: 'A matrícula precisa ter pelo menos 4 caracteres, porque ela também é a senha do primeiro acesso.' };
  }

  const { data: existente, error: erroExistente } = await supabase
    .from('alunos').select('id, nome').eq('matricula', matricula).maybeSingle();
  if (erroExistente) return falha('conferir matrícula existente', erroExistente);
  if (existente) {
    return { ok: false, erro: `A matrícula ${matricula} já pertence a ${(existente as any).nome}.` };
  }

  const alunoId = `aluno_dep_${Date.now()}`;
  const { error: erroFicha } = await supabase.from('alunos').insert({
    id: alunoId,
    matricula,
    nome: nome.toUpperCase(),
    curso_id: params.cursoId || null,
    turma_id: null,
    situacao: 'ATIVO',
  });
  if (erroFicha) return falha('criar ficha do aluno', erroFicha);

  return { ok: true, alunoId };
}

/**
 * Matricula UM aluno em dependência de UMA disciplina, gravando tudo DIRETO
 * no banco — turma, matrícula e a nota inicial (zerada) — sem depender do
 * ciclo de sincronização periódica.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * A tela de Dependências só atualizava o estado local do navegador
 * (turma, matrícula e nota "criadas" só existiam ali) e dependia do ciclo
 * de sincronização automático pra gravar de verdade no banco — o mesmo
 * problema que já corrigimos antes pra atribuir professor a diário. Só que
 * aqui o efeito era pior: às vezes a sincronização simplesmente não
 * pegava a mudança a tempo (por exemplo, se a pessoa navegasse pra outra
 * tela logo em seguida), e a matrícula de dependência NUNCA chegava a
 * existir no banco — mesmo a tela mostrando "cadastrado com sucesso".
 * O aluno ficava "só na memória", sumia ao recarregar a página, e o
 * diário abria vazio (sem nome) porque não havia matrícula nenhuma.
 *
 * Se já existir uma turma de dependência ativa para o mesmo curso +
 * disciplina + período, reaproveita ela (mesma lógica de antes, agora só
 * que gravando de verdade) — vários alunos com a mesma dependência caem
 * no mesmo diário.
 */
export async function matricularEmDependencia(params: {
  alunoId: string;
  cursoId: string;
  disciplinaId: string;
  ano: number;
  semestre: number;
  modulo: number;
  horario: string;
}): Promise<ResultadoGravacao & { turmaId?: string }> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { alunoId, cursoId, disciplinaId, ano, semestre, modulo, horario } = params;

  // 1. Já existe uma turma de dependência pra essa disciplina, neste
  // curso e período? Reaproveita; senão, cria uma nova.
  const { data: turmaExistente, error: erroBusca } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('curso_id', cursoId)
    .eq('disciplina_dependencia_id', disciplinaId)
    .eq('eh_dependencia', true)
    .eq('ano', ano)
    .eq('semestre', semestre)
    .limit(1)
    .maybeSingle();
  if (erroBusca) return falha('procurar turma de dependência existente', erroBusca);

  let turmaId = turmaExistente?.id;

  if (!turmaId) {
    const { data: disciplina, error: erroDisc } = await supabase
      .from('disciplinas').select('nome').eq('id', disciplinaId).maybeSingle();
    if (erroDisc) return falha('ler nome da disciplina', erroDisc);

    turmaId = `class_dep_${Date.now()}`;
    const { error: erroCriarTurma } = await supabase.from('turmas').insert({
      id: turmaId,
      curso_id: cursoId,
      nome: `DEP - ${disciplina?.nome || 'Dependência'}`,
      codigo: `DEP-${disciplinaId}`,
      turno: 'SABADO',
      modulo,
      ano,
      semestre,
      horario,
      eh_dependencia: true,
      disciplina_dependencia_id: disciplinaId,
    });
    if (erroCriarTurma) return falha('criar turma de dependência', erroCriarTurma);
  }

  // 2. Já está matriculado nesta turma de dependência? Não duplica.
  const { data: matriculaExistente, error: erroMatriculaExistente } = await supabase
    .from('matriculas')
    .select('id')
    .eq('aluno_id', alunoId)
    .eq('turma_id', turmaId)
    .maybeSingle();
  if (erroMatriculaExistente) return falha('conferir matrícula existente', erroMatriculaExistente);
  if (matriculaExistente) {
    return { ok: false, erro: 'Este aluno já está matriculado nesta dependência.' };
  }

  // 3. Matrícula
  const { error: erroMatricula } = await supabase.from('matriculas').insert({
    id: `mat_dep_${Date.now()}_${alunoId}`,
    aluno_id: alunoId,
    turma_id: turmaId,
    situacao: 'ATIVA',
  });
  if (erroMatricula) return falha('matricular aluno na dependência', erroMatricula);

  // 4. Diário + nota inicial (zerada, "Pendente")
  const periodo = `${ano}/${semestre}`;
  const diarioId = await garantirDiario(turmaId, disciplinaId, periodo, null);
  if (!diarioId) return { ok: false, erro: 'Não foi possível preparar o diário da dependência.' };

  const { error: erroNota } = await supabase.from('notas').upsert(
    {
      id: `nota_dep_${Date.now()}_${alunoId}`,
      diario_id: diarioId,
      aluno_id: alunoId,
      resultado: 'PENDENTE',
    },
    { onConflict: 'diario_id,aluno_id' }
  );
  if (erroNota) return falha('criar nota inicial da dependência', erroNota);

  return { ok: true, turmaId };
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

/**
 * Remove a matrícula e as notas de UM aluno em UMA turma — usado quando o
 * aluno é transferido para outro curso/trilha (ex.: presencial → EAD) e a
 * turma antiga era só um vínculo vazio, sem nota real lançada.
 *
 * POR QUE ISTO PRECISOU EXISTIR: transferir um aluno criava notas zeradas
 * na turma nova E deixava as notas zeradas da turma antiga penduradas para
 * sempre, como "histórico" — mas eram notas fantasma, nunca realmente
 * lançadas por um professor. O boletim/histórico do aluno passava a
 * mostrar "NÃO APTO" em disciplinas que ele nunca cursou de verdade.
 *
 * Só remove se REALMENTE não houver nota lançada de verdade (todo campo em
 * zero/branco) — se o aluno tiver cursado parte da turma antiga de
 * verdade, essa nota é preservada como histórico legítimo.
 */
export async function excluirVinculoTurmaSeVazio(alunoId: string, turmaId: string): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { data: diarios, error: erroDiarios } = await supabase
    .from('diarios').select('id').eq('turma_id', turmaId);
  if (erroDiarios) return falha('localizar diários da turma antiga', erroDiarios);

  const diarioIds = (diarios ?? []).map((d: any) => d.id);
  if (diarioIds.length > 0) {
    // Confere se existe QUALQUER nota com algum valor real lançado — se
    // existir, não mexe em nada (histórico legítimo, preserva).
    const { data: notasReais, error: erroNotas } = await supabase
      .from('notas')
      .select('id')
      .eq('aluno_id', alunoId)
      .in('diario_id', diarioIds)
      .or('s1.gt.0,s2.gt.0,pf.gt.0,afc.gt.0');
    if (erroNotas) return falha('conferir notas reais na turma antiga', erroNotas);
    if (notasReais && notasReais.length > 0) {
      return { ok: true }; // tem nota de verdade — não apaga, mantém como histórico
    }

    const { error: erroDelNotas } = await supabase
      .from('notas').delete().eq('aluno_id', alunoId).in('diario_id', diarioIds);
    if (erroDelNotas) return falha('excluir notas fantasma da turma antiga', erroDelNotas);
  }

  const { error: erroDelMatricula } = await supabase
    .from('matriculas').delete().eq('aluno_id', alunoId).eq('turma_id', turmaId);
  if (erroDelMatricula) return falha('excluir matrícula da turma antiga', erroDelMatricula);

  return { ok: true };
}

/**
 * Cancela a matrícula de dependência de UM aluno em UMA disciplina.
 *
 * Diferente de `excluirVinculoTurmaSeVazio` (usada na transferência de
 * curso), esta função SEMPRE apaga a nota e a matrícula, mesmo que já
 * tenha algo lançado — cancelar dependência é a secretaria decidindo
 * tirar o aluno dali (matrícula errada, aluno desistiu, etc.), não um
 * histórico de reprovação que precise ser preservado. O aluno some do
 * diário e do histórico dele.
 *
 * Se, depois de remover, não sobrar mais nenhum aluno matriculado nessa
 * turma de dependência, apaga também o diário e a própria turma — senão
 * fica uma "DEP - Disciplina" vazia, fantasma, para sempre nas listas.
 */
export async function cancelarDependencia(
  alunoId: string,
  turmaId: string
): Promise<ResultadoGravacao> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };

  const { data: diarios, error: erroDiarios } = await supabase
    .from('diarios').select('id').eq('turma_id', turmaId);
  if (erroDiarios) return falha('localizar diário da dependência', erroDiarios);

  const diarioIds = (diarios ?? []).map((d: any) => d.id);

  if (diarioIds.length > 0) {
    const { error: erroDelNotas } = await supabase
      .from('notas').delete().eq('aluno_id', alunoId).in('diario_id', diarioIds);
    if (erroDelNotas) return falha('excluir nota da dependência', erroDelNotas);
  }

  const { error: erroDelMatricula } = await supabase
    .from('matriculas').delete().eq('aluno_id', alunoId).eq('turma_id', turmaId);
  if (erroDelMatricula) return falha('excluir matrícula da dependência', erroDelMatricula);

  const { data: outrasMatriculas, error: erroOutras } = await supabase
    .from('matriculas').select('id').eq('turma_id', turmaId).limit(1);
  if (erroOutras) return falha('conferir se a turma de dependência ficou vazia', erroOutras);

  if (!outrasMatriculas || outrasMatriculas.length === 0) {
    if (diarioIds.length > 0) {
      const { error: erroDelDiario } = await supabase
        .from('diarios').delete().in('id', diarioIds);
      if (erroDelDiario) return falha('excluir diário vazio da dependência', erroDelDiario);
    }
    const { error: erroDelTurma } = await supabase
      .from('turmas').delete().eq('id', turmaId).eq('eh_dependencia', true);
    if (erroDelTurma) return falha('excluir turma vazia da dependência', erroDelTurma);
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

/**
 * Envia o arquivo do documento para o Storage e devolve o caminho gravado.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * O envio de documentos era só aparência. A tela guardava o NOME e o TAMANHO
 * do arquivo escolhido e nada mais — o conteúdo nunca era lido nem enviado.
 * O aluno clicava, via "ENVIADO", e acreditava ter entregue o RG. A secretaria
 * via o mesmo "ENVIADO" e achava que tinha documento para conferir. Não havia
 * arquivo nenhum, e ninguém descobria até precisar dele de verdade.
 *
 * O servidor já estava pronto desde sempre: balde privado, limite de 5 MB,
 * apenas PDF e imagem, cada aluno isolado na própria pasta pelas regras de
 * acesso. Faltava só o navegador fazer a sua parte.
 *
 * O caminho é `<id_do_aluno>/<tipo>_<carimbo>.<ext>`. A pasta com o id do aluno
 * não é organização: é o que as regras do Storage conferem para impedir que um
 * aluno alcance o documento do outro.
 */
export async function enviarArquivoDeDocumento(
  studentId: string,
  tipoDocumento: string,
  arquivo: File
): Promise<{ ok: boolean; caminho?: string; erro?: string }> {
  if (!supabaseConfigurado) return { ok: false, erro: 'Banco não configurado.' };
  if (!studentId) return { ok: false, erro: 'Documento sem aluno.' };
  if (!arquivo) return { ok: false, erro: 'Nenhum arquivo escolhido.' };

  // As mesmas travas do servidor, conferidas antes de subir: assim o aluno
  // recebe uma frase clara em vez de um erro de rede depois da espera.
  const LIMITE = 5 * 1024 * 1024;
  if (arquivo.size > LIMITE) {
    return { ok: false, erro: `O arquivo tem ${(arquivo.size / 1048576).toFixed(1)} MB. O limite é 5 MB.` };
  }
  const aceitos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!aceitos.includes(arquivo.type)) {
    return { ok: false, erro: 'Formato não aceito. Envie PDF, JPG, PNG ou WEBP.' };
  }

  const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const tipoLimpo = tipoDocumento.replace(/[^\w-]/g, '_').toUpperCase();
  const caminho = `${studentId}/${tipoLimpo}_${Date.now()}.${extensao}`;

  const { error } = await supabase.storage
    .from('documentos-alunos')
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('row-level security') || msg.includes('unauthorized')) {
      return { ok: false, erro: 'Sem permissão para enviar este documento.' };
    }
    if (msg.includes('bucket') && msg.includes('not found')) {
      return { ok: false, erro: 'O espaço de arquivos não existe no servidor. Rode supabase/01_schema_e_seguranca.sql.' };
    }
    console.error('[Storage] enviar documento:', error.message);
    return { ok: false, erro: error.message };
  }
  return { ok: true, caminho };
}

/**
 * Gera um link temporário para abrir ou baixar o documento.
 *
 * O balde é privado — não existe endereço fixo. Cada consulta gera um link que
 * expira, e é o próprio Storage que confere se quem pediu tem direito: a
 * secretaria alcança qualquer aluno, o aluno só a própria pasta.
 *
 * Uma hora de validade é suficiente para conferir ou baixar, e curto o bastante
 * para que um link copiado por engano não vire acesso permanente ao RG de
 * alguém.
 */
export async function linkDoDocumento(caminho: string): Promise<string | null> {
  if (!supabaseConfigurado || !caminho) return null;
  const { data, error } = await supabase.storage
    .from('documentos-alunos')
    .createSignedUrl(caminho, 3600);
  if (error) {
    console.error('[Storage] link do documento:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

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
    supabase.from('cursos').select('*').order('nome'),
    supabase.from('disciplinas').select('*').order('curso_id').order('modulo').order('nome'),
    // ORDEM FIXA, DE PROPÓSITO.
    //
    // Sem `order`, o Postgres devolve na ordem física das linhas — que muda
    // conforme a tabela é atualizada. Como a tela usava "a primeira turma do
    // período" para corrigir escolhas inválidas, o destino do aluno mudava de
    // um dia para o outro sem ninguém mexer em nada. Foi o que fez a pendência
    // "turma errada na matrícula" parecer aleatória por semanas.
    supabase.from('turmas').select('*').order('ano').order('semestre').order('curso_id').order('modulo').order('nome'),
    supabase.from('professores').select('*').order('nome'),
    supabase.from('alunos').select('*').order('nome'),
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
    dependencySubjectId: t.disciplina_dependencia_id ?? undefined,
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
    // SEM ISTO, A TELA NÃO SABIA DIFERENCIAR "TEM LOGIN" DE "NÃO TEM
    // LOGIN". Excluir o acesso de um professor apaga só a conta de login
    // (tabela `usuarios`) — a ficha dele aqui continua existindo de
    // propósito (preserva notas, diários, histórico). Só que esta lista
    // nunca lia `usuario_id`, então a pessoa reaparecia em "Gerenciar
    // Usuários Cadastrados" exatamente como antes, mesmo sem acesso
    // nenhum — parecia que a exclusão não tinha feito nada.
    contaId: p.usuario_id ?? undefined,
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
    // O sexo decide se o Certificado de Reservista entra na lista de
    // documentos obrigatórios. Estava no banco e não era lido.
    sexo: a.sexo ?? undefined,
    phone: a.telefone ?? undefined,
    courseId: a.curso_id ?? undefined,
    classId: a.turma_id ?? undefined,
    status: a.situacao,
    active: a.situacao === 'ATIVO',
    // Mesmo motivo do professor logo acima: sem isto, excluir o acesso de
    // um aluno não tinha como aparecer na tela — a ficha dele é
    // preservada de propósito (notas, frequência, histórico), mas a
    // lista de contas de login precisa saber que o login sumiu.
    contaId: a.usuario_id ?? undefined,
  })) as User[];

  return { courses, subjects, classes, users: [...professores, ...alunos] };
}

/**
 * Reconstrói o "Histórico de Dependências" DIRETO das tabelas reais
 * (matriculas + turmas + alunos) — em vez de depender do retrato geral do
 * sistema, que é onde essa lista vinha até agora.
 *
 * POR QUE ISTO PRECISOU EXISTIR
 *
 * "Histórico de Dependências (0)" aparecia sempre zerado, mesmo com alunos
 * matriculados de verdade (o diário deles funcionava, a nota gravava — o
 * problema era só essa lista de acompanhamento). Causa: essa lista nunca
 * teve tabela própria no banco. Ela só existia dentro do retrato geral do
 * sistema (o mesmo JSON único usado para mensagens, calendário etc.) — que
 * só é regravado quando ADMIN/SECRETARIA está com a aba aberta tempo
 * suficiente, e é sobrescrito por completo a cada gravação. Se existissem
 * duas pessoas da gestão logadas ao mesmo tempo, a aba que gravasse por
 * último apagava a dependência que a outra tinha acabado de matricular.
 *
 * A matrícula de dependência em si sempre foi salva direito, na tabela
 * `matriculas` de verdade (é o que faz o diário e a nota funcionarem) — só
 * a "lista bonita" pra mostrar na tela é que nunca foi lida de lá. Esta
 * função lê exatamente dessa fonte confiável.
 */
export async function carregarDependencias(): Promise<DependencyEnrollment[] | null> {
  if (!supabaseConfigurado) return null;

  const { data, error } = await supabase
    .from('matriculas')
    .select(`
      aluno_id, turma_id, data_matricula,
      alunos ( nome, matricula ),
      turmas!inner ( curso_id, disciplina_dependencia_id, semestre, horario, eh_dependencia )
    `)
    .eq('turmas.eh_dependencia', true);

  if (error) {
    console.warn('[Banco] Falha ao carregar histórico de dependências:', error.message);
    return null;
  }

  return (data ?? []).map((m: any): DependencyEnrollment => ({
    id: `dep_${m.aluno_id}_${m.turma_id}`,
    studentId: m.aluno_id,
    studentName: m.alunos?.nome || '',
    enrollment: m.alunos?.matricula || '',
    courseId: m.turmas?.curso_id || '',
    subjectId: m.turmas?.disciplina_dependencia_id || '',
    semester: m.turmas?.semestre ?? 1,
    schedule: m.turmas?.horario || '',
    createdClassId: m.turma_id,
    createdAt: m.data_matricula || new Date().toISOString(),
    status: 'ATIVO',
  }));
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
