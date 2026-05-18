-- Abraxas Protocol — Production Schema v3 (SAFE SINGLE FILE)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── ENUMS (SAFE IDPOTENT) ─────────────────────────────────────────────────────

do $$
begin
 create type verification_status as enum (
   'submitted','under_review','partner_required','additional_documents',
   'provenance_review','custody_pending','risk_scoring',
   'approved','collateral_eligible','rejected','suspended','expired'
 );
exception when duplicate_object then null;
end $$;

do $$
begin
 create type fraud_severity as enum ('critical','high','medium','low');
exception when duplicate_object then null;
end $$;

do $$
begin
 create type custody_status as enum ('active','pending_transfer','released','disputed');
exception when duplicate_object then null;
end $$;

-- ── ASSETS ───────────────────────────────────────────────────────────────────

create table if not exists assets (
 id uuid primary key default uuid_generate_v4(),
 title text not null,
 description text,
 category text not null,
 subcategory text,
 owner_wallet text not null,

 declared_value_usd numeric(18,2) default 0,
 current_value_usd numeric(18,2),

 token_mint text unique,
 token_program text default 'Token-2022',
 metadata_uri text,
 mint_tx text,
 minted_at timestamptz,
 mint_cost_abra numeric(18,6) not null,

 ltv integer default 55,
 collateral_score integer,
 fraud_risk_score integer default 0,
 active_flag_count integer default 0,

 primary_image_url text,

 submitted_at timestamptz not null default now(),
 verified_at timestamptz,
 collateralized_at timestamptz,
 updated_at timestamptz not null default now()
);

-- 🔥 FIX: ensures verification_status exists
do $$
begin
 if not exists (
   select 1 from information_schema.columns
   where table_schema = 'public'
     and table_name = 'assets'
     and column_name = 'verification_status'
 ) then
   alter table public.assets
   add column verification_status verification_status default 'submitted';
 end if;
end $$;

-- 🔥 PATCH: ensures category exists (prevents index crash in older DB states)
do $$
begin
 if not exists (
   select 1
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'assets'
     and column_name = 'category'
 ) then
   alter table public.assets
   add column category text not null default '';
 end if;
end $$;

-- indexes (safe after patch)
create index if not exists idx_assets_wallet on public.assets(owner_wallet);
create index if not exists idx_assets_category on public.assets(category);
create index if not exists idx_assets_status on public.assets(verification_status);

-- ── PROVENANCE ───────────────────────────────────────────────────────────────

create table if not exists provenance_history (
 id uuid primary key default uuid_generate_v4(),
 asset_id uuid references assets(id) on delete cascade,
 event_type text not null,
 event_date date not null,
 from_entity text,
 to_entity text,
 price_usd numeric(18,2),
 currency text default 'USD',
 document_hash text not null,
 document_url text,
 verified_by text,
 anchored_tx text,
 notes text,
 created_at timestamptz default now()
);

create index if not exists idx_prov_asset on provenance_history(asset_id);

-- ── CUSTODY ───────────────────────────────────────────────────────────────────

create table if not exists custody_records (
 id uuid primary key default uuid_generate_v4(),
 asset_id uuid references assets(id) on delete cascade,
 custodian_id text not null,
 custodian_name text not null,
 custodian_type text not null,
 facility_location text not null,
 facility_address text,
 received_at timestamptz not null,
 last_audit_at timestamptz,
 next_audit_due timestamptz,
 insurance_value_usd numeric(18,2) not null,
 insurance_provider text,
 vault_ref text not null,
 item_condition text default 'excellent',
 condition_notes text,
 release_conditions text[],
 status custody_status default 'active',
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

-- ── VERIFICATION ─────────────────────────────────────────────────────────────

create table if not exists verification_records (
 id uuid primary key default uuid_generate_v4(),
 asset_id uuid references assets(id) on delete cascade,
 asset_class text not null,
 owner_wallet text not null,
 current_stage int default 1,
 total_stages int not null,
 status text default 'SUBMITTED',
 stages jsonb default '[]',
 jurisdiction text default 'US_STANDARD',
 risk_score int default 50,
 confidence_score int default 0,
 fraud_flags text[] default '{}',
 rejection_reason text,
 created_at timestamptz default now(),
 updated_at timestamptz default now(),
 completed_at timestamptz,
 rejected_at timestamptz
);

-- ── CERTIFICATES ─────────────────────────────────────────────────────────────

create table if not exists verification_certificates (
 id uuid primary key default uuid_generate_v4(),
 certificate_id text unique,
 asset_id uuid references assets(id),
 token_address text,
 metadata_uri text not null,
 verifier_id text not null,
 verifier_name text not null,
 verifier_signature text not null,
 provenance_root text not null,
 custody_ref text not null,
 collateral_score int not null,
 fraud_risk_score int not null,
 liquidity_rating text not null,
 issued_at timestamptz default now(),
 valid_until timestamptz,
 revoked_at timestamptz,
 revocation_reason text,
 anchored_tx text not null
);

-- ── TRIGGERS ─────────────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
 new.updated_at = now();
 return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
 foreach t in array array['assets','custody_records','verification_records']
 loop
   execute format('drop trigger if exists %I_updated_at on %I', t, t);
   execute format(
     'create trigger %I_updated_at before update on %I
      for each row execute function update_updated_at()',
     t, t
   );
 end loop;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table assets enable row level security;
alter table provenance_history enable row level security;
alter table custody_records enable row level security;
alter table verification_records enable row level security;
alter table verification_certificates enable row level security;

-- ── POLICIES ────────────────────────────────────────────────────────────────

drop policy if exists certs_public_read on verification_certificates;
create policy certs_public_read on verification_certificates for select using (true);

drop policy if exists assets_owner on assets;
create policy assets_owner on assets for select using (
 owner_wallet = current_setting('request.jwt.claims', true)::json->>'sub'
);

drop policy if exists assets_insert on assets;
create policy assets_insert on assets for insert with check (true);

drop policy if exists events_owner on asset_events;
drop policy if exists events_insert_only on asset_events;

drop policy if exists notif_owner on notifications;
create policy notif_owner on notifications for select using (
 wallet = current_setting('request.jwt.claims', true)::json->>'sub'
);
