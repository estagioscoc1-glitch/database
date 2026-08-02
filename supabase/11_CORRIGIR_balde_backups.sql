-- ============================================================================
-- CORREÇÃO: criar o balde "backups" que está faltando
-- ============================================================================
-- Sintoma que isto resolve:
--   O aviso amarelo "ALTERAÇÕES AINDA NÃO SALVAS NO SERVIDOR" aparecia no
--   portal. A causa não era permissão nem conexão: o balde de arquivos
--   simplesmente não existia. O servidor respondia:
--
--       {"statusCode":"404","error":"Bucket not found","code":"NoSuchBucket"}
--
--   Este balde guarda o "estado geral" do portal — mensagens, notificações,
--   estágios, documentos do aluno, faixas de conceito, períodos letivos e
--   configurações de declaração. Notas, alunos, turmas e diários NÃO passam
--   por aqui: esses têm tabelas próprias e nunca estiveram em risco.
--
-- Como rodar:
--   Supabase → SQL Editor → New query → cole tudo → Run
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800,
      allowed_mime_types = array['application/json'];

-- Só ADMIN e SECRETARIA leem e gravam. O balde é privado: ninguém de fora
-- alcança o arquivo, nem sabendo o endereço.
drop policy if exists p_storage_backups_gestao on storage.objects;
create policy p_storage_backups_gestao on storage.objects for all
  to authenticated
  using      (bucket_id = 'backups' and public.eh_gestao())
  with check (bucket_id = 'backups' and public.eh_gestao());


-- ----------------------------------------------------------------------------
-- CONFERÊNCIA — leia o resultado antes de fechar
-- ----------------------------------------------------------------------------
-- Espere ver:
--   balde_existe   = sim
--   balde_privado  = sim
--   politica_existe = sim
-- ----------------------------------------------------------------------------
select
  case when exists (select 1 from storage.buckets where id = 'backups')
       then 'sim' else 'NAO — algo deu errado' end                as balde_existe,
  case when exists (select 1 from storage.buckets where id = 'backups' and public = false)
       then 'sim' else 'NAO — está público, corrija' end          as balde_privado,
  case when exists (select 1 from pg_policies
                    where schemaname = 'storage'
                      and tablename  = 'objects'
                      and policyname = 'p_storage_backups_gestao')
       then 'sim' else 'NAO — política não criada' end            as politica_existe;
