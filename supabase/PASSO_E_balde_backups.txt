-- ============================================================================
-- Balde de backups (arquivos)
-- ============================================================================
-- Rode depois do 03.
--
-- Aqui fica o estado do portal e as cópias de segurança manuais.
-- É privado e só ADMIN/SECRETARIA alcança. No Firebase antigo, qualquer
-- visitante anônimo do site conseguia listar, baixar e APAGAR esses arquivos.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/json'])
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800,
      allowed_mime_types = array['application/json'];

drop policy if exists p_storage_backups_gestao on storage.objects;
create policy p_storage_backups_gestao on storage.objects for all
  using      (bucket_id = 'backups' and public.eh_gestao())
  with check (bucket_id = 'backups' and public.eh_gestao());


-- ----------------------------------------------------------------------------
-- Conferência: deve listar os três baldes, todos com public = false
-- ----------------------------------------------------------------------------
select id, public, file_size_limit from storage.buckets order by id;
