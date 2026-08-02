/**
 * Função de servidor: criar contas de acesso (aluno, professor, secretaria).
 *
 * POR QUE ISTO EXISTE
 *
 * Criar uma conta de login exige a chave secreta do projeto (service_role).
 * Essa chave ignora TODAS as regras de segurança do banco — se ela fosse
 * parar no site, qualquer visitante teria acesso total a tudo.
 *
 * Por isso a criação de contas acontece aqui, no servidor do Supabase, onde
 * a chave nunca chega ao navegador. E antes de criar qualquer coisa, esta
 * função confere se quem está pedindo é mesmo ADMIN ou SECRETARIA.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ORIGEM_PERMITIDA') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function responder(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Senha inicial forte e aleatória. Nada de usar matrícula ou CPF como senha. */
function gerarSenhaInicial(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, b => alfabeto[b % alfabeto.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405);

  const URL_PROJETO = Deno.env.get('SUPABASE_URL')!;
  const CHAVE_SECRETA = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const CHAVE_PUBLICA = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ---------------------------------------------------------------- 1. quem pediu?
  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.startsWith('Bearer ')) {
    return responder({ erro: 'Não autenticado.' }, 401);
  }

  const clienteDoUsuario = createClient(URL_PROJETO, CHAVE_PUBLICA, {
    global: { headers: { Authorization: autorizacao } },
  });

  const { data: dadosUsuario, error: erroUsuario } = await clienteDoUsuario.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) {
    return responder({ erro: 'Sessão inválida.' }, 401);
  }

  // ------------------------------------------------- 2. essa pessoa PODE cadastrar?
  const admin = createClient(URL_PROJETO, CHAVE_SECRETA, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: perfil, error: erroPerfil } = await admin
    .from('usuarios')
    .select('papel, ativo, nome')
    .eq('id', dadosUsuario.user.id)
    .maybeSingle();

  // Mensagens específicas: "sem permissão" sozinho não permite diagnosticar nada.
  if (erroPerfil) {
    return responder({
      erro: `Não foi possível consultar seu perfil no banco: ${erroPerfil.message}`,
      diagnostico: { etapa: 'consulta_perfil', id: dadosUsuario.user.id },
    }, 500);
  }
  if (!perfil) {
    return responder({
      erro: 'Seu login existe, mas não há perfil correspondente na tabela "usuarios". ' +
            'Rode novamente o arquivo 02_usuario_admin.sql.',
      diagnostico: { etapa: 'perfil_ausente', id: dadosUsuario.user.id, email: dadosUsuario.user.email },
    }, 403);
  }
  if (!perfil.ativo) {
    return responder({ erro: 'Seu usuário está marcado como inativo.' }, 403);
  }
  if (!['ADMIN', 'SECRETARIA'].includes(perfil.papel)) {
    return responder({
      erro: `Seu papel no sistema é "${perfil.papel}". Apenas ADMIN ou SECRETARIA podem cadastrar usuários.`,
      diagnostico: { etapa: 'papel_insuficiente', papel: perfil.papel },
    }, 403);
  }

  // ----------------------------------------------------------- 3. validar a entrada
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400);
  }

  const nome = String(corpo.nome ?? '').trim();
  const login = String(corpo.login ?? '').trim().toLowerCase();
  const papel = String(corpo.papel ?? '').trim().toUpperCase();
  const emailInformado = String(corpo.email ?? '').trim().toLowerCase();
  const vincularA = String(corpo.vincular_a ?? '').trim();   // id do aluno/professor já cadastrado

  if (!nome || nome.length < 3) return responder({ erro: 'Informe o nome completo.' }, 400);
  if (!login || !/^[\w.\-]{3,}$/.test(login)) {
    return responder({ erro: 'Login inválido. Use letras, números, ponto ou hífen.' }, 400);
  }
  if (!['ALUNO', 'PROFESSOR', 'SECRETARIA', 'ADMIN'].includes(papel)) {
    return responder({ erro: 'Papel inválido.' }, 400);
  }

  // CONTAS ADMINISTRATIVAS SÓ SAEM DA MÃO DE UM ADMIN.
  //
  // A secretaria pode cadastrar aluno e professor — é o trabalho dela. Mas não
  // pode criar outra conta de secretaria nem uma de administrador: se pudesse,
  // qualquer conta de secretaria comprometida viraria acesso total ao sistema,
  // e o histórico de quem promoveu quem se perderia.
  if ((papel === 'SECRETARIA' || papel === 'ADMIN') && perfil.papel !== 'ADMIN') {
    return responder({
      erro: `Seu papel é "${perfil.papel}". Apenas o administrador pode criar contas de secretaria ou de administrador.`,
    }, 403);
  }

  // Conta de admin precisa de e-mail real: é a única que não tem quem a
  // redefina por cima caso o acesso se perca.
  if (papel === 'ADMIN' && !emailInformado) {
    return responder({ erro: 'Informe um e-mail real para a conta de administrador.' }, 400);
  }

  const { data: loginExistente } = await admin
    .from('usuarios').select('id').eq('login', login).maybeSingle();
  if (loginExistente) return responder({ erro: `O login "${login}" já está em uso.` }, 409);

  // Sem e-mail real, gera um interno. O portal faz login por matrícula/usuário.
  const email = emailInformado || `${login}@portal.interno.local`;

  // SENHA INICIAL
  //
  // Quando a secretaria informa uma senha (caso dos alunos, que entram com a
  // própria matrícula no primeiro acesso), ela é aceita a partir de 4
  // caracteres. É fraca de propósito, para ser fácil de comunicar — e por isso
  // 'trocar_senha' fica ligado: a pessoa NÃO consegue usar o portal sem trocar.
  //
  // Quando nada é informado (caso dos professores), o servidor gera uma senha
  // aleatória de 14 caracteres.
  const senhaInformada = String(corpo.senha ?? '').trim();
  const senhaInicial = senhaInformada || gerarSenhaInicial();
  const minimo = senhaInformada ? 4 : 8;
  if (senhaInicial.length < minimo) {
    return responder({ erro: `A senha inicial precisa ter pelo menos ${minimo} caracteres.` }, 400);
  }

  // -------------------------------------------------------------- 4. criar a conta
  const { data: contaCriada, error: erroConta } = await admin.auth.admin.createUser({
    email,
    password: senhaInicial,
    email_confirm: true,
    user_metadata: { nome, login, papel },
  });

  if (erroConta || !contaCriada.user) {
    return responder({ erro: `Não foi possível criar a conta: ${erroConta?.message}` }, 400);
  }

  const { error: erroGravarPerfil } = await admin.from('usuarios').insert({
    id: contaCriada.user.id,
    nome, email, login, papel,
    ativo: true,
    trocar_senha: true,           // obriga a trocar no primeiro acesso
  });

  if (erroGravarPerfil) {
    // Desfaz a conta para não deixar lixo no sistema de login.
    await admin.auth.admin.deleteUser(contaCriada.user.id);
    return responder({ erro: `Falha ao gravar o perfil: ${erroGravarPerfil.message}` }, 400);
  }

  // ------------------------------------- 5. vincular ao cadastro de aluno/professor
  //
  // ESTE VÍNCULO NÃO PODE FALHAR EM SILÊNCIO.
  //
  // `usuarios.id` é quem faz login; `alunos.id` é a ficha acadêmica. É o campo
  // `usuario_id` que liga os dois. Sem ele, a pessoa entra no portal e encontra
  // a tela vazia: sem notas, sem turma, sem boletim — porque o sistema não
  // consegue achar a ficha dela.
  //
  // Antes o resultado deste update era descartado. A conta era criada, a tela
  // dizia "acesso criado com sucesso", e o problema só aparecia quando o aluno
  // tentava entrar. Agora, se o vínculo falhar, a conta é desfeita e o erro é
  // dito na hora.
  if (vincularA) {
    const tabela = papel === 'ALUNO' ? 'alunos' : papel === 'PROFESSOR' ? 'professores' : null;
    if (tabela) {
      const { data: vinculado, error: erroVinculo } = await admin
        .from(tabela)
        .update({ usuario_id: contaCriada.user.id })
        .eq('id', vincularA)
        .select('id');

      if (erroVinculo || !vinculado || vinculado.length === 0) {
        await admin.auth.admin.deleteUser(contaCriada.user.id);
        await admin.from('usuarios').delete().eq('id', contaCriada.user.id);
        return responder({
          erro: erroVinculo
            ? `A conta foi criada, mas não foi possível ligá-la à ficha: ${erroVinculo.message}. Nada foi salvo.`
            : `Não existe ficha de ${papel === 'ALUNO' ? 'aluno' : 'professor'} com o código informado. Nada foi salvo.`,
          diagnostico: { etapa: 'vinculo', tabela, vincular_a: vincularA },
        }, 400);
      }
    }
  }

  await admin.from('auditoria').insert({
    usuario_id: dadosUsuario.user.id,
    usuario_nome: perfil.nome,
    acao: 'INSERT',
    tabela: 'usuarios',
    registro_id: contaCriada.user.id,
    valor_depois: { nome, login, papel },
  });

  // A senha inicial é devolvida UMA única vez, para a secretaria entregar à pessoa.
  return responder({
    ok: true,
    id: contaCriada.user.id,
    login,
    senha_inicial: senhaInicial,
    aviso: 'Anote a senha agora: ela não será mostrada novamente. A pessoa terá que trocá-la no primeiro acesso.',
  });
});
