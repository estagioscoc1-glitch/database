/**
 * Função de servidor: redefinir a senha de um usuário.
 *
 * PARA QUE SERVE
 *
 * Aluno ou professor esqueceu a senha. Ele não tem como recuperar sozinho por
 * e-mail, porque entra por matrícula/usuário e a conta dele foi criada com um
 * e-mail interno que não existe de verdade (fulano@portal.interno.local).
 *
 * Então a recuperação é presencial: a pessoa procura a secretaria, a secretaria
 * clica em "Redefinir senha" no cadastro dela, e o sistema devolve uma senha
 * nova UMA vez, na tela, para ser entregue à pessoa.
 *
 * A senha antiga não é consultada em momento nenhum — ninguém, nem o
 * administrador, consegue ver a senha de outra pessoa. Ela é substituída.
 *
 * QUEM PODE
 *
 *   ADMIN       → redefine a senha de qualquer um.
 *   SECRETARIA  → redefine apenas de ALUNO e PROFESSOR.
 *   Os demais   → não podem.
 *
 * A secretaria NÃO pode redefinir a senha de um admin nem de outra secretaria.
 * Se pudesse, bastaria uma conta de secretaria comprometida para tomar a conta
 * do administrador e, com ela, o sistema inteiro.
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

/**
 * Senha temporária: 12 caracteres sorteados.
 *
 * O alfabeto não tem O, 0, I, l nem 1 — são os pares que a pessoa confunde ao
 * ler um papel escrito à mão e depois não consegue entrar.
 */
function gerarSenhaTemporaria(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405);

  const URL_PROJETO = Deno.env.get('SUPABASE_URL')!;
  const CHAVE_SECRETA = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const CHAVE_PUBLICA = Deno.env.get('SUPABASE_ANON_KEY')!;

  // ------------------------------------------------------------- 1. quem pediu?
  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.startsWith('Bearer ')) {
    return responder({ erro: 'Não autenticado.' }, 401);
  }

  const clienteDoUsuario = createClient(URL_PROJETO, CHAVE_PUBLICA, {
    global: { headers: { Authorization: autorizacao } },
  });

  const { data: dadosUsuario, error: erroUsuario } = await clienteDoUsuario.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) {
    return responder({ erro: 'Sessão inválida. Saia e entre novamente.' }, 401);
  }

  const admin = createClient(URL_PROJETO, CHAVE_SECRETA, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: quemPediu, error: erroPerfil } = await admin
    .from('usuarios')
    .select('id, papel, ativo, nome')
    .eq('id', dadosUsuario.user.id)
    .maybeSingle();

  if (erroPerfil) {
    return responder({ erro: `Não foi possível consultar seu perfil: ${erroPerfil.message}` }, 500);
  }
  if (!quemPediu) {
    return responder({ erro: 'Seu login não tem perfil correspondente na tabela "usuarios".' }, 403);
  }
  if (!quemPediu.ativo) {
    return responder({ erro: 'Seu usuário está marcado como inativo.' }, 403);
  }
  if (!['ADMIN', 'SECRETARIA'].includes(quemPediu.papel)) {
    return responder({
      erro: `Seu papel é "${quemPediu.papel}". Apenas administrador ou secretaria podem redefinir senhas.`,
    }, 403);
  }

  // -------------------------------------------------------- 2. de quem é a senha?
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400);
  }

  // TRÊS FORMAS DE DIZER DE QUEM É A SENHA, E A ORDEM IMPORTA.
  //
  // O motivo é um problema real encontrado em uso: a lista de usuários na tela
  // do administrador mostrava, para professores, um "usuário" numerado
  // (1001, 1002, 1003...) que NÃO é o login de verdade. O login real na tabela
  // `usuarios` era outro (prof_eu, prof_teste...). Quem pedisse a redefinição
  // pelo que estava escrito na tela recebia "usuário não encontrado".
  //
  // Com aluno o problema não aparecia, porque lá o usuário é a matrícula e ela
  // coincide com o login. Só o professor divergia.
  //
  // Por isso a `ficha_id` vem primeiro: ela é o identificador do cadastro
  // acadêmico (alunos.id / professores.id), que a tela sempre tem em mãos e que
  // não depende de nenhuma numeração inventada no navegador.
  const usuarioId = String(corpo.usuario_id ?? '').trim();
  const fichaId = String(corpo.ficha_id ?? '').trim();
  const loginAlvo = String(corpo.login ?? '').trim().toLowerCase();

  if (!usuarioId && !fichaId && !loginAlvo) {
    return responder({ erro: 'Informe de quem é a senha a redefinir.' }, 400);
  }

  // Da ficha acadêmica chega-se à conta de login pelo campo `usuario_id`.
  let idResolvido = usuarioId;
  if (!idResolvido && fichaId) {
    for (const tabela of ['alunos', 'professores']) {
      const { data } = await admin
        .from(tabela)
        .select('usuario_id')
        .eq('id', fichaId)
        .maybeSingle();
      if (data?.usuario_id) { idResolvido = data.usuario_id as string; break; }
    }
  }

  const consulta = admin.from('usuarios').select('id, nome, login, papel, ativo');
  const { data: alvo, error: erroAlvo } = idResolvido
    ? await consulta.eq('id', idResolvido).maybeSingle()
    : await consulta.eq('login', loginAlvo).maybeSingle();

  if (erroAlvo) {
    return responder({ erro: `Falha ao localizar o usuário: ${erroAlvo.message}` }, 500);
  }
  if (!alvo) {
    return responder({
      erro: fichaId
        ? 'Esta pessoa está cadastrada, mas ainda não tem conta de acesso ao portal. ' +
          'Crie o acesso dela antes de redefinir a senha.'
        : 'Usuário não encontrado.',
      diagnostico: { ficha_id: fichaId || null, login: loginAlvo || null },
    }, 404);
  }

  // ------------------------------------------------ 3. essa pessoa PODE redefinir?
  if (quemPediu.papel === 'SECRETARIA' && !['ALUNO', 'PROFESSOR'].includes(alvo.papel)) {
    return responder({
      erro: `A secretaria não pode redefinir a senha de um usuário "${alvo.papel}". Peça ao administrador.`,
    }, 403);
  }

  // ------------------------------------------------------------ 4. trocar a senha
  const senhaNova = gerarSenhaTemporaria();

  const { error: erroSenha } = await admin.auth.admin.updateUserById(alvo.id, {
    password: senhaNova,
  });

  if (erroSenha) {
    return responder({ erro: `Não foi possível trocar a senha: ${erroSenha.message}` }, 400);
  }

  // Obriga a pessoa a escolher uma senha só dela no próximo acesso. Sem isto, a
  // senha que passou pela mão da secretaria continuaria valendo indefinidamente.
  const { error: erroMarcar } = await admin
    .from('usuarios')
    .update({ trocar_senha: true })
    .eq('id', alvo.id);

  if (erroMarcar) {
    console.error('[redefinir-senha] Falha ao marcar trocar_senha:', erroMarcar.message);
  }

  // ----------------------------------------------------------------- 5. auditoria
  //
  // Redefinir senha é troca de titularidade de acesso. Fica registrado quem fez,
  // em quem, e quando — sem gravar a senha em lugar nenhum.
  await admin.from('auditoria').insert({
    usuario_id: quemPediu.id,
    usuario_nome: quemPediu.nome,
    acao: 'UPDATE',
    tabela: 'usuarios',
    registro_id: alvo.id,
    valor_depois: {
      evento: 'REDEFINICAO_DE_SENHA',
      alvo_login: alvo.login,
      alvo_papel: alvo.papel,
    },
  });

  return responder({
    ok: true,
    login: alvo.login,
    nome: alvo.nome,
    senha_nova: senhaNova,
    aviso:
      'Anote agora: esta senha não será mostrada de novo. ' +
      'A pessoa será obrigada a trocá-la ao entrar.',
  });
});
