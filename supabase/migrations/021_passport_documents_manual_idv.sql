-- 021_passport_documents_manual_idv.sql
-- Manual identity review queue (Veriff workaround when subscription inactive).

create table if not exists public.passport_documents (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  user_email    text        not null,
  sui_address   text,
  stamp_id      text        not null default 'identity',
  file_name     text        not null,
  storage_path  text        not null,
  status        text        not null default 'submitted'
                check (status in ('submitted','under_review','accepted','rejected')),
  reviewer_note text,
  reviewed_at   timestamptz,
  reviewed_by   text
);

create index if not exists idx_passport_documents_email
  on public.passport_documents (user_email, stamp_id, status);

create index if not exists idx_passport_documents_sui
  on public.passport_documents (sui_address, stamp_id, status);

alter table public.passport_documents enable row level security;

-- Private bucket for uploads (create in Supabase Storage UI if missing):
--   Bucket name: passport-documents
--   Public: false
