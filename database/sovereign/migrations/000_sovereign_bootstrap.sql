-- Sovereign PostgreSQL bootstrap (vanilla Postgres — no Supabase roles).
begin;

create extension if not exists pgcrypto;

do $$
begin
  create role abraxas_runtime noinherit;
exception
  when duplicate_object then null;
end $$;

commit;
