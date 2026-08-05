/**
 * Camada de nuvem do portal — substitui o antigo src/lib/firebase.ts.
 *
 * Mantém os MESMOS nomes de função que o AppContext já usava, para que a troca
 * não exija reescrever os pontos de chamada.
 *
 * Diferenças em relação ao Firebase que estava aqui antes:
 *
 *  1. O estado não vai mais para um único documento do Firestore, que tinha
 *     limite rígido de 1 MiB. Vai para o Storage do Supabase, sem esse limite —
 *     era esse limite que fazia as notas "sumirem" em silêncio.
 *  2. Falha de gravação NÃO é mais engolida: quem chamar recebe `false` e a
 *     interface precisa avisar o usuário.
 *  3. O balde é privado e as políticas RLS só liberam para ADMIN/SECRETARIA.
 *     Antes, qualquer visitante anônimo do site conseguia ler e apagar tudo.
 */

import { supabase, supabaseConfigurado } from './supabase';

export const bancoDisponivel = supabaseConfigurado;

const BALDE_BACKUPS = 'backups';
const ARQUIVO_ESTADO = 'estado/portal_estado.json';

/**
 * Marca da geração dos dados.
 *
 * Serve para um caso concreto que aconteceu: ao limpar o sistema para começar
 * do zero, o navegador era limpo — mas na recarga seguinte o portal baixava do
 * servidor o retrato ANTIGO do estado e restaurava os dados de demonstração
 * por cima. Os cursos "voltavam do nada".
 *
 * Agora, retratos gravados com uma marca diferente desta são ignorados.
 * Ao limpar o sistema, basta subir esta marca.
 */
const ESQUEMA_ATUAL = 'v10';

/* ------------------------------------------------------------------ tipos */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SystemStatePayload {
  users: any[];
  courses: any[];
  classes: any[];
  subjects: any[];
  grades: any[];
  attendance: any[];
  directAbsences?: Record<string, number>;
  conceptRanges: any[];
  calendarEvents: any[];
  messages: any[];
  notifications: any[];
  currentPeriod: string;
  periods: string[];
  simulatedDate: string;
  autoLockEnabled: boolean;
  securityLogs: any[];
  declarationConfigs?: any;
  studentDocuments?: any[];
  internships?: any[];
  staffMembers?: any[];
  dependencies?: any[];
  lastBackupTime?: string;
  version?: string;
  adminPasswordResetDone?: boolean;
}

export interface StorageBackupFile {
  name: string;
  timeCreated: string;
  url: string;
  size: number;
}

export function isPermissionError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    error.code === '42501' ||
    error.statusCode === '403' ||
    msg.includes('permission') ||
    msg.includes('row-level security') ||
    msg.includes('not authorized') ||
    msg.includes('insufficient')
  );
}

/**
 * Toda gravação/leitura sem sessão ativa é recusada de saída.
 *
 * MAS "SEM SESSÃO AGORA" NÃO É O MESMO QUE "SESSÃO EXPIRADA".
 *
 * Ao trocar a senha, o Supabase substitui o token de acesso. Existe uma fração
 * de segundo em que o antigo já não vale e o novo ainda não chegou. Se uma
 * gravação cair exatamente nessa janela, ela era recusada e o portal acendia o
 * aviso "ALTERAÇÕES AINDA NÃO SALVAS", com o motivo "A sessão expirou".
 *
 * Os dois eram falsos: a sessão estava saudável um segundo depois — medido, com
 * o token válido por mais de uma hora — e o aviso ficava aceso porque nada o
 * apaga. Todo aluno e professor passa por essa tela no primeiro acesso; é o
 * pior momento possível para o sistema parecer quebrado.
 *
 * Agora, antes de desistir, esperamos a sessão nova chegar. Só depois de três
 * tentativas em cerca de um segundo e meio é que a ausência é tratada como
 * expiração de verdade.
 */
async function temSessao(): Promise<boolean> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    if (tentativa < 2) await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

/**
 * Motivo da última falha de gravação.
 *
 * O aviso amarelo de "alterações não salvas" dizia apenas que algo deu errado.
 * Sem o motivo, descobrir a causa exigia abrir o console do navegador — coisa
 * que a secretaria da escola não vai fazer. Agora o motivo aparece na tela.
 */
let ultimoMotivoDeFalha = '';
export function motivoDaUltimaFalha(): string {
  return ultimoMotivoDeFalha;
}

/**
 * O aviso laranja acendia SEM MOTIVO quando quem falhava era a gravação nas
 * tabelas (cursos, turmas, alunos), e não o retrato de estado. Esta variável
 * só era escrita aqui dentro; a falha da estrutura ia parar apenas no log de
 * segurança, que ninguém abre. Pior: o banner podia exibir um motivo velho,
 * de outro problema já resolvido.
 *
 * `publicarEstrutura` agora reporta por aqui.
 */
export function registrarFalhaDeGravacao(motivo: string): void {
  ultimoMotivoDeFalha = motivo;
}

export function limparFalhaDeGravacao(): void {
  ultimoMotivoDeFalha = '';
}

/* ------------------------------------------------- estado geral do portal */

/**
 * Grava o estado do portal na nuvem.
 * Retorna `false` em qualquer falha — e quem chamou DEVE avisar o usuário.
 */
export async function saveStateToCloud(state: SystemStatePayload): Promise<boolean> {
  if (!bancoDisponivel) {
    ultimoMotivoDeFalha = 'O endereço do banco de dados não foi configurado nesta instalação.';
    return false;
  }
  if (!(await temSessao())) {
    ultimoMotivoDeFalha = 'A sessão expirou. Saia e entre novamente.';
    console.warn('[Nuvem] Gravação recusada: nenhuma sessão ativa.');
    return false;
  }

  try {
    // FONTE ÚNICA DE VERDADE
    //
    // Cursos, disciplinas, turmas, professores, alunos, notas e o calendário
    // acadêmico têm tabelas próprias — é de lá que devem ser lidos. Se também
    // fossem gravados aqui, existiriam duas versões da mesma informação, e elas
    // discordariam.
    //
    // Isso não é teoria: aconteceu. Limpar as tabelas não surtia efeito, porque
    // este retrato restaurava os dados apagados na recarga seguinte.
    //
    // O calendário entrou nesta lista depois: as datas de fechamento travam o
    // lançamento de nota da escola inteira, e num retrato gravado por completo
    // dois administradores mexendo ao mesmo tempo se sobrescreviam.
    const { users, courses, classes, subjects, grades, calendarEvents, ...semDuplicidade } = state;

    const conteudo = JSON.stringify({
      ...semDuplicidade,
      lastBackupTime: new Date().toISOString(),
      version: '2.1.0-supabase',
      esquemaDados: ESQUEMA_ATUAL,
    });

    const { error } = await supabase.storage
      .from(BALDE_BACKUPS)
      .upload(ARQUIVO_ESTADO, new Blob([conteudo], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      });

    if (error) {
      ultimoMotivoDeFalha = isPermissionError(error)
        ? `O banco recusou a gravação por falta de permissão (${error.message}). ` +
          'Verifique se o balde "backups" existe no Storage do Supabase e se as ' +
          'políticas de acesso da gestão foram aplicadas.'
        : error.message;
      console.error('[Nuvem] Falha ao gravar o estado:', error.message);
      return false;
    }
    ultimoMotivoDeFalha = '';
    return true;
  } catch (erro: any) {
    ultimoMotivoDeFalha = erro?.message || String(erro);
    console.error('[Nuvem] Erro inesperado ao gravar:', erro?.message || erro);
    return false;
  }
}

/**
 * Lê o estado do portal.
 * Devolve `null` se ainda não existe nada salvo, ou `{ isOffline: true }` se
 * não foi possível falar com o servidor.
 */
export async function loadStateFromCloud(): Promise<SystemStatePayload | null | { isOffline: boolean }> {
  if (!bancoDisponivel) return { isOffline: true };
  if (!(await temSessao())) return { isOffline: true };

  try {
    const { data, error } = await supabase.storage.from(BALDE_BACKUPS).download(ARQUIVO_ESTADO);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      // "not found" = banco ainda vazio, primeira execução. Não é erro.
      if (msg.includes('not found') || msg.includes('does not exist')) return null;
      console.error('[Nuvem] Falha ao ler o estado:', error.message);
      return { isOffline: true };
    }
    if (!data) return null;

    const estado = JSON.parse(await data.text()) as SystemStatePayload & { esquemaDados?: string };

    // Retrato de uma geração anterior: ignora, senão traria de volta os dados
    // que acabaram de ser apagados na limpeza do sistema.
    if (estado?.esquemaDados !== ESQUEMA_ATUAL) {
      console.info('[Nuvem] Retrato antigo encontrado no servidor e ignorado (geração anterior).');
      return null;
    }

    return estado;
  } catch (erro: any) {
    console.error('[Nuvem] Erro inesperado ao ler:', erro?.message || erro);
    return { isOffline: true };
  }
}

/* ----------------------------------------------------- cópias de segurança */

export async function uploadBackupToStorage(
  state: SystemStatePayload,
  filename: string
): Promise<string | null> {
  if (!bancoDisponivel || !(await temSessao())) return null;

  try {
    const nomeSeguro = filename.replace(/[^\w.\-]/g, '_');
    const caminho = `manuais/${nomeSeguro}`;
    const conteudo = JSON.stringify(state, null, 2);

    const { error } = await supabase.storage
      .from(BALDE_BACKUPS)
      .upload(caminho, new Blob([conteudo], { type: 'application/json' }), {
        upsert: true,
        contentType: 'application/json',
      });

    if (error) {
      console.error('[Nuvem] Falha ao enviar backup:', error.message);
      return null;
    }

    const { data } = await supabase.storage.from(BALDE_BACKUPS).createSignedUrl(caminho, 3600);
    return data?.signedUrl ?? null;
  } catch (erro: any) {
    console.error('[Nuvem] Erro ao enviar backup:', erro?.message || erro);
    return null;
  }
}

export async function listBackupsFromStorage(): Promise<StorageBackupFile[]> {
  if (!bancoDisponivel || !(await temSessao())) return [];

  try {
    const { data, error } = await supabase.storage
      .from(BALDE_BACKUPS)
      .list('manuais', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
      console.error('[Nuvem] Falha ao listar backups:', error.message);
      return [];
    }

    const arquivos: StorageBackupFile[] = [];
    for (const item of data ?? []) {
      const { data: link } = await supabase.storage
        .from(BALDE_BACKUPS)
        .createSignedUrl(`manuais/${item.name}`, 3600);
      arquivos.push({
        name: item.name,
        timeCreated: item.created_at ?? new Date().toISOString(),
        url: link?.signedUrl ?? '',
        size: (item.metadata as any)?.size ?? 0,
      });
    }
    return arquivos;
  } catch (erro: any) {
    console.error('[Nuvem] Erro ao listar backups:', erro?.message || erro);
    return [];
  }
}

export async function deleteBackupFromStorage(filename: string): Promise<boolean> {
  if (!bancoDisponivel || !(await temSessao())) return false;

  const { error } = await supabase.storage
    .from(BALDE_BACKUPS)
    .remove([`manuais/${filename.replace(/[^\w.\-]/g, '_')}`]);

  if (error) {
    console.error('[Nuvem] Falha ao apagar backup:', error.message);
    return false;
  }
  return true;
}

/* ------------------------------------------------------ aviso de mudanças */

/**
 * Avisa quando outro usuário alterar dados, substituindo o antigo onSnapshot.
 * Devolve a função para cancelar a inscrição.
 */
export function assinarMudancas(aoMudar: () => void): () => void {
  if (!bancoDisponivel) return () => {};

  const canal = supabase
    .channel('portal-mudancas')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notas' }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'frequencia' }, aoMudar)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alunos' }, aoMudar)
    .subscribe();

  return () => {
    try { supabase.removeChannel(canal); } catch { /* ignora */ }
  };
}
