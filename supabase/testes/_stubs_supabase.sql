create schema if not exists auth;
create schema if not exists storage;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text);
-- auth.uid() controlável para teste
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('teste.uid', true), '')::uuid $$;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create or replace function storage.foldername(p text) returns text[]
  language sql immutable as $$ select string_to_array(p, '/') $$;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema auth, storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
