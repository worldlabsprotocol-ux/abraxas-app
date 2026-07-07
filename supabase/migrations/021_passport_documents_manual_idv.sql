-- 021_passport_documents_manual_idv.sql
-- Manual identity review queue (Veriff workaround when subscription inactive).
-- Safe to re-run: upgrades an existing passport_documents table if present.

create table if not exists public.passport_documents (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_email    text        not null,
  stamp_id      text        not null default 'identity',
  file_name     text        not null,
  storage_path  text        not null,
  status        text        not null default 'submitted'
);

-- Columns added after initial pilot table (CREATE TABLE IF NOT EXISTS skips these on old rows)
alter table public.passport_documents
  add column if not exists updated_at    timestamptz default now(),
  add column if not exists sui_address   text,
  add column if not exists reviewer_note text,
  add column if not exists reviewed_at   timestamptz,
  add column if not exists reviewed_by   text;

-- Backfill updated_at for rows created before this migration
update public.passport_documents
set updated_at = created_at
where updated_at is null;

alter table public.passport_documents
  alter column updated_at set default now();

create index if not exists idx_passport_documents_email
  on public.passport_documents (user_email, stamp_id, status);

create index if not exists idx_passport_documents_sui
  on public.passport_documents (sui_address, stamp_id, status);

alter table public.passport_documents enable row level security;

-- Private bucket for uploads (create in Supabase Storage UI if missing):
--   Bucket name: passport-documents
--   Public: false
