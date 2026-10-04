-- 128_wallet_control_claim_scoping.sql
-- Scoped wallet-control claims: one active claim per subject + wallet binding.
--
-- Enables multiple simultaneous wallet_binding_confirmed claims per holder without
-- replace_credential_claim_atomic expiring unrelated wallet evidence.
--
-- Prerequisite: 018_policy_verification.sql, 083_zklogin_wallet_binding_atomic.sql
-- Idempotent: safe to re-run.

begin;

create index if not exists idx_credential_claims_wallet_evidence
  on public.credential_claims (subject_id, claim_type, evidence_reference)
  where status = 'active' and evidence_reference is not null;

create or replace function public.upsert_wallet_control_claim_atomic(
  p_subject_id text,
  p_evidence_reference text,
  p_claim_value jsonb,
  p_issuer_id text,
  p_assurance_level text,
  p_issued_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_jurisdiction text default null,
  p_policy_scope text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_subject text := lower(btrim(p_subject_id));
  v_evidence text := btrim(coalesce(p_evidence_reference, ''));
  v_new_claim_id uuid;
begin
  if v_subject = '' or v_evidence = '' or p_issuer_id is null or btrim(p_issuer_id) = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

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
    jurisdiction,
    policy_scope,
    updated_at
  ) values (
    v_subject,
    null,
    'wallet_binding_confirmed',
    coalesce(p_claim_value, '{}'::jsonb),
    btrim(p_issuer_id),
    p_assurance_level,
    coalesce(p_issued_at, v_now),
    p_expires_at,
    'active',
    v_evidence,
    p_jurisdiction,
    coalesce(p_policy_scope, 'core'),
    v_now
  )
  returning id into v_new_claim_id;

  update public.credential_claims
  set status = 'expired',
      updated_at = v_now
  where subject_id = v_subject
    and claim_type = 'wallet_binding_confirmed'
    and evidence_reference = v_evidence
    and status = 'active'
    and id <> v_new_claim_id;

  return jsonb_build_object('ok', true, 'claim_id', v_new_claim_id);
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'code', 'database_error',
      'detail', sqlerrm
    );
end;
$$;

revoke all on function public.upsert_wallet_control_claim_atomic(
  text, text, jsonb, text, text, timestamptz, timestamptz, text, text
) from public;
grant execute on function public.upsert_wallet_control_claim_atomic(
  text, text, jsonb, text, text, timestamptz, timestamptz, text, text
) to service_role;

commit;
