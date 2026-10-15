-- 140_passport_reusable_credential_state.sql
-- Build #567: durable Passport reusable credential, holder possession keys, RP challenges.
-- Propose for DEMO/staging review before Production apply.

begin;

create table if not exists public.passport_holder_possession_keys (
  holder_subject_id     text        primary key,
  public_key_b64url     text        not null,
  registered_at         timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint passport_holder_possession_keys_pubkey_len
    check (char_length(public_key_b64url) between 43 and 64)
);

comment on table public.passport_holder_possession_keys is
  'Holder Ed25519 possession public keys for reusable Passport credential presentation.';

create table if not exists public.passport_reusable_credentials (
  credential_id           text        primary key,
  holder_subject_id       text        not null,
  linked_credential_jti   text        not null,
  signed_credential_text  text        not null,
  issuer_id               text        not null,
  assurance_level         text        not null,
  idv_method              text        not null,
  revocation_status_id    text        not null,
  issued_at               timestamptz not null,
  expires_at              timestamptz not null,
  sandbox_labeled         boolean     not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index if not exists passport_reusable_credentials_jti_uq
  on public.passport_reusable_credentials (linked_credential_jti);

create index if not exists passport_reusable_credentials_holder_idx
  on public.passport_reusable_credentials (holder_subject_id, expires_at desc);

comment on table public.passport_reusable_credentials is
  'Issuer-signed reusable Passport credentials bound to sovereign identity verification JTIs.';

create table if not exists public.passport_reusable_credential_issuance_audit (
  id                    bigserial   primary key,
  holder_subject_id     text        not null,
  linked_credential_jti text        not null,
  credential_id         text,
  source                text        not null,
  outcome               text        not null,
  detail                jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists passport_reusable_credential_issuance_audit_holder_idx
  on public.passport_reusable_credential_issuance_audit (holder_subject_id, created_at desc);

create table if not exists public.passport_possession_challenges (
  challenge_id          text        primary key,
  credential_id         text        not null,
  partner_id            text        not null,
  policy_id             text        not null,
  nonce                 text        not null,
  issued_at             timestamptz not null,
  expires_at              timestamptz not null,
  consumed_at           timestamptz,
  payload_json          jsonb       not null,
  created_at            timestamptz not null default now()
);

create index if not exists passport_possession_challenges_expires_idx
  on public.passport_possession_challenges (expires_at);

comment on table public.passport_possession_challenges is
  'Single-use relying party possession challenges for reusable credential presentation.';

alter table public.passport_holder_possession_keys enable row level security;
alter table public.passport_reusable_credentials enable row level security;
alter table public.passport_reusable_credential_issuance_audit enable row level security;
alter table public.passport_possession_challenges enable row level security;

revoke all on table public.passport_holder_possession_keys from public, anon, authenticated;
revoke all on table public.passport_reusable_credentials from public, anon, authenticated;
revoke all on table public.passport_reusable_credential_issuance_audit from public, anon, authenticated;
revoke all on table public.passport_possession_challenges from public, anon, authenticated;

grant select, insert, update, delete on table public.passport_holder_possession_keys to service_role;
grant select, insert, update, delete on table public.passport_reusable_credentials to service_role;
grant select, insert on table public.passport_reusable_credential_issuance_audit to service_role;
grant select, insert, update on table public.passport_possession_challenges to service_role;

create or replace function public.consume_passport_possession_challenge(
  p_challenge_id text,
  p_credential_id text,
  p_partner_id text,
  p_policy_id text
)
returns public.passport_possession_challenges
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.passport_possession_challenges;
begin
  update public.passport_possession_challenges c
  set consumed_at = pg_catalog.now()
  where c.challenge_id = btrim(p_challenge_id)
    and c.consumed_at is null
    and c.expires_at > pg_catalog.now()
    and c.credential_id = btrim(p_credential_id)
    and c.partner_id = btrim(p_partner_id)
    and c.policy_id = btrim(p_policy_id)
  returning * into v_row;

  if not found then
    return null;
  end if;
  return v_row;
end;
$$;

revoke all on function public.consume_passport_possession_challenge(text, text, text, text) from public;
grant execute on function public.consume_passport_possession_challenge(text, text, text, text) to service_role;

-- Upgrade-only legacy column migration (no-op on clean installs).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'passport_reusable_credentials'
      and column_name = 'signed_credential_json'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'passport_reusable_credentials'
        and column_name = 'signed_credential_text'
    ) then
      alter table public.passport_reusable_credentials
        add column signed_credential_text text;
    end if;

    update public.passport_reusable_credentials
    set signed_credential_text = signed_credential_json::text
    where signed_credential_text is null
      and signed_credential_json is not null;

    alter table public.passport_reusable_credentials
      drop column signed_credential_json;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'passport_reusable_credentials'
      and column_name = 'signed_credential_text'
  ) then
    alter table public.passport_reusable_credentials
      alter column signed_credential_text set not null;
  end if;
end $$;

commit;
