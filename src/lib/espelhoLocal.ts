/**
 * Espelho do armazenamento do navegador no servidor.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 *
 * Vários módulos do portal — CRM, movimentação (estágios, minicursos,
 * requerimentos), cadastros detalhados, financeiro, painéis e marcações feitas
 * pelo próprio aluno — gravam direto no `localStorage` do navegador, em 70+
 * pontos diferentes do código. Nada disso chegava ao servidor. Na prática:
 * limpar o navegador, trocar de computador ou abrir de outra máquina
 * significava perder tudo.
 *
 * COMO FUNCIONA
 *
 * Em vez de reescrever esses 70 pontos (demorado e arriscado), este arquivo
 * intercepta o próprio `localStorage`. Toda gravação continua acontecendo
 * normalmente no navegador E é copiada para a tabela `registros_modulo` do
 * banco. Ao entrar, o conteúdo é restaurado do servidor antes das telas abrirem.
 *
 * O QUE ENTRA NO ESPELHO
 *
 * Tudo, por padrão. Antes era o contrário: só três prefixos eram espelhados, e
 * qualquer chave nova nascia fora do banco sem ninguém perceber. Foi assim que
 * `oc_custom_dashboard_widgets`, `oc_backup_schedule` e a marcação de seguro de
 * estágio do aluno ficaram só no navegador.
 *
 * A lista abaixo (`NAO_ESPELHAR`) é o inverso: nomes que NÃO devem ir, ou
 * porque já têm tabela/retrato próprio no servidor — e gravar duas vezes cria
 * duas versões da mesma informação, que discordam — ou porque só fazem sentido
 * naquele navegador (tema escuro, token de sessão).
 *
 * ALUNO E GESTÃO NÃO SE MISTURAM
 *
 * Gestão (ADMIN/SECRETARIA) espelha os dados administrativos, gravados com
 * `aluno_id` vazio. O aluno espelha apenas as próprias marcações, gravadas com
 * o `aluno_id` dele — e o banco (RLS) só o deixa ler e escrever essas. Na
 * restauração cada um lê somente o seu conjunto.
 */

import { supabase, supabaseConfigurado } from './supabase';

const MODULO = 'navegador';
const ENTIDADE = 'chave';

/** Acima disso o valor não vai para o servidor (evita estourar a requisição). */
const TAMANHO_MAXIMO = 4 * 1024 * 1024;   // 4 MB por chave

/**
 * Chaves que NÃO vão para `registros_modulo`.
 *
 * Dois motivos distintos, marcados em cada bloco. Antes de acrescentar algo
 * aqui, confirme em qual dos dois casos a chave se encaixa — se não se encaixar
 * em nenhum, ela deve ser espelhada.
 */
const NAO_ESPELHAR = {
  /** Só vale neste navegador: sessão, token, preferência visual. */
  locais: [
    'oc_dark_mode',
    'oc_ls_version',
    'oc_current_user',
    'oc_active_class_id',
    'oc_active_subject_id',
    'oc_last_local_write_time',
    'oc_last_cloud_backup_time',
    'coc_portal_sessao',
  ],
  /** Já viajam no retrato do estado (nuvem.ts) ou têm tabela própria. */
  jaSalvasEmOutroLugar: [
    'oc_users', 'oc_courses', 'oc_classes', 'oc_subjects', 'oc_grades',
    'oc_attendance', 'oc_direct_absences', 'oc_concept_ranges',
    'oc_calendar_events', 'oc_messages', 'oc_notifications',
    'oc_current_period', 'oc_periods', 'oc_simulated_date',
    'oc_auto_lock_enabled', 'oc_security_logs', 'oc_declaration_configs',
    'oc_student_documents', 'oc_internships', 'oc_staff_members',
    'oc_dependencies', 'oc_admin_reset_done',
  ],
  /**
   * Prefixos de terceiros que nunca devem sair do navegador.
   *
   * `__` pega os rastreadores e bibliotecas externas, que costumam usar dois
   * sublinhados. Não é dado da escola e só encheria a tabela de lixo.
   */
  prefixosProibidos: ['sb-', 'supabase.', '__'],
};

const IGNORADAS = new Set([...NAO_ESPELHAR.locais, ...NAO_ESPELHAR.jaSalvasEmOutroLugar]);

function deveEspelhar(chave: string): boolean {
  if (IGNORADAS.has(chave)) return false;
  if (NAO_ESPELHAR.prefixosProibidos.some(p => chave.startsWith(p))) return false;
  return true;
}

/* ------------------------------------------------------------ estado interno */

let ativo = false;
let setOriginal: ((k: string, v: string) => void) | null = null;
let removeOriginal: ((k: string) => void) | null = null;

/**
 * Quando quem está usando o portal é um aluno, guarda o id dele. As linhas são
 * gravadas com esse id e o banco só libera as dele. Vazio = gestão.
 */
let alunoDono: string | null = null;

/** chave -> valor (null significa "foi apagada") */
const pendentes = new Map<string, string | null>();
let temporizador: ReturnType<typeof setTimeout> | null = null;

export type AoFalhar = (mensagem: string) => void;
let aoFalhar: AoFalhar | null = null;

/* --------------------------------------------------------------- restauração */

/**
 * Traz do servidor o conteúdo espelhado e devolve ao navegador.
 * Precisa rodar ANTES das telas montarem, senão elas leem o armazenamento vazio.
 *
 * `alunoId` presente = restaura só as marcações daquele aluno.
 * `alunoId` vazio     = restaura os dados administrativos (gestão).
 */
export async function restaurarDoServidor(
  alunoId?: string | null
): Promise<{ ok: boolean; restauradas: number; erro?: string }> {
  if (!supabaseConfigurado) return { ok: false, restauradas: 0, erro: 'Banco não configurado.' };

  let consulta = supabase
    .from('registros_modulo')
    .select('ref_externa, dados')
    .eq('modulo', MODULO)
    .eq('entidade', ENTIDADE);

  // Sem este filtro, a gestão traria também as marcações dos alunos e as
  // escreveria por cima das próprias chaves de mesmo nome.
  consulta = alunoId ? consulta.eq('aluno_id', alunoId) : consulta.is('aluno_id', null);

  const { data, error } = await consulta;

  if (error) {
    console.warn('[Espelho] Falha ao restaurar do servidor:', error.message);
    return { ok: false, restauradas: 0, erro: error.message };
  }

  const gravar = setOriginal ?? ((k: string, v: string) => window.localStorage.setItem(k, v));
  let n = 0;
  for (const linha of data ?? []) {
    const dados = (linha as any).dados ?? {};
    // Linhas de aluno guardam `ref_externa` como "<id do aluno>::<chave>" para
    // não colidirem entre si; o nome verdadeiro da chave vem em `dados.chave`.
    const chave = (typeof dados.chave === 'string' ? dados.chave : null)
      ?? ((linha as any).ref_externa as string | null);
    const valor = dados.valor;
    if (chave && typeof valor === 'string') {
      try { gravar(chave, valor); n++; } catch { /* cota do navegador cheia */ }
    }
  }

  console.info(`[Espelho] ${n} conjunto(s) de dados restaurado(s) do servidor.`);
  return { ok: true, restauradas: n };
}

/* ------------------------------------------------- primeira carga do que já existe */

/**
 * Manda para o servidor tudo que JÁ está no navegador.
 *
 * A interceptação só enxerga gravações NOVAS. Sem isto, um dado escrito antes
 * de o espelho existir — ou antes desta correção — ficava parado no navegador
 * para sempre, porque ninguém o reescrevia. Foi o caso das aulas previstas e
 * dadas de cada diário (`oc_header_...`): estavam na tela, mas não no banco.
 *
 * Roda DEPOIS de `restaurarDoServidor`, nunca antes. Nessa ordem o servidor já
 * sobrescreveu o navegador, então o que sobe aqui é só o que existe apenas
 * localmente. Ao contrário, o navegador desatualizado apagaria o servidor.
 */
export function enviarTudoQueJaExiste(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;

  const armazenamento = window.localStorage;
  let n = 0;

  for (let i = 0; i < armazenamento.length; i++) {
    const chave = armazenamento.key(i);
    if (!chave || !deveEspelhar(chave)) continue;

    const valor = armazenamento.getItem(chave);
    if (valor === null || valor.length > TAMANHO_MAXIMO) continue;

    pendentes.set(chave, valor);
    n++;
  }

  if (n > 0) {
    console.info(`[Espelho] ${n} conjunto(s) que só existiam no navegador enviados ao servidor.`);
    agendarEnvio();
  }
  return n;
}

/* ------------------------------------------------------------- envio ao banco */

async function descarregar(): Promise<void> {
  if (pendentes.size === 0) return;

  const lote = Array.from(pendentes.entries());
  pendentes.clear();

  const paraGravar = lote.filter(([, v]) => v !== null) as [string, string][];
  const paraApagar = lote.filter(([, v]) => v === null).map(([k]) => k);

  try {
    if (paraGravar.length) {
      const linhas = paraGravar.map(([chave, valor]) => ({
        modulo: MODULO,
        entidade: ENTIDADE,
        ref_externa: alunoDono ? `${alunoDono}::${chave}` : chave,
        aluno_id: alunoDono,
        dados: { valor, chave },
      }));

      const { error } = await supabase
        .from('registros_modulo')
        .upsert(linhas, { onConflict: 'modulo,entidade,ref_externa' });

      if (error) {
        console.error('[Espelho] Falha ao gravar no servidor:', error.message);
        aoFalhar?.(error.message);
        // Devolve para a fila: tenta de novo no próximo ciclo.
        for (const [k, v] of paraGravar) if (!pendentes.has(k)) pendentes.set(k, v);
        return;
      }
    }

    if (paraApagar.length) {
      const { error } = await supabase
        .from('registros_modulo')
        .delete()
        .eq('modulo', MODULO)
        .eq('entidade', ENTIDADE)
        .in('ref_externa', paraApagar.map(k => (alunoDono ? `${alunoDono}::${k}` : k)));
      if (error) console.warn('[Espelho] Falha ao remover do servidor:', error.message);
    }
  } catch (erro: any) {
    console.error('[Espelho] Erro inesperado ao sincronizar:', erro?.message || erro);
    aoFalhar?.(erro?.message || 'Erro ao sincronizar com o servidor.');
    for (const [k, v] of paraGravar) if (!pendentes.has(k)) pendentes.set(k, v);
  }
}

function agendarEnvio(): void {
  if (temporizador) clearTimeout(temporizador);
  // Espera a digitação parar antes de enviar, para não gerar uma
  // requisição por tecla pressionada.
  temporizador = setTimeout(() => { void descarregar(); }, 1500);
}

/* --------------------------------------------------------- ligar e desligar */

export function iniciarEspelho(opcoes?: { aoFalhar?: AoFalhar; alunoId?: string | null }): void {
  if (ativo || typeof window === 'undefined' || !window.localStorage) return;
  if (!supabaseConfigurado) return;

  aoFalhar = opcoes?.aoFalhar ?? null;
  alunoDono = opcoes?.alunoId ?? null;

  const armazenamento = window.localStorage;
  setOriginal = armazenamento.setItem.bind(armazenamento);
  removeOriginal = armazenamento.removeItem.bind(armazenamento);

  armazenamento.setItem = function (chave: string, valor: string) {
    setOriginal!(chave, valor);
    if (deveEspelhar(chave)) {
      if (valor && valor.length > TAMANHO_MAXIMO) {
        console.warn(`[Espelho] "${chave}" tem ${(valor.length / 1048576).toFixed(1)} MB e não foi enviado ao servidor.`);
        aoFalhar?.(`O item "${chave}" ficou grande demais para ser salvo no servidor.`);
        return;
      }
      pendentes.set(chave, valor);
      agendarEnvio();
    }
  };

  armazenamento.removeItem = function (chave: string) {
    removeOriginal!(chave);
    if (deveEspelhar(chave)) {
      pendentes.set(chave, null);
      agendarEnvio();
    }
  };

  // Última tentativa de salvar quando a aba é fechada.
  window.addEventListener('beforeunload', enviarAgora);

  ativo = true;
  console.info(`[Espelho] Sincronização com o servidor ativada${alunoDono ? ' (aluno)' : ''}.`);
}

export function pararEspelho(): void {
  if (!ativo || typeof window === 'undefined') return;

  void descarregar();

  if (setOriginal) window.localStorage.setItem = setOriginal;
  if (removeOriginal) window.localStorage.removeItem = removeOriginal;
  window.removeEventListener('beforeunload', enviarAgora);

  setOriginal = null;
  removeOriginal = null;
  aoFalhar = null;
  alunoDono = null;
  ativo = false;
}

/** Força o envio imediato do que estiver pendente. */
export function enviarAgora(): void {
  if (temporizador) { clearTimeout(temporizador); temporizador = null; }
  void descarregar();
}

export function espelhoAtivo(): boolean {
  return ativo;
}

export function pendenciasEmEspera(): number {
  return pendentes.size;
}
