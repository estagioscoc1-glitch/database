-- ============================================================================
-- Função de apoio ao login
-- ============================================================================
-- Rode este arquivo DEPOIS do 01 e do 02.
--
-- Para quê serve: no portal, o aluno digita a MATRÍCULA e o professor digita o
-- USUÁRIO — não o e-mail. Mas o Supabase Auth autentica por e-mail. Esta função
-- faz essa tradução, e é a única coisa que alguém sem login consegue consultar.
--
-- Ela devolve APENAS o e-mail, e só de contas ativas. Nada de nome, CPF, nota
-- ou qualquer outro dado.
-- ============================================================================

create or replace function public.email_por_login(p_login text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.usuarios u
  where lower(u.login) = lower(trim(p_login))
    and u.ativo
  limit 1
$$;

-- Precisa ser acessível a quem ainda não fez login — é justamente o caso do login.
grant execute on function public.email_por_login(text) to anon, authenticated;

comment on function public.email_por_login(text) is
  'Traduz matrícula/usuário para e-mail no momento do login. Devolve somente o e-mail de contas ativas.';


-- ----------------------------------------------------------------------------
-- Conferência: deve devolver o e-mail do administrador
-- ----------------------------------------------------------------------------
select public.email_por_login('admin') as email_encontrado;
