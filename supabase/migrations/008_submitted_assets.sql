-- 008_submitted_assets.sql — RWA asset submissions from AssetOwnerOnboarding
-- Supabase SQL Editor → paste → Run

create table if not exists public.submitted_assets (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null    default now(),
  session_id        text        not null,
  local_asset_id    text        not null,   -- links to localStorage V5 asset
  asset_type        text        not null,
  estimated_value   text,
  jurisdiction      text,
  has_liens         text,
  has_appraisal     text,
  has_custody       text,
  description       text,
  contact_email     text,
  contact_wallet    text,
  lifecycle_state   text        not null default 'SUBMITTED',
  status            text        not null default 'pending_review',
  notes             text
);

alter table public.submitted_assets enable row level security;
grant usage  on schema public          to anon, authenticated;
grant insert on public.submitted_assets to anon, authenticated;

create policy "anon_insert_assets"
  on public.submitted_assets for insert
  to anon, authenticated with check (true);
