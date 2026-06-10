-- ================================================================
-- 006_abraxas_id.sql — Abraxas Unified Identity (KYC) schema
-- Paste into Supabase SQL Editor → Run
-- ================================================================

-- 1. Master verification record (one per wallet)
create table if not exists public.identity_verifications (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null    default now(),
  updated_at          timestamptz not null    default now(),

  -- Who this belongs to
  wallet_address      text        not null unique,  -- Solana pubkey

  -- Humanity proof (World ID)
  world_id_nullifier  text        unique,           -- prevents duplicate accounts
  world_id_verified   boolean     not null default false,

  -- Document verification
  document_type       text,        -- passport | drivers_license | mobile_dl | national_id
  document_country    text,        -- ISO 3166 e.g. US, CA, GB
  document_state      text,        -- US state if applicable e.g. CA, NY
  document_verified   boolean     not null default false,

  -- Liveness
  liveness_passed     boolean     not null default false,
  liveness_provider   text,        -- veriff | persona | jumio

  -- Status
  status              text        not null default 'pending'
                      check (status in ('pending','approved','suspended','revoked')),

  -- The credential tied to this verification
  credential_jti      text        unique    -- references abraxas_credentials
);

-- 2. Issued Verifiable Credentials (W3C VC as JWT)
create table if not exists public.abraxas_credentials (
  jti                 text        primary key,     -- JWT ID — globally unique
  created_at          timestamptz not null default now(),

  holder_wallet       text        not null,        -- Solana pubkey
  issuer              text        not null default 'https://abraxas-app.vercel.app',

  -- W3C VC claims (what other protocols can read)
  jurisdiction        text        not null,        -- e.g. "US-CA"
  document_type       text        not null,
  verification_level  text        not null default 'standard'
                      check (verification_level in ('basic','standard','enhanced')),
  world_id_verified   boolean     not null default false,

  -- JWT lifecycle
  issuance_date       timestamptz not null default now(),
  expiration_date     timestamptz not null,        -- typically 1 year
  revoked_at          timestamptz,                 -- null = valid

  -- The actual signed JWT (store for audit; verifiers verify signature independently)
  credential_jwt      text        not null
);

-- 3. Presentation audit log (every time credential is shown to another protocol)
create table if not exists public.credential_presentations (
  id                  uuid        primary key default gen_random_uuid(),
  presented_at        timestamptz not null default now(),

  credential_jti      text        not null references public.abraxas_credentials(jti),
  verifier_id         text        not null,        -- e.g. "utila" "coinbase" "custom"
  verifier_name       text,

  -- What claims were disclosed (selective disclosure)
  claims_disclosed    text[]      not null default '{}',

  -- Result
  accepted            boolean     not null default false,
  rejection_reason    text
);

-- ── Indexes ─────────────────────────────────────────────────────
create index if not exists iv_wallet_idx on public.identity_verifications (wallet_address);
create index if not exists ac_holder_idx on public.abraxas_credentials (holder_wallet);
create index if not exists cp_jti_idx    on public.credential_presentations (credential_jti);

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.identity_verifications enable row level security;
alter table public.abraxas_credentials    enable row level security;
alter table public.credential_presentations enable row level security;

grant usage  on schema public to anon, authenticated;
grant insert on public.identity_verifications   to anon, authenticated;
grant insert on public.credential_presentations to anon, authenticated;
grant select on public.abraxas_credentials      to anon, authenticated;

create policy "anon_insert_verifications"
  on public.identity_verifications for insert to anon, authenticated
  with check (true);

create policy "public_read_credentials"
  on public.abraxas_credentials for select to anon, authenticated
  using (revoked_at is null);

create policy "anon_insert_presentations"
  on public.credential_presentations for insert to anon, authenticated
  with check (true);
