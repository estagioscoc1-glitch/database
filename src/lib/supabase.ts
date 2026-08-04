/**
 * Conexão com o Supabase (banco de dados, autenticação e arquivos).
 *
 * Substitui o antigo src/lib/firebase.ts.
 *
 * Segurança: a chave usada aqui é a chave PÚBLICA (anon/publishable). Ela fica
 * visível no navegador de qualquer visitante — e tudo bem. A proteção real está
 * nas políticas RLS dentro do banco: mesmo com esta chave em mãos, o Postgres
 * só devolve as linhas que o usuário logado tem direito de ver.
 */

import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import { UserRole, type User } from '../types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(URL && CHAVE);

if (!supabaseConfigurado) {
  console.error(
    '[Supabase] Faltam as variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY. ' +
    'Crie o arquivo .env.local na raiz do projeto. O portal funcionará apenas em modo local.'
  );
}

/** Nome da chave onde a sessão fica guardada no navegador. */
export const CHAVE_DA_SESSAO = 'coc_portal_sessao';

export const supabase: SupabaseClient = createClient(
  URL ?? 'https://indisponivel.supabase.co',
  CHAVE ?? 'chave-ausente',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: CHAVE_DA_SESSAO,
    },
  }
);

/* ==========================================================================
 * GRAVAÇÃO DIRETA (sem a biblioteca)
 * ========================================================================== */

/**
 * Fala com o banco por HTTP puro, sem passar pela biblioteca do Supabase.
 *
 * POR QUE ISTO EXISTE
 *
 * Numa gravação específica — o cabeçalho do diário — a chamada feita pela
 * biblioteca ficava pendurada para sempre: não devolvia dado, não devolvia
 * erro, não estourava exceção. A tela mostrava "Salvando..." indefinidamente.
 *
 * A MESMA requisição, feita por HTTP direto, respondia em menos de um segundo
 * e gravava corretamente. Isso foi medido, não suposto.
 *
 * Não descobrimos qual camada interna da biblioteca travava (renovação de
 * token, fila de requisições ou adaptador de armazenamento). Descobrir isso
 * levaria tempo que não temos, e o resultado prático seria o mesmo: para esta
 * gravação, o caminho direto é confiável e o outro não.
 *
 * O `tempoLimite` é inegociável: uma resposta que nunca chega é indistinguível
 * de um sistema quebrado, e foi exatamente o que fez esse problema demorar
 * tanto para ser encontrado.
 */
export async function chamarBancoDireto(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown; tempoLimite?: number } = {}
): Promise<{ ok: boolean; status: number; dados: any[]; erro?: string }> {
  if (!URL || !CHAVE) {
    return { ok: false, status: 0, dados: [], erro: 'O portal não está conectado ao banco de dados.' };
  }

  // O token vem direto do navegador, não da biblioteca: se a biblioteca estiver
  // travada, pedir a sessão a ela travaria junto.
  let token = '';
  try {
    token = JSON.parse(localStorage.getItem(CHAVE_DA_SESSAO) || '{}')?.access_token || '';
  } catch { /* sem sessão */ }

  if (!token) {
    return { ok: false, status: 401, dados: [], erro: 'Sua sessão expirou. Saia e entre novamente.' };
  }

  const cancelador = new AbortController();
  const relogio = setTimeout(() => cancelador.abort(), opcoes.tempoLimite ?? 15000);

  try {
    const resposta = await fetch(`${URL}/rest/v1/${caminho}`, {
      method: opcoes.metodo ?? 'GET',
      signal: cancelador.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': CHAVE,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    });

    const texto = await resposta.text();
    let dados: any = [];
    try { dados = texto ? JSON.parse(texto) : []; } catch { dados = []; }

    if (!resposta.ok) {
      const motivo = (dados && dados.message) || (dados && dados.erro) || texto.slice(0, 200) || `erro ${resposta.status}`;
      return { ok: false, status: resposta.status, dados: [], erro: motivo };
    }

    return { ok: true, status: resposta.status, dados: Array.isArray(dados) ? dados : [dados] };
  } catch (erro: any) {
    const foiTempoEsgotado = erro?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      dados: [],
      erro: foiTempoEsgotado
        ? 'o servidor não respondeu a tempo. Verifique sua internet.'
        : (erro?.message || String(erro)),
    };
  } finally {
    clearTimeout(relogio);
  }
}

/* ==========================================================================
 * AUTENTICAÇÃO
 * ========================================================================== */

/** Papel no banco -> papel usado pelo front-end. */
function paraUserRole(papel: string): UserRole {
  switch (papel) {
    case 'ADMIN': return UserRole.ADMIN;
    case 'SECRETARIA': return UserRole.STAFF;
    case 'PROFESSOR': return UserRole.TEACHER;
    default: return UserRole.STUDENT;
  }
}

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  login: string;
  papel: string;
  ativo: boolean;
  trocar_senha: boolean;
}

export interface ResultadoLogin {
  ok: boolean;
  usuario?: User;
  precisaTrocarSenha?: boolean;
  mensagem?: string;
}

/**
 * Descobre o e-mail a partir do login (matrícula do aluno, usuário do professor).
 * Usa uma função do banco, porque a tabela 'usuarios' não é legível antes do login.
 */
async function emailDoLogin(login: string): Promise<string | null> {
  if (login.includes('@')) return login.toLowerCase();
  const { data, error } = await supabase.rpc('email_por_login', { p_login: login });
  if (error) {
    console.warn('[Supabase] Falha ao resolver login:', error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

/**
 * Faz login de verdade: a senha é verificada pelo Supabase Auth, com hash.
 * Não existe senha mestra, nem usuário fixo, nem verificação no navegador.
 */
export async function entrar(login: string, senha: string): Promise<ResultadoLogin> {
  if (!supabaseConfigurado) {
    return { ok: false, mensagem: 'O portal não está conectado ao banco de dados.' };
  }

  const email = await emailDoLogin(login.trim());
  if (!email) {
    // Mensagem propositalmente genérica: não revela se o usuário existe.
    return { ok: false, mensagem: 'Usuário ou senha incorretos.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    return { ok: false, mensagem: 'Usuário ou senha incorretos.' };
  }

  const perfil = await carregarPerfil();
  if (!perfil) {
    await supabase.auth.signOut();
    return { ok: false, mensagem: 'Seu acesso ainda não foi liberado. Procure a secretaria.' };
  }
  if (!perfil.ativo) {
    await supabase.auth.signOut();
    return { ok: false, mensagem: 'Seu acesso está inativo. Procure a secretaria.' };
  }

  return {
    ok: true,
    usuario: await montarUsuario(perfil),
    precisaTrocarSenha: perfil.trocar_senha,
  };
}

export async function sair(): Promise<void> {
  await supabase.auth.signOut();
}

export async function sessaoAtual(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function carregarPerfil(): Promise<PerfilUsuario | null> {
  const { data: sessao } = await supabase.auth.getUser();
  if (!sessao.user) return null;

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, login, papel, ativo, trocar_senha')
    .eq('id', sessao.user.id)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] Falha ao carregar perfil:', error.message);
    return null;
  }
  return (data as PerfilUsuario | null) ?? null;
}

/**
 * Descobre o id na tabela `alunos` a partir do id de login.
 *
 * São dois identificadores diferentes: `usuarios.id` é quem entrou no sistema,
 * `alunos.id` é o registro acadêmico. O portal usa o segundo em quase tudo.
 * Devolve null quando o usuário não é aluno ou ainda não tem ficha.
 */
export async function idDoAlunoLogado(usuarioId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('alunos')
    .select('id')
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) {
    console.warn('[Supabase] Falha ao localizar a ficha do aluno:', error.message);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

/** Monta o objeto User no formato que o resto do sistema já espera. */
export async function montarUsuario(perfil: PerfilUsuario): Promise<User> {
  const base: User = {
    id: perfil.id,
    name: perfil.nome,
    username: perfil.login,
    email: perfil.email,
    role: paraUserRole(perfil.papel),
    active: perfil.ativo,

    // GUARDA O ID DA CONTA DE LOGIN ANTES QUE ELE SE PERCA.
    //
    // Logo abaixo, para aluno e professor, o `base.id` é trocado pelo id da
    // FICHA — e é assim que o resto do sistema trabalha. Só que as mensagens
    // são endereçadas à CONTA (`mensagens.destinatario_id` aponta para
    // `usuarios`), não à ficha.
    //
    // Sem guardar este segundo número, a tela do aluno procurava as mensagens
    // dele pelo id da ficha e nunca achava nada: a mensagem existia no banco,
    // correta, endereçada à pessoa certa, e simplesmente não aparecia. Sem
    // erro nenhum na tela.
    contaId: perfil.id,
  };

  if (base.role === UserRole.STUDENT) {
    const { data } = await supabase
      .from('alunos')
      .select('id, matricula, dossie, curso_id, turma_id, cpf, telefone')
      .eq('usuario_id', perfil.id)
      .maybeSingle();
    if (data) {
      base.id = data.id;               // o resto do sistema usa o id do aluno
      base.enrollment = data.matricula;
      base.dossierNumber = data.dossie ?? undefined;
      base.courseId = data.curso_id ?? undefined;
      base.classId = data.turma_id ?? undefined;
      base.cpf = data.cpf ?? undefined;
      base.phone = data.telefone ?? undefined;
    }
  } else if (base.role === UserRole.TEACHER) {
    const { data } = await supabase
      .from('professores')
      .select('id, matricula, cpf, telefone')
      .eq('usuario_id', perfil.id)
      .maybeSingle();
    if (data) {
      base.id = data.id;
      base.enrollment = data.matricula ?? undefined;
      base.cpf = data.cpf ?? undefined;
      base.phone = data.telefone ?? undefined;

      // OS DIÁRIOS DO PROFESSOR
      //
      // Sem isto o painel docente abria com "Diários Ativos: 0" para todo
      // professor, mesmo com os diários corretamente atribuídos a ele. A tela
      // decide o que mostrar a partir de `assignedJournals`, e este campo nunca
      // era preenchido depois que o portal passou a montar o usuário a partir
      // do banco — ficou para trás na migração.
      //
      // A lista vem da tabela `diarios`, que é a fonte de verdade de quem
      // leciona o quê. Antes dependia de uma cópia guardada no navegador, que
      // podia estar velha ou simplesmente não existir em outro computador.
      const { data: diarios, error: erroDiarios } = await supabase
        .from('diarios')
        .select('turma_id, disciplina_id')
        .eq('professor_id', data.id);

      if (erroDiarios) {
        console.warn('[Supabase] Falha ao carregar os diários do professor:', erroDiarios.message);
      } else {
        base.assignedJournals = (diarios ?? []).map(d => ({
          classId: (d as any).turma_id,
          subjectId: (d as any).disciplina_id,
        }));
      }
    }
  }

  return base;
}

/**
 * Troca a senha do usuário logado. A senha nova vai com hash para o Supabase Auth;
 * em nenhum momento fica guardada em texto no banco ou no navegador.
 */
export async function trocarSenha(novaSenha: string): Promise<{ ok: boolean; mensagem: string }> {
  const problema = validarForcaSenha(novaSenha);
  if (problema) return { ok: false, mensagem: problema };

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { ok: false, mensagem: error.message };

  const { data: sessao } = await supabase.auth.getUser();
  if (sessao.user) {
    await supabase.from('usuarios').update({ trocar_senha: false }).eq('id', sessao.user.id);
  }
  return { ok: true, mensagem: 'Senha alterada com sucesso.' };
}

/** Regra mínima de senha. Vale para todos os perfis. */
export function validarForcaSenha(senha: string): string | null {
  if (!senha || senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(senha)) return 'A senha precisa ter pelo menos uma letra.';
  if (!/[0-9]/.test(senha)) return 'A senha precisa ter pelo menos um número.';
  const fracas = ['12345678', 'senha123', 'password', 'admin123', 'portal123'];
  if (fracas.includes(senha.toLowerCase())) return 'Essa senha é fácil demais de adivinhar.';
  return null;
}

/** Envia e-mail de redefinição de senha (o link é gerado pelo Supabase). */
export async function enviarRecuperacaoSenha(email: string): Promise<{ ok: boolean; mensagem: string }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  // Resposta sempre igual: não revela se o e-mail existe no sistema.
  if (error) console.warn('[Supabase] recuperação de senha:', error.message);
  return {
    ok: true,
    mensagem: 'Se este e-mail estiver cadastrado, você receberá as instruções em instantes.',
  };
}

/* ==========================================================================
 * CRIAÇÃO DE CONTAS DE ACESSO
 * ========================================================================== */

export interface AcessoCriado {
  ok: boolean;
  login?: string;
  senhaInicial?: string;
  mensagem?: string;
}

/**
 * Cria a conta de acesso de um aluno, professor ou funcionário.
 *
 * Isto NÃO acontece no navegador: quem cria a conta é a função `criar-usuario`,
 * no servidor do Supabase. O motivo é que criar conta exige a chave secreta do
 * projeto — a que ignora todas as regras de segurança. Se ela ficasse no site,
 * qualquer visitante teria acesso total ao banco.
 *
 * A senha inicial é gerada lá, aleatória com 14 caracteres, e a pessoa é
 * obrigada a trocá-la no primeiro acesso. Ela é devolvida UMA vez, para a
 * secretaria entregar — depois não há como recuperá-la, só redefinir.
 */
export async function criarAcesso(dados: {
  nome: string;
  login: string;
  papel: 'ALUNO' | 'PROFESSOR' | 'SECRETARIA' | 'ADMIN';
  email?: string;
  vincularA?: string;      // id do aluno/professor já cadastrado
  senha?: string;          // opcional; se vazio, o servidor gera uma forte
}): Promise<AcessoCriado> {
  if (!supabaseConfigurado) {
    return { ok: false, mensagem: 'O portal não está conectado ao banco de dados.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('criar-usuario', {
      body: {
        nome: dados.nome,
        login: dados.login,
        papel: dados.papel,
        email: dados.email ?? '',
        vincular_a: dados.vincularA ?? '',
        senha: dados.senha ?? '',
      },
    });

    if (error) {
      // O corpo da resposta traz a mensagem em português vinda do servidor.
      let detalhe = error.message;
      try {
        const corpo = await (error as any).context?.json?.();
        if (corpo?.erro) detalhe = corpo.erro;
        if (corpo?.diagnostico) {
          console.error('[Acesso] Diagnóstico do servidor:', corpo.diagnostico);
        }
      } catch { /* mantém a mensagem original */ }
      return { ok: false, mensagem: detalhe };
    }

    if (data?.erro) return { ok: false, mensagem: data.erro };

    return { ok: true, login: data?.login, senhaInicial: data?.senha_inicial };
  } catch (erro: any) {
    return { ok: false, mensagem: erro?.message || 'Falha ao falar com o servidor.' };
  }
}

/* ==========================================================================
 * REDEFINIÇÃO DE SENHA (pela secretaria / administração)
 * ========================================================================== */

export interface SenhaRedefinida {
  ok: boolean;
  login?: string;
  nome?: string;
  senhaNova?: string;
  mensagem?: string;
}

/**
 * Gera uma senha nova para outra pessoa.
 *
 * Usado quando aluno ou professor esquece a senha. Eles não recebem link por
 * e-mail porque entram por matrícula/usuário, e a conta foi criada com um
 * e-mail interno que não existe de verdade.
 *
 * A senha antiga NÃO é consultada: ninguém no sistema consegue ver a senha de
 * outra pessoa, nem o administrador. Ela é substituída por uma nova, devolvida
 * uma única vez para a secretaria entregar. Quem recebe é obrigado a trocá-la
 * no primeiro acesso.
 *
 * Quem manda em quem é decidido NO SERVIDOR (função `redefinir-senha`), não
 * aqui: a secretaria só alcança aluno e professor.
 */
export async function redefinirSenhaDeUsuario(alvo: {
  usuarioId?: string;
  fichaId?: string;
  login?: string;
}): Promise<SenhaRedefinida> {
  if (!supabaseConfigurado) {
    return { ok: false, mensagem: 'O portal não está conectado ao banco de dados.' };
  }

  try {
    // A `fichaId` (alunos.id / professores.id) é o caminho preferido.
    //
    // O `login` mostrado na lista de usuários da tela NÃO é confiável para
    // professor: aparecia numerado (1001, 1002...) enquanto o login de verdade
    // no banco era outro. Pedir pela ficha contorna isso — e o servidor devolve
    // o login verdadeiro, que é o que a secretaria precisa entregar à pessoa.
    const { data, error } = await supabase.functions.invoke('redefinir-senha', {
      body: {
        usuario_id: alvo.usuarioId ?? '',
        ficha_id: alvo.fichaId ?? '',
        login: alvo.login ?? '',
      },
    });

    if (error) {
      let detalhe = error.message;
      try {
        const corpo = await (error as any).context?.json?.();
        if (corpo?.erro) detalhe = corpo.erro;
      } catch { /* mantém a mensagem original */ }
      return { ok: false, mensagem: detalhe };
    }

    if (data?.erro) return { ok: false, mensagem: data.erro };

    return {
      ok: true,
      login: data?.login,
      nome: data?.nome,
      senhaNova: data?.senha_nova,
    };
  } catch (erro: any) {
    return { ok: false, mensagem: erro?.message || 'Falha ao falar com o servidor.' };
  }
}

/* ==========================================================================
 * ARQUIVOS (Storage)
 * ========================================================================== */

const BALDE_DOCUMENTOS = 'documentos-alunos';
const BALDE_IMPORTACOES = 'importacoes';

const TIPOS_DOCUMENTO_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const TAMANHO_MAX_DOCUMENTO = 5 * 1024 * 1024;   // 5 MB

/**
 * Envia um documento do aluno. O arquivo vai para uma pasta com o id do aluno,
 * e a política do Storage impede que um aluno alcance a pasta de outro.
 */
export async function enviarDocumentoAluno(
  alunoId: string,
  arquivo: File,
  tipo: string
): Promise<{ ok: boolean; caminho?: string; mensagem?: string }> {
  if (!TIPOS_DOCUMENTO_ACEITOS.includes(arquivo.type)) {
    return { ok: false, mensagem: 'Formato não aceito. Envie uma foto (JPG/PNG) ou um PDF.' };
  }
  if (arquivo.size > TAMANHO_MAX_DOCUMENTO) {
    return { ok: false, mensagem: 'Arquivo muito grande. O limite é 5 MB.' };
  }

  const extensao = (arquivo.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const caminho = `${alunoId}/${tipo}_${Date.now()}.${extensao}`;

  const { error } = await supabase.storage
    .from(BALDE_DOCUMENTOS)
    .upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });

  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, caminho };
}

/**
 * Gera um link temporário para ver um arquivo privado.
 * O link expira, então não pode ser repassado indefinidamente.
 */
export async function linkTemporario(
  caminho: string,
  segundos = 300,
  balde: string = BALDE_DOCUMENTOS
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(balde).createSignedUrl(caminho, segundos);
  if (error) {
    console.warn('[Supabase] Falha ao gerar link do arquivo:', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function enviarPlanilhaImportacao(
  arquivo: File
): Promise<{ ok: boolean; caminho?: string; mensagem?: string }> {
  const caminho = `${new Date().toISOString().slice(0, 10)}/${Date.now()}_${arquivo.name.replace(/[^\w.\-]/g, '_')}`;
  const { error } = await supabase.storage
    .from(BALDE_IMPORTACOES)
    .upload(caminho, arquivo, { upsert: false });
  if (error) return { ok: false, mensagem: error.message };
  return { ok: true, caminho };
}

export async function removerDocumento(caminho: string, balde = BALDE_DOCUMENTOS): Promise<boolean> {
  const { error } = await supabase.storage.from(balde).remove([caminho]);
  if (error) {
    console.warn('[Supabase] Falha ao remover arquivo:', error.message);
    return false;
  }
  return true;
}
