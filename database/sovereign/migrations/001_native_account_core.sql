-- 144_native_account_webauthn.sql
-- Abraxas-native accounts (WebAuthn), operator memberships, auditable legacy application claim.
-- Reversible: drop new tables; does not alter holder subjects or partner keys.

begin;

create table if not exists public.abraxas_accounts (
  account_id   text        primary key,
  created_at   timestamptz not null default now(),
  status       text        not null default 'active'
               check (status in ('active', 'locked', 'suspended')),
  constraint abraxas_accounts_id_format
    check (account_id ~ '^abx_ac_[0-9a-f]{32}$')
);

comment on table public.abraxas_accounts is
  'First-party Abraxas account subjects — independent of Google, zkLogin, and wallet keys.';

create table if not exists public.abraxas_account_passkeys (
  id              text        primary key,
  account_id      text        not null references public.abraxas_accounts(account_id) on delete cascade,
  credential_id   text        not null,
  public_key_cose text        not null,
  sign_count      bigint      not null default 0,
  transports      text[]      not null default '{}'::text[],
  aaguid          text,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz,
  revoked_at      timestamptz,
  constraint abraxas_account_passkeys_cred_uq unique (credential_id)
);

create index if not exists abraxas_account_passkeys_account_idx
  on public.abraxas_account_passkeys (account_id);

comment on table public.abraxas_account_passkeys is
  'WebAuthn passkey credentials bound to an Abraxas account.';

create table if not exists public.abraxas_webauthn_challenges (
  id           text        primary key,
  purpose      text        not null check (purpose in ('register', 'authenticate')),
  account_id   text        references public.abraxas_accounts(account_id) on delete cascade,
  challenge    text        not null,
  origin       text        not null,
  rp_id        text        not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists abraxas_webauthn_challenges_expires_idx
  on public.abraxas_webauthn_challenges (expires_at);

comment on table public.abraxas_webauthn_challenges is
  'Short-lived WebAuthn challenges with replay protection via consumed_at.';

create table if not exists public.abraxas_account_partner_memberships (
  account_id   text        not null references public.abraxas_accounts(account_id) on delete cascade,
  partner_id   text        not null,
  role         text        not null default 'owner'
               check (role in ('owner', 'admin', 'operator')),
  created_at   timestamptz not null default now(),
  primary key (account_id, partner_id)
);

create index if not exists abraxas_account_partner_memberships_partner_idx
  on public.abraxas_account_partner_memberships (partner_id);

comment on table public.abraxas_account_partner_memberships is
  'Explicit server-verified operator membership — not inferred from email or wallet.';

create table if not exists public.abraxas_account_partner_membership_grants (
  id            uuid        primary key default gen_random_uuid(),
  account_id    text        not null references public.abraxas_accounts(account_id) on delete cascade,
  partner_id    text        not null,
  grant_method  text        not null check (grant_method in ('api_key_proof', 'sandbox_enroll', 'invitation')),
  api_key_id    uuid,
  metadata      jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists abraxas_account_membership_grants_account_idx
  on public.abraxas_account_partner_membership_grants (account_id, created_at desc);

comment on table public.abraxas_account_partner_membership_grants is
  'Auditable grants linking accounts to partner tenants.';

create table if not exists public.abraxas_account_holder_bindings (
  account_id          text        not null references public.abraxas_accounts(account_id) on delete cascade,
  holder_subject_id   text        not null,
  status              text        not null default 'pending'
                      check (status in ('pending', 'active', 'revoked')),
  proof_method        text        not null,
  linked_at           timestamptz,
  created_at          timestamptz not null default now(),
  primary key (account_id, holder_subject_id)
);

create index if not exists abraxas_account_holder_bindings_holder_idx
  on public.abraxas_account_holder_bindings (holder_subject_id);

comment on table public.abraxas_account_holder_bindings is
  'Explicit bindings between Abraxas accounts and Passport holder subjects — never auto-linked.';

create table if not exists public.abraxas_sandbox_enrollments (
  id               uuid        primary key default gen_random_uuid(),
  account_id       text        not null references public.abraxas_accounts(account_id) on delete cascade,
  partner_id       text        not null,
  application_id   uuid,
  idempotency_key  text unique,
  created_at       timestamptz not null default now()
);

create index if not exists abraxas_sandbox_enrollments_account_idx
  on public.abraxas_sandbox_enrollments (account_id);

-- Tenant isolation enforced in application layer; no Supabase RLS roles.
revoke all on public.abraxas_accounts from public;
revoke all on public.abraxas_account_passkeys from public;
revoke all on public.abraxas_webauthn_challenges from public;
revoke all on public.abraxas_account_partner_memberships from public;
revoke all on public.abraxas_account_partner_membership_grants from public;
revoke all on public.abraxas_account_holder_bindings from public;
revoke all on public.abraxas_sandbox_enrollments from public;

grant select, insert, update, delete on public.abraxas_accounts to abraxas_runtime;
grant select, insert, update, delete on public.abraxas_account_passkeys to abraxas_runtime;
grant select, insert, update, delete on public.abraxas_webauthn_challenges to abraxas_runtime;
grant select, insert, update, delete on public.abraxas_account_partner_memberships to abraxas_runtime;
grant select, insert, update, delete on public.abraxas_account_partner_membership_grants to abraxas_runtime;
grant select, insert, update, delete on public.abraxas_account_holder_bindings to abraxas_runtime;
grant select, insert, update, delete on public.abraxas_sandbox_enrollments to abraxas_runtime;

commit;
