-- FILE: supabase/schema_v2.sql
-- ADD THIS to your existing schema — verification_records table
-- Run in Supabase SQL editor after schema.sql

-- Verification records — one per asset, tracks full pipeline
create table if not exists verification_records (
  id               uuid primary key default uuid_generate_v4(),
  asset_id         uuid not null references assets(id) on delete cascade,
  asset_class      text not null,
  owner_wallet     text not null,
  current_stage    integer not null default 1,
  total_stages     integer not null,
  status           text not null default 'SUBMITTED',
  stages           jsonb not null default '[]',
  jurisdiction     text not null default 'US_STANDARD',
  risk_score       integer default 50,
  confidence_score integer default 0,
  fraud_flags      text[] default '{}',
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  completed_at     timestamptz,
  rejected_at      timestamptz
);

create index if not exists idx_verif_asset   on verification_records(asset_id);
create index if not exists idx_verif_status  on verification_records(status);
create index if not exists idx_verif_wallet  on verification_records(owner_wallet);

alter table verification_records enable row level security;

create policy "verif_owner_select"
  on verification_records for select
  using (owner_wallet = current_setting('request.jwt.claims',true)::json->>'sub');

create policy "verif_insert"
  on verification_records for insert with check (true);

drop trigger if exists verif_updated_at on verification_records;
create trigger verif_updated_at
  before update on verification_records
  for each row execute procedure update_updated_at();