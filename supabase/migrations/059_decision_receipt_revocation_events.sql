-- 059_decision_receipt_revocation_events.sql
-- Immutable revocation audit trail + atomic revoke RPCs.
--
-- Prerequisite: 033_decision_receipts.sql, 034_credential_status_registry.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.
--
-- Source of truth for live validity remains decision_receipts.status + revoked_at
-- and credential_claims.status. RPCs guarantee status change + immutable event
-- are written in a single transaction.

ALTER TABLE public.decision_receipts
  ADD COLUMN IF NOT EXISTS revocation_reason_code text;

CREATE TABLE IF NOT EXISTS public.decision_receipt_revocation_events (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id              text        NOT NULL REFERENCES public.decision_receipts(id) ON DELETE RESTRICT,
  verification_decision_id  uuid        NOT NULL REFERENCES public.verification_decisions(id) ON DELETE RESTRICT,
  reason_code             text        NOT NULL,
  changed_by              text        NOT NULL,
  idempotency_key         text,
  claim_ids               text[]      NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decision_receipt_revocation_events_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS decision_receipt_revocation_events_receipt_idx
  ON public.decision_receipt_revocation_events (receipt_id, created_at DESC);

ALTER TABLE public.decision_receipt_revocation_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.revoke_decision_receipt_atomic(
  p_receipt_id text,
  p_reason_code text,
  p_changed_by text,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_record public.decision_receipts%ROWTYPE;
  v_existing public.decision_receipt_revocation_events%ROWTYPE;
  v_now timestamptz := now();
  v_claim_ids text[] := '{}';
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.decision_receipt_revocation_events
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'receipt_id', v_existing.receipt_id,
        'decision_id', v_existing.verification_decision_id,
        'revoked_at', v_existing.created_at,
        'reason_code', v_existing.reason_code,
        'already_revoked', true,
        'claim_ids', v_existing.claim_ids
      );
    END IF;
  END IF;

  SELECT * INTO v_record
  FROM public.decision_receipts
  WHERE id = p_receipt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'receipt_not_found');
  END IF;

  SELECT coalesce(array_agg(claim_id::text), '{}')
  INTO v_claim_ids
  FROM public.receipt_claim_dependencies
  WHERE receipt_id = p_receipt_id;

  IF v_record.status = 'revoked' OR v_record.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'receipt_id', v_record.id,
      'decision_id', v_record.verification_decision_id,
      'revoked_at', coalesce(v_record.revoked_at, v_now),
      'reason_code', p_reason_code,
      'already_revoked', true,
      'claim_ids', v_claim_ids
    );
  END IF;

  IF v_record.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'receipt_not_active');
  END IF;

  UPDATE public.decision_receipts
  SET status = 'revoked',
      revoked_at = v_now,
      revocation_reason_code = p_reason_code
  WHERE id = p_receipt_id
    AND status = 'active';

  INSERT INTO public.decision_receipt_revocation_events (
    receipt_id,
    verification_decision_id,
    reason_code,
    changed_by,
    idempotency_key,
    claim_ids
  ) VALUES (
    p_receipt_id,
    v_record.verification_decision_id,
    p_reason_code,
    p_changed_by,
    p_idempotency_key,
    v_claim_ids
  );

  RETURN jsonb_build_object(
    'ok', true,
    'receipt_id', p_receipt_id,
    'decision_id', v_record.verification_decision_id,
    'revoked_at', v_now,
    'reason_code', p_reason_code,
    'already_revoked', false,
    'claim_ids', v_claim_ids
  );
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing
      FROM public.decision_receipt_revocation_events
      WHERE idempotency_key = p_idempotency_key;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'receipt_id', v_existing.receipt_id,
          'decision_id', v_existing.verification_decision_id,
          'revoked_at', v_existing.created_at,
          'reason_code', v_existing.reason_code,
          'already_revoked', true,
          'claim_ids', v_existing.claim_ids
        );
      END IF;
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'receipt_revoke_failed');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_credential_claim_atomic(
  p_claim_id uuid,
  p_reason_code text,
  p_changed_by text,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_claim public.credential_claims%ROWTYPE;
  v_existing public.credential_status_events%ROWTYPE;
  v_from_status text;
  v_now timestamptz := now();
  v_affected_receipt_ids text[] := '{}';
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.credential_status_events
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'claim_id', v_existing.claim_id,
        'from_status', v_existing.from_status,
        'to_status', v_existing.to_status,
        'already_revoked', v_existing.to_status = 'revoked',
        'affected_receipt_ids', v_existing.affected_receipt_ids
      );
    END IF;
  END IF;

  SELECT * INTO v_claim
  FROM public.credential_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Claim not found');
  END IF;

  v_from_status := v_claim.status;
  IF v_from_status = 'revoked' THEN
    SELECT coalesce(array_agg(receipt_id::text), '{}')
    INTO v_affected_receipt_ids
    FROM public.receipt_claim_dependencies
    WHERE claim_id = p_claim_id;

    RETURN jsonb_build_object(
      'ok', true,
      'claim_id', p_claim_id,
      'from_status', v_from_status,
      'to_status', 'revoked',
      'already_revoked', true,
      'affected_receipt_ids', v_affected_receipt_ids
    );
  END IF;

  SELECT coalesce(array_agg(receipt_id::text), '{}')
  INTO v_affected_receipt_ids
  FROM public.receipt_claim_dependencies
  WHERE claim_id = p_claim_id;

  UPDATE public.credential_claims
  SET status = 'revoked',
      status_updated_at = v_now,
      status_reason_code = p_reason_code,
      status_changed_by = p_changed_by,
      updated_at = v_now,
      revocation_reference = p_reason_code
  WHERE id = p_claim_id;

  INSERT INTO public.credential_status_events (
    claim_id,
    from_status,
    to_status,
    reason_code,
    changed_by,
    idempotency_key,
    affected_receipt_ids
  ) VALUES (
    p_claim_id,
    v_from_status,
    'revoked',
    p_reason_code,
    p_changed_by,
    p_idempotency_key,
    v_affected_receipt_ids
  );

  RETURN jsonb_build_object(
    'ok', true,
    'claim_id', p_claim_id,
    'from_status', v_from_status,
    'to_status', 'revoked',
    'already_revoked', false,
    'affected_receipt_ids', v_affected_receipt_ids
  );
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing
      FROM public.credential_status_events
      WHERE idempotency_key = p_idempotency_key;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'ok', true,
          'claim_id', v_existing.claim_id,
          'from_status', v_existing.from_status,
          'to_status', v_existing.to_status,
          'already_revoked', v_existing.to_status = 'revoked',
          'affected_receipt_ids', v_existing.affected_receipt_ids
        );
      END IF;
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'claim_revoke_failed');
END;
$$;
