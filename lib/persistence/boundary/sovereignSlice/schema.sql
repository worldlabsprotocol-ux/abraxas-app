-- Minimal operational slice for sovereign persistence proof (disposable/staging only).
-- No Production data. No holder PII tables.

create extension if not exists pgcrypto;

create table if not exists public.partners (
  partner_id text primary key,
  status text not null default 'active' check (status in ('active', 'suspended'))
);

create table if not exists public.partner_policies (
  id text not null,
  partner_id text not null references public.partners(partner_id),
  version int not null,
  name text not null default 'slice-policy',
  rules_json jsonb not null default '{}',
  effective_at timestamptz not null default now(),
  status text not null default 'active'
    check (status in ('active', 'deprecated', 'draft', 'revoked')),
  deprecate_effective_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (id, version)
);

create table if not exists public.issuer_signing_keys (
  signing_key_id text primary key,
  status text not null default 'active' check (status in ('active', 'rotated', 'revoked'))
);

create table if not exists public.decision_receipts (
  id text primary key,
  verification_decision_id uuid not null,
  consent_receipt_id uuid,
  partner_id text not null references public.partners(partner_id),
  policy_id text not null,
  policy_version int not null,
  subject_pseudonym_id text not null,
  wallet_binding_ref text,
  decision_result text not null check (decision_result in ('approved', 'denied', 'manual_review')),
  reason_codes text[] not null default '{}',
  evaluated_claim_refs jsonb not null default '[]',
  issuer_refs text[] not null default '{}',
  decision_context text not null default 'production'
    check (decision_context in ('production', 'sandbox_only')),
  evaluated_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'pending_finalization')),
  issuance_finalized_at timestamptz,
  schema_version text not null default '1.0.0',
  payload_hash text not null,
  signature text not null,
  signing_key_id text not null references public.issuer_signing_keys(signing_key_id),
  anchor_reference text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  foreign key (policy_id, policy_version) references public.partner_policies(id, version)
);

create table if not exists public.decision_receipt_supersessions (
  superseded_receipt_id text primary key references public.decision_receipts(id),
  superseding_receipt_id text not null,
  partner_id text not null references public.partners(partner_id),
  policy_id text not null,
  policy_version int not null,
  scope text not null default 'session_refresh',
  superseded_at timestamptz not null default now()
);

-- Claim/evidence freshness (no holder PII — status refs only).
create table if not exists public.sovereign_claim_status (
  claim_id text primary key,
  status text not null check (status in ('active', 'revoked', 'expired', 'suspended')),
  expires_at timestamptz
);

create table if not exists public.sovereign_evidence_sources (
  source_credential_id text primary key,
  status text not null check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.sovereign_receipt_status_checkpoints (
  receipt_id text primary key references public.decision_receipts(id),
  status_version int not null default 0 check (status_version >= 0)
);

create table if not exists public.sovereign_receipt_evidence_dependencies (
  receipt_id text not null references public.decision_receipts(id),
  source_credential_id text not null references public.sovereign_evidence_sources(source_credential_id),
  dependency_type text not null default 'source_receipt',
  primary key (receipt_id, source_credential_id)
);

-- Launchpad application scope (minimal slice — mirrors sovereign migration binding, no PII).
create table if not exists public.partner_launchpad_applications (
  id uuid primary key,
  partner_id text not null references public.partners(partner_id),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  policy_id text not null,
  policy_version int not null default 1
);

create table if not exists public.partner_launchpad_signed_receipts (
  receipt_id text primary key references public.decision_receipts(id),
  application_id uuid not null references public.partner_launchpad_applications(id),
  partner_id text not null references public.partners(partner_id),
  revoked_at timestamptz
);

create index if not exists partner_launchpad_signed_receipts_app_idx
  on public.partner_launchpad_signed_receipts (application_id);

create table if not exists public.partner_metering_events (
  id bigserial primary key,
  partner_id text not null references public.partners(partner_id),
  event_type text not null,
  idempotency_key text not null unique,
  policy_id text,
  decision_id text,
  receipt_id text,
  occurred_at timestamptz not null default now()
);

-- Build #854 wallet scoped trust challenges (sovereign slice)
create table if not exists public.wallet_scoped_trust_challenges (
  id                   text        primary key,
  partner_id           text        not null references public.partners(partner_id),
  application_id       uuid        not null,
  policy_id            text        not null,
  policy_version       int         not null,
  action               text        not null,
  resource             text        not null,
  wallet_address       text        not null,
  origin               text        not null,
  audience             text        not null,
  uri                  text        not null,
  nonce                text        not null,
  request_id           text        not null,
  correlation_id       text        not null,
  message_sha256       text        not null,
  message              text        not null,
  session_context_hash text,
  expires_at           timestamptz not null,
  consumed_at          timestamptz,
  authorization_ref    text,
  subject_pseudonym_id text        not null,
  created_at           timestamptz not null default now(),
  constraint wallet_scoped_trust_challenges_nonce_uq unique (nonce)
);

create table if not exists public.wallet_scoped_trust_execution_outcomes (
  authorization_ref text primary key,
  challenge_id      text not null unique references public.wallet_scoped_trust_challenges(id),
  partner_id        text not null references public.partners(partner_id),
  application_id    uuid not null,
  receipt_id        text not null references public.decision_receipts(id),
  correlation_id    text not null unique,
  decision_result   text not null check (decision_result in ('approved', 'denied', 'indeterminate')),
  finalized_at      timestamptz not null default now()
);

-- Pre-authorized evidence graph for wallet trust execution (operator/CI seeded — not created at execute).
create table if not exists public.wallet_scoped_trust_authoritative_evidence (
  partner_id            text not null references public.partners(partner_id),
  application_id        uuid not null,
  policy_id             text not null,
  policy_version        int  not null,
  subject_pseudonym_id  text not null,
  source_credential_id  text not null references public.sovereign_evidence_sources(source_credential_id),
  claim_id              text not null references public.sovereign_claim_status(claim_id),
  primary key (partner_id, application_id, subject_pseudonym_id, claim_id),
  foreign key (policy_id, policy_version) references public.partner_policies(id, version)
);

create or replace function public.abraxas_consume_wallet_scoped_trust_challenge_atomic(
  p_challenge_id text,
  p_wallet_address text,
  p_message_sha256 text,
  p_partner_id text,
  p_application_id uuid,
  p_action text
)
returns jsonb
language plpgsql
as $$
declare
  v_row public.wallet_scoped_trust_challenges%rowtype;
  v_auth_ref text;
begin
  v_auth_ref := 'waev_' || encode(digest(p_challenge_id, 'sha256'), 'hex');
  v_auth_ref := substring(v_auth_ref from 1 for 29);

  update public.wallet_scoped_trust_challenges
     set consumed_at = now(),
         authorization_ref = v_auth_ref
   where id = p_challenge_id
     and consumed_at is null
     and expires_at > now()
     and wallet_address = p_wallet_address
     and message_sha256 = p_message_sha256
     and partner_id = p_partner_id
     and application_id = p_application_id
     and action = p_action
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'challenge_unavailable');
  end if;

  return jsonb_build_object(
    'ok', true,
    'authorization_ref', v_row.authorization_ref,
    'partner_id', v_row.partner_id,
    'application_id', v_row.application_id,
    'policy_id', v_row.policy_id,
    'policy_version', v_row.policy_version,
    'action', v_row.action,
    'message', v_row.message,
    'correlation_id', v_row.correlation_id
  );
end;
$$;
