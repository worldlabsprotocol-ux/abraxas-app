-- 061_privacy_deletion_approve_atomic.sql
-- Atomic admin deletion approval + one-active-request integrity.
--
-- Prerequisite: 060_privacy_request_ledger.sql, 018_policy_verification.sql, 034_credential_status_registry.sql
-- OPERATOR: apply manually after 060. No production apply from this PR.

-- One active privacy request per subject per type (denied/completed may repeat).
CREATE UNIQUE INDEX IF NOT EXISTS privacy_requests_one_active_per_subject_type_idx
  ON public.privacy_requests (subject_sui, request_type)
  WHERE status NOT IN ('denied', 'completed');

CREATE OR REPLACE FUNCTION public.approve_privacy_deletion_atomic(
  p_request_id uuid,
  p_admin_actor_category text,
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_request public.privacy_requests%ROWTYPE;
  v_existing_event public.privacy_request_events%ROWTYPE;
  v_now timestamptz := now();
  v_subject text;
  v_pseudonym text;
  v_claim record;
  v_claim_ids text[] := '{}';
  v_audit_metadata jsonb;
  v_event_hash text;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_event
    FROM public.privacy_request_events
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      SELECT * INTO v_request FROM public.privacy_requests WHERE id = v_existing_event.request_id;
      RETURN jsonb_build_object(
        'ok', true,
        'request_id', v_request.id,
        'status', v_request.status,
        'access_revoked', v_request.status = 'access_revoked_pending_purge',
        'already_processed', true
      );
    END IF;
  END IF;

  SELECT * INTO v_request
  FROM public.privacy_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF v_request.request_type <> 'account_deletion' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_deletion_request');
  END IF;

  IF v_request.status = 'access_revoked_pending_purge' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'request_id', v_request.id,
      'status', v_request.status,
      'access_revoked', true,
      'already_processed', true
    );
  END IF;

  v_subject := v_request.subject_sui;
  v_pseudonym := v_request.subject_pseudonym_id;

  -- Revoke active credential claims + immutable status events.
  FOR v_claim IN
    SELECT id, status
    FROM public.credential_claims
    WHERE subject_id = v_subject AND status = 'active'
    FOR UPDATE
  LOOP
    v_claim_ids := array_append(v_claim_ids, v_claim.id::text);

    UPDATE public.credential_claims
    SET status = 'revoked',
        status_updated_at = v_now,
        status_reason_code = 'privacy_deletion_approved',
        status_changed_by = p_admin_actor_category,
        updated_at = v_now,
        revocation_reference = 'privacy_deletion_approved'
    WHERE id = v_claim.id;

    INSERT INTO public.credential_status_events (
      claim_id,
      from_status,
      to_status,
      reason_code,
      changed_by,
      idempotency_key,
      affected_receipt_ids
    )
    SELECT
      v_claim.id,
      v_claim.status,
      'revoked',
      'privacy_deletion_approved',
      p_admin_actor_category,
      CASE WHEN p_idempotency_key IS NULL THEN NULL ELSE p_idempotency_key || ':claim:' || v_claim.id::text END,
      coalesce(array_agg(receipt_id::text), '{}')
    FROM public.receipt_claim_dependencies
    WHERE claim_id = v_claim.id;
  END LOOP;

  UPDATE public.abraxas_credentials
  SET revoked_at = v_now
  WHERE (sui_address = v_subject OR holder_wallet = v_subject)
    AND revoked_at IS NULL;

  UPDATE public.identity_verifications
  SET status = 'revoked', updated_at = v_now
  WHERE sui_address = v_subject OR wallet_address = v_subject;

  UPDATE public.wallet_bindings
  SET revoked_at = v_now
  WHERE subject_id = v_subject AND revoked_at IS NULL;

  UPDATE public.privacy_requests
  SET status = 'access_revoked_pending_purge',
      reason_code = 'deletion_purge_pending',
      updated_at = v_now
  WHERE id = p_request_id;

  v_audit_metadata := jsonb_build_object(
    'request_type', 'account_deletion',
    'from_status', v_request.status,
    'to_status', 'access_revoked_pending_purge',
    'reason_code', 'deletion_purge_pending',
    'changed_by_category', 'admin',
    'admin_actor_category', p_admin_actor_category,
    'idempotency_key', p_idempotency_key,
    'access_revoked', true,
    'purge_pending', true,
    'outcome', 'access_revoked_no_purge',
    'claim_count', coalesce(array_length(v_claim_ids, 1), 0)
  );

  INSERT INTO public.privacy_request_events (
    request_id,
    from_status,
    to_status,
    reason_code,
    changed_by_category,
    admin_actor_category,
    idempotency_key,
    metadata
  ) VALUES (
    p_request_id,
    v_request.status,
    'access_revoked_pending_purge',
    'deletion_purge_pending',
    'admin',
    p_admin_actor_category,
    p_idempotency_key,
    v_audit_metadata
  );

  v_event_hash := encode(digest(v_audit_metadata::text, 'sha256'), 'hex');

  INSERT INTO public.audit_events (
    actor_type,
    actor_id,
    action,
    object_type,
    object_id,
    metadata,
    event_hash
  ) VALUES (
    'admin',
    p_admin_actor_category,
    'privacy.deletion.access_revoked',
    'privacy_request',
    p_request_id::text,
    v_audit_metadata,
    v_event_hash
  );

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', p_request_id,
    'status', 'access_revoked_pending_purge',
    'access_revoked', true,
    'already_processed', false,
    'claim_ids', v_claim_ids
  );
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing_event
      FROM public.privacy_request_events
      WHERE idempotency_key = p_idempotency_key;

      IF FOUND THEN
        SELECT * INTO v_request FROM public.privacy_requests WHERE id = v_existing_event.request_id;
        RETURN jsonb_build_object(
          'ok', true,
          'request_id', v_request.id,
          'status', v_request.status,
          'access_revoked', v_request.status = 'access_revoked_pending_purge',
          'already_processed', true
        );
      END IF;
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'deletion_approve_failed');
END;
$$;
