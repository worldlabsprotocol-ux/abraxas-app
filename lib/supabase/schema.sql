-- FILE: supabase/schema.sql
-- Abraxas Protocol — Complete database schema
-- Run in Supabase SQL editor. Safe to re-run (idempotent).

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Asset status enum ─────────────────────────────────────────────────────────
do $$ begin
  create type asset_status as enum (
    'created','pending_documents','pending_identity','pending_appraisal',
    'pending_custody','pending_verification','verified','collateral_eligible',
    'borrowed','listed','rejected','closed'
  );
exception when duplicate_object then null;
end $$;

-- ── Assets ────────────────────────────────────────────────────────────────────
create table if not exists assets (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  description     text,
  asset_class     text not null,
  estimated_usd   numeric(18,2) default 0,
  ltv             integer default 55,
  custody_partner text,
  mint_cost_abra  numeric(18,6) not null,
  tx_signature    text,
  tx_deduction    text,
  token_id        text,
  owner_wallet    text not null,
  status          asset_status not null default 'created',
  image_url       text,
  grade           text,
  year            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Verification documents ────────────────────────────────────────────────────
create table if not exists verification_documents (
  id          uuid primary key default uuid_generate_v4(),
  asset_id    uuid not null references assets(id) on delete cascade,
  doc_type    text not null,   -- 'proof_of_ownership'|'appraisal'|'image'|'provenance'
  storage_key text not null,   -- Supabase Storage path
  file_name   text,
  mime_type   text,
  uploaded_by text not null,   -- wallet address
  uploaded_at timestamptz not null default now()
);

-- ── Verification reviews ──────────────────────────────────────────────────────
create table if not exists verification_reviews (
  id          uuid primary key default uuid_generate_v4(),
  asset_id    uuid not null references assets(id) on delete cascade,
  reviewer    text not null,   -- wallet address or 'SYSTEM'
  action      text not null,   -- 'approved'|'rejected'|'escalated'|'note'|'status_change'
  from_status asset_status,
  to_status   asset_status,
  note        text,
  created_at  timestamptz not null default now()
);

-- ── Asset lifecycle events ────────────────────────────────────────────────────
create table if not exists asset_events (
  id         uuid primary key default uuid_generate_v4(),
  asset_id   uuid not null references assets(id) on delete cascade,
  event_type text not null,    -- 'SUBMITTED'|'STATUS_CHANGE'|'DOCUMENT_UPLOADED'|'REVIEW'|'DEDUCTION'
  actor      text not null,    -- 'PROTOCOL'|'SYSTEM'|'ADMIN'|wallet
  payload    jsonb,
  created_at timestamptz not null default now()
);

-- ── Notifications ─────────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  wallet     text not null,
  asset_id   uuid references assets(id) on delete set null,
  type       text not null,    -- 'status_change'|'review_note'|'borrow_eligible'|'alert'
  message    text not null,
  read       boolean default false,
  created_at timestamptz not null default now()
);

-- ── Updated_at trigger ────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists assets_updated_at on assets;
create trigger assets_updated_at
  before update on assets
  for each row execute procedure update_updated_at();

-- ── RLS Policies ─────────────────────────────────────────────────────────────
alter table assets                 enable row level security;
alter table verification_documents enable row level security;
alter table verification_reviews   enable row level security;
alter table asset_events           enable row level security;
alter table notifications          enable row level security;

-- Users can only see their own assets
create policy "assets_owner_select"
  on assets for select using (owner_wallet = current_setting('request.jwt.claims', true)::json->>'sub');

-- Anon insert allowed (wallet address passed as owner_wallet)
create policy "assets_insert"
  on assets for insert with check (true);

-- Notifications visible to owner
create policy "notifications_owner"
  on notifications for select using (wallet = current_setting('request.jwt.claims', true)::json->>'sub');

-- Events readable by asset owner
create policy "events_owner"
  on asset_events for select using (
    asset_id in (select id from assets where owner_wallet = current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_assets_owner      on assets(owner_wallet);
create index if not exists idx_assets_status     on assets(status);
create index if not exists idx_events_asset      on asset_events(asset_id);
create index if not exists idx_reviews_asset     on verification_reviews(asset_id);
create index if not exists idx_docs_asset        on verification_documents(asset_id);
create index if not exists idx_notifications_wallet on notifications(wallet);