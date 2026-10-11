-- DEMO-first durable institutional eligibility consume nonces.
-- Apply DEMO first. Do not auto-apply from Vercel or Production without operator review.
-- Hashes only — no raw nonces or identity evidence.

create table if not exists public.institutional_eligibility_consume_nonces (
  partner_id text not null,
  application_id text not null default '',
  receipt_id text not null,
  subject_scope_hash text not null,
  policy_id text not null,
  policy_version integer not null,
  action_scope_norm text not null default '',
  nonce_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  constraint institutional_consume_nonce_hash_hex
    check (nonce_hash ~ '^[0-9a-f]{64}$'),
  constraint institutional_consume_subject_hash_hex
    check (subject_scope_hash ~ '^[0-9a-f]{64}$')
);

create unique index if not exists institutional_eligibility_consume_nonces_scope_uq
  on public.institutional_eligibility_consume_nonces (
    partner_id,
    application_id,
    receipt_id,
    subject_scope_hash,
    policy_id,
    policy_version,
    action_scope_norm,
    nonce_hash
  );

comment on table public.institutional_eligibility_consume_nonces is
  'One-time institutional eligibility consume nonces. Scoped tenant keys. Hashes only.';

alter table public.institutional_eligibility_consume_nonces enable row level security;

revoke all on table public.institutional_eligibility_consume_nonces from public, anon, authenticated;
grant select, insert on table public.institutional_eligibility_consume_nonces to service_role;

create or replace function public.institutional_eligibility_consume_nonce(
  p_partner_id text,
  p_application_id text,
  p_receipt_id text,
  p_subject_scope_hash text,
  p_policy_id text,
  p_policy_version integer,
  p_action_scope_norm text,
  p_nonce_hash text,
  p_expires_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expired');
  end if;

  begin
    insert into public.institutional_eligibility_consume_nonces (
      partner_id,
      application_id,
      receipt_id,
      subject_scope_hash,
      policy_id,
      policy_version,
      action_scope_norm,
      nonce_hash,
      expires_at
    )
    values (
      p_partner_id,
      coalesce(p_application_id, ''),
      p_receipt_id,
      p_subject_scope_hash,
      p_policy_id,
      p_policy_version,
      coalesce(p_action_scope_norm, ''),
      p_nonce_hash,
      p_expires_at
    );
    return jsonb_build_object('ok', true, 'code', 'consumed');
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'code', 'replayed');
  end;
end;
$$;

revoke all on function public.institutional_eligibility_consume_nonce(
  text, text, text, text, text, integer, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.institutional_eligibility_consume_nonce(
  text, text, text, text, text, integer, text, text, timestamptz
) to service_role;
