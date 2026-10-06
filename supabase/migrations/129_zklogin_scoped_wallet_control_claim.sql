-- 129_zklogin_scoped_wallet_control_claim.sql
-- Scope zkLogin wallet-control claim replacement per binding evidence_reference.
--
-- Fixes P1: binding/repairing Sui zkLogin wallet must not expire unrelated EVM wallet claims.
-- Prerequisite: 128_wallet_control_claim_scoping.sql
-- Idempotent: safe to re-run.

begin;

create or replace function public.upsert_zklogin_wallet_binding_atomic(
  p_subject_id text,
  p_wallet_address text,
  p_binding_method text default 'zklogin'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_subject text := lower(btrim(p_subject_id));
  v_wallet text := lower(btrim(p_wallet_address));
  v_method text := coalesce(nullif(btrim(p_binding_method), ''), 'zklogin');
  v_binding_id uuid;
  v_evidence_ref text;
  v_new_claim_id uuid;
  v_expires_at timestamptz := v_now + interval '12 hours';
begin
  if v_subject = '' or v_wallet = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  insert into public.wallet_bindings (
    subject_id,
    chain,
    wallet_address,
    binding_method,
    binding_status,
    verified_at,
    revoked_at,
    risk_status
  ) values (
    v_subject,
    'sui',
    v_wallet,
    v_method,
    'active',
    v_now,
    null,
    'low'
  )
  on conflict (subject_id, wallet_address) do update set
    binding_method = excluded.binding_method,
    binding_status = 'active',
    verified_at = excluded.verified_at,
    revoked_at = null,
    risk_status = 'low'
  returning id into v_binding_id;

  v_evidence_ref := 'wb:' || v_binding_id::text;

  insert into public.credential_claims (
    subject_id,
    credential_jti,
    claim_type,
    claim_value,
    issuer_id,
    assurance_level,
    issued_at,
    expires_at,
    status,
    evidence_reference,
    policy_scope,
    updated_at
  ) values (
    v_subject,
    null,
    'wallet_binding_confirmed',
    jsonb_build_object(
      'wallet_binding_id', v_binding_id::text,
      'wallet_address', v_wallet,
      'chain', 'sui',
      'binding_method', v_method,
      'control_method', v_method,
      'verified_at', v_now
    ),
    'issuer:abraxas',
    'L2',
    v_now,
    v_expires_at,
    'active',
    v_evidence_ref,
    'core',
    v_now
  )
  returning id into v_new_claim_id;

  update public.credential_claims
  set status = 'expired',
      updated_at = v_now
  where subject_id = v_subject
    and claim_type = 'wallet_binding_confirmed'
    and evidence_reference = v_evidence_ref
    and status = 'active'
    and id <> v_new_claim_id;

  return jsonb_build_object('ok', true, 'claim_id', v_new_claim_id, 'binding_id', v_binding_id);
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'code', 'database_error',
      'detail', sqlerrm
    );
end;
$$;

revoke all on function public.upsert_zklogin_wallet_binding_atomic(text, text, text) from public;
grant execute on function public.upsert_zklogin_wallet_binding_atomic(text, text, text) to service_role;

commit;
