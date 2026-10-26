-- 153_decision_receipt_v11_finalize_atomic.sql
-- Single-transaction v1.1.0 finalization with dedicated-column authority (proposal — NOT applied in Build #847).
--
-- OPERATOR: apply manually only after migrations 151 and 152 and founder authorization.
-- Prerequisite: 151_decision_receipt_issuance_finalization.sql, 152_decision_receipt_v1_1_signed_fields.sql
--
-- Invariant: pending_finalization → active commits hash, signature, sidecar anchor, and the full
-- dedicated v1.1.0 field set in one UPDATE (no partially authoritative active receipts).

create or replace function public.abraxas_finalize_v11_receipt_atomic(
  p_receipt_id uuid,
  p_expected_payload_hash text,
  p_payload_hash text,
  p_signature text,
  p_anchor_reference text,
  p_application_binding_ref text,
  p_evidence_commitment jsonb,
  p_evidence_commitment_manifest jsonb,
  p_v11_issuance_phase text,
  p_issuance_finalized_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_row public.decision_receipts%rowtype;
begin
  if p_receipt_id is null
    or p_expected_payload_hash is null or btrim(p_expected_payload_hash) = ''
    or p_payload_hash is null or btrim(p_payload_hash) = ''
    or p_signature is null or btrim(p_signature) = ''
    or p_anchor_reference is null or btrim(p_anchor_reference) = ''
    or p_evidence_commitment is null
    or p_evidence_commitment_manifest is null
    or p_v11_issuance_phase is distinct from 'final'
    or p_issuance_finalized_at is null
  then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select * into v_row
    from public.decision_receipts
   where id = p_receipt_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'receipt_missing');
  end if;

  if v_row.schema_version is distinct from '1.1.0' then
    return jsonb_build_object('ok', false, 'code', 'not_v11_receipt');
  end if;

  if v_row.status is distinct from 'pending_finalization' then
    return jsonb_build_object('ok', false, 'code', 'status_not_pending');
  end if;

  if v_row.payload_hash is distinct from p_expected_payload_hash then
    return jsonb_build_object('ok', false, 'code', 'provisional_hash_mismatch');
  end if;

  update public.decision_receipts
     set status = 'active',
         payload_hash = p_payload_hash,
         signature = p_signature,
         anchor_reference = p_anchor_reference,
         application_binding_ref = p_application_binding_ref,
         evidence_commitment = p_evidence_commitment,
         evidence_commitment_manifest = p_evidence_commitment_manifest,
         v11_issuance_phase = p_v11_issuance_phase,
         issuance_finalized_at = p_issuance_finalized_at
   where id = p_receipt_id
     and status = 'pending_finalization'
     and payload_hash = p_expected_payload_hash
  returning * into v_row;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'finalization_race');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'finalized',
    'row', to_jsonb(v_row)
  );
end;
$$;

revoke all on function public.abraxas_finalize_v11_receipt_atomic(
  uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz
) from public;

comment on function public.abraxas_finalize_v11_receipt_atomic is
  'Atomically finalize a pending v1.1.0 receipt with dedicated signed fields. Service-role only.';
