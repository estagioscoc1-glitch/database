-- ============================================================================
-- CORREÇÃO: permissões do papel administrativo do servidor (service_role)
-- ============================================================================
-- Sintoma que isto resolve:
--   Ao cadastrar professor ou aluno, aparece
--   "permission denied for table usuarios".
--
-- Causa:
--   O arquivo 00_recomecar_do_zero.sql apaga e recria o schema 'public'. Isso
--   destrói as permissões padrão que o Supabase configura para o service_role
--   — o papel usado pelas funções do servidor (Edge Functions).
--
-- Só é necessário rodar uma vez. O 01_schema_e_seguranca.sql já foi corrigido
-- para instalações novas.
-- ============================================================================

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Vale também para tabelas criadas no futuro
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

-- Garante o papel de manutenção do próprio banco
grant usage on schema public to postgres;
grant all privileges on all tables in schema public to postgres;


-- ----------------------------------------------------------------------------
-- Conferência: deve devolver 'sim' nas duas colunas
-- ----------------------------------------------------------------------------
select
  case when has_table_privilege('service_role', 'public.usuarios', 'SELECT')
       then 'sim' else 'NAO' end as service_role_le_usuarios,
  case when has_table_privilege('service_role', 'public.usuarios', 'INSERT')
       then 'sim' else 'NAO' end as service_role_grava_usuarios;
