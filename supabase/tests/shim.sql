-- Shim mínimo do Supabase para validar migrations/RLS em um Postgres puro (CI e desenvolvimento local).
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth; create schema if not exists storage;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), aud text, role text, phone text, raw_app_meta_data jsonb default '{}');
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
grant usage on schema public, auth, storage to anon, authenticated;
-- Como no Supabase: tabelas futuras do schema public ficam acessíveis aos papéis (RLS é quem restringe).
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant all on all tables in schema storage to anon, authenticated;
