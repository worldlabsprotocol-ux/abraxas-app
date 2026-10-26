-- Build #854 — durable wallet scoped trust execution challenges (sovereign operational slice).
-- Proposal only: apply on disposable/staging sovereign PG; not authorized for Demo/Production in #854.

begin;

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
  created_at           timestamptz not null default now(),
  constraint wallet_scoped_trust_challenges_nonce_uq unique (nonce)
);

create index if not exists wallet_scoped_trust_challenges_partner_expires_idx
  on public.wallet_scoped_trust_challenges (partner_id, expires_at);

create index if not exists wallet_scoped_trust_challenges_correlation_idx
  on public.wallet_scoped_trust_challenges (correlation_id);

comment on table public.wallet_scoped_trust_challenges is
  'One-time wallet scoped trust execution challenges (purpose abraxas_wallet_trust_execution_v1).';

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
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.wallet_scoped_trust_challenges%rowtype;
  v_auth_ref text;
begin
  v_auth_ref := 'waev_' || encode(pg_catalog.digest(p_challenge_id, 'sha256'), 'hex');
  v_auth_ref := substring(v_auth_ref from 1 for 29);

  update public.wallet_scoped_trust_challenges
     set consumed_at = pg_catalog.now(),
         authorization_ref = v_auth_ref
   where id = p_challenge_id
     and consumed_at is null
     and expires_at > pg_catalog.now()
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

revoke all on table public.wallet_scoped_trust_challenges from public;
grant select, insert, update on table public.wallet_scoped_trust_challenges to abraxas_runtime;

revoke all on function public.abraxas_consume_wallet_scoped_trust_challenge_atomic(text, text, text, text, uuid, text) from public;
grant execute on function public.abraxas_consume_wallet_scoped_trust_challenge_atomic(text, text, text, text, uuid, text) to abraxas_runtime;

commit;
