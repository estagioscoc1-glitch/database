-- ============================================================================
-- PORTAL ACADÊMICO COC — Criação do primeiro administrador
-- ============================================================================
-- Rode este arquivo DEPOIS do 01_schema_e_seguranca.sql
--
-- ANTES de rodar, crie a conta de login:
--   1. No Supabase, menu lateral → "Authentication" → "Users"
--   2. Botão "Add user" → "Create new user"
--   3. Preencha o e-mail e uma senha forte (mínimo 12 caracteres)
--   4. Marque "Auto Confirm User"
--   5. Clique em "Create user"
--
-- Depois volte no "SQL Editor", troque o e-mail abaixo pelo que você usou,
-- cole este arquivo e clique em "Run".
-- ============================================================================

do $$
declare
  v_email text := 'TROQUE_AQUI@exemplo.com';   -- <<<< COLOQUE SEU E-MAIL AQUI
  v_nome  text := 'Administrador';              -- <<<< SEU NOME
  v_login text := 'admin';                      -- <<<< USUÁRIO DE LOGIN NO PORTAL
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);

  if v_uid is null then
    raise exception
      'Nenhuma conta encontrada com o e-mail "%". Crie primeiro em Authentication → Users.', v_email;
  end if;

  insert into public.usuarios (id, nome, email, login, papel, ativo, trocar_senha)
  values (v_uid, v_nome, v_email, v_login, 'ADMIN', true, false)
  on conflict (id) do update
    set nome = excluded.nome,
        papel = 'ADMIN',
        ativo = true,
        trocar_senha = false;

  raise notice 'Administrador criado/atualizado com sucesso: % (%)', v_nome, v_email;
end $$;


-- ----------------------------------------------------------------------------
-- Conferência: deve retornar 1 linha com papel = ADMIN
-- ----------------------------------------------------------------------------
select u.nome, u.email, u.login, u.papel, u.ativo
from public.usuarios u
where u.papel = 'ADMIN';
