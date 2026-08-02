-- ============================================================================
-- APAGAR TUDO E RECOMEÇAR
-- ============================================================================
-- Use este arquivo APENAS quando quiser recriar o banco do zero.
-- Ele apaga todas as tabelas do portal. As contas de login (Authentication)
-- NÃO são apagadas — só a estrutura de dados.
--
-- Ordem: rode 00 → depois 01 → depois 02.
-- ============================================================================

-- Remove as políticas de arquivos antes de derrubar as funções que elas usam
drop policy if exists p_storage_docs_select   on storage.objects;
drop policy if exists p_storage_docs_insert   on storage.objects;
drop policy if exists p_storage_docs_delete   on storage.objects;
drop policy if exists p_storage_import_gestao on storage.objects;

-- Derruba tudo do portal
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

-- Tipos usados pelas tabelas
drop type if exists papel_usuario  cascade;
drop type if exists turno_aula     cascade;
drop type if exists situacao_aluno cascade;
drop type if exists resultado_nota cascade;
drop type if exists presenca_tipo  cascade;

-- Pronto. Agora rode o 01_schema_e_seguranca.sql
select 'Banco limpo. Agora rode o arquivo 01_schema_e_seguranca.sql' as proximo_passo;
