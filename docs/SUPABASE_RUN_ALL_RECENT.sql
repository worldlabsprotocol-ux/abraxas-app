-- ================================================================
-- ABRAXAS — COPY/PASTE ALL RECENT SUPABASE SQL (one shot)
-- Where: Supabase Dashboard → SQL Editor → New query → Run
--
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Covers: Passport/Veriff/zkLogin + Cielo bookings + Protocol Calendar
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- PART A — Identity + W3C credentials (Veriff → JWT)
-- ────────────────────────────────────────────────────────────────

create table if not exists public.identity_verifications (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null    default now(),
  updated_at          timestamptz not null    default now(),
  wallet_address      text        not null unique,
  world_id_nullifier  text        unique,
  world_id_verified   boolean     not null default false,
  document_type       text,
  document_country    text,
  document_state      text,
  document_verified   boolean     not null default false,
  liveness_passed     boolean     not null default false,
  liveness_provider   text,
  status              text        not null default 'pending'
                      check (status in ('pending','approved','suspended','revoked')),
  credential_jti      text        unique
);

create table if not exists public.abraxas_credentials (
  jti                 text        primary key,
  created_at          timestamptz not null default now(),
  holder_wallet       text        not null,
  issuer              text        not null default 'https://abraxas-app.vercel.app',
  jurisdiction        text        not null,
  document_type       text        not null,
  verification_level  text        not null default 'standard'
                      check (verification_level in ('basic','standard','enhanced')),
  world_id_verified   boolean     not null default false,
  issuance_date       timestamptz not null default now(),
  expiration_date     timestamptz not null,
  revoked_at          timestamptz,
  credential_jwt      text        not null
);

create table if not exists public.credential_presentations (
  id                  uuid        primary key default gen_random_uuid(),
  presented_at        timestamptz not null default now(),
  credential_jti      text        not null references public.abraxas_credentials(jti),
  verifier_id         text        not null,
  verifier_name       text,
  claims_disclosed    text[]      not null default '{}',
  accepted            boolean     not null default false,
  rejection_reason    text
);

create index if not exists iv_wallet_idx on public.identity_verifications (wallet_address);
create index if not exists ac_holder_idx on public.abraxas_credentials (holder_wallet);
create index if not exists cp_jti_idx    on public.credential_presentations (credential_jti);

alter table public.identity_verifications enable row level security;
alter table public.abraxas_credentials enable row level security;
alter table public.credential_presentations enable row level security;

grant usage  on schema public to anon, authenticated;
grant insert on public.identity_verifications   to anon, authenticated;
grant insert on public.credential_presentations to anon, authenticated;
grant select on public.abraxas_credentials      to anon, authenticated;

drop policy if exists "anon_insert_verifications" on public.identity_verifications;
create policy "anon_insert_verifications"
  on public.identity_verifications for insert to anon, authenticated with check (true);

drop policy if exists "public_read_credentials" on public.abraxas_credentials;
create policy "public_read_credentials"
  on public.abraxas_credentials for select to anon, authenticated using (revoked_at is null);

drop policy if exists "anon_insert_presentations" on public.credential_presentations;
create policy "anon_insert_presentations"
  on public.credential_presentations for insert to anon, authenticated with check (true);


-- ────────────────────────────────────────────────────────────────
-- PART B — zkLogin identities + Sui address columns
-- ────────────────────────────────────────────────────────────────

create table if not exists public.sui_zklogin_identities (
  oauth_sub     text primary key,
  provider      text not null default 'google',
  sui_address   text not null unique,
  user_salt     text not null,
  email         text,
  max_epoch     bigint,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_sui_zklogin_email on public.sui_zklogin_identities (email);
create index if not exists idx_sui_zklogin_address on public.sui_zklogin_identities (sui_address);

alter table public.identity_verifications add column if not exists sui_address text;
create index if not exists idx_identity_verifications_sui on public.identity_verifications (sui_address);

alter table public.abraxas_credentials add column if not exists sui_address text;
create index if not exists idx_abraxas_credentials_sui on public.abraxas_credentials (sui_address);

alter table public.identity_verifications add column if not exists user_email text;
create index if not exists idx_identity_verifications_email on public.identity_verifications (user_email);


-- ────────────────────────────────────────────────────────────────
-- PART C — On-chain Passport object registry
-- ────────────────────────────────────────────────────────────────

create table if not exists public.sui_passport_objects (
  id                uuid        primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  sui_address       text        not null unique,
  object_id         text        not null,
  network           text        not null default 'devnet',
  stamp_bitmask     integer     not null default 0,
  create_tx_digest  text,
  stamps_tx_digest  text,
  provisioned_at    timestamptz not null default now(),
  constraint sui_passport_objects_object_id_key unique (object_id)
);

create index if not exists spo_sui_address_idx on public.sui_passport_objects (sui_address);
create index if not exists spo_object_id_idx on public.sui_passport_objects (object_id);
alter table public.sui_passport_objects enable row level security;


-- ────────────────────────────────────────────────────────────────
-- PART D — Veriff session polling + intent challenges
-- ────────────────────────────────────────────────────────────────

alter table public.identity_verifications add column if not exists veriff_session_id text;
create index if not exists idx_identity_verifications_veriff_session on public.identity_verifications (veriff_session_id);

create table if not exists public.intent_challenges (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  sui_address     text        not null,
  message         text        not null,
  consumed_at     timestamptz,
  signature_b64   text,
  public_key_b64  text,
  verified        boolean     not null default false
);

create index if not exists intent_challenges_sui_idx on public.intent_challenges (sui_address);
create index if not exists intent_challenges_expires_idx on public.intent_challenges (expires_at);
alter table public.intent_challenges enable row level security;

alter table public.sui_zklogin_identities add column if not exists ephemeral_public_key text;


-- ────────────────────────────────────────────────────────────────
-- PART E — Cielo stay booking requests
-- ────────────────────────────────────────────────────────────────

create table if not exists public.stay_requests (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  booking_id  text        not null,
  property    text,
  check_in    text        not null,
  check_out   text        not null,
  guests      int,
  guest_name  text        not null,
  email       text        not null,
  wallet      text,
  notes       text,
  nights      int,
  est_usdc    int,
  status      text        not null default 'pending'
);

alter table public.stay_requests enable row level security;
grant insert on public.stay_requests to anon, authenticated;

drop policy if exists "anon_insert_stays" on public.stay_requests;
create policy "anon_insert_stays"
  on public.stay_requests for insert to anon, authenticated with check (true);


-- ────────────────────────────────────────────────────────────────
-- PART F — Cielo Sui payment metadata on stay_requests
-- ────────────────────────────────────────────────────────────────

alter table public.stay_requests
  add column if not exists payment_chain text default 'sui',
  add column if not exists payment_asset text default 'USDC',
  add column if not exists sui_address text;


-- ────────────────────────────────────────────────────────────────
-- PART G — Abraxas Protocol Calendar (Cielo availability)
-- ────────────────────────────────────────────────────────────────

create table if not exists public.cielo_calendar_blocks (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  start_date  date        not null,
  end_date    date        not null,
  source      text        not null default 'operator',
  booking_id  text,
  note        text,
  created_by  text        default 'system'
);

create index if not exists cielo_calendar_blocks_dates
  on public.cielo_calendar_blocks (start_date, end_date);

alter table public.cielo_calendar_blocks enable row level security;
grant select on public.cielo_calendar_blocks to anon, authenticated;

drop policy if exists "public_read_cielo_calendar" on public.cielo_calendar_blocks;
create policy "public_read_cielo_calendar"
  on public.cielo_calendar_blocks for select to anon, authenticated using (true);


-- ────────────────────────────────────────────────────────────────
-- VERIFY — run this after the script succeeds
-- ────────────────────────────────────────────────────────────────

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'identity_verifications',
    'abraxas_credentials',
    'credential_presentations',
    'sui_zklogin_identities',
    'sui_passport_objects',
    'intent_challenges',
    'stay_requests',
    'cielo_calendar_blocks'
  )
order by tablename;

-- Expected: 8 rows
