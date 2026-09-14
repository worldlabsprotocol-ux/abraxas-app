-- 083_zklogin_wallet_binding_atomic.sql
-- Atomic zkLogin wallet binding + L2 wallet_binding_confirmed claim.
--
-- Prerequisite: 018_policy_verification.sql, 036_connect_wallet_authority.sql
-- OPERATOR: apply after merge before relying on wallet repair in production.

CREATE OR REPLACE FUNCTION public.upsert_zklogin_wallet_binding_atomic(
  p_subject_id text,
  p_wallet_address text,
  p_binding_method text DEFAULT 'zklogin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now timestamptz := pg_catalog.now();
  v_subject text := lower(btrim(p_subject_id));
  v_wallet text := lower(btrim(p_wallet_address));
  v_method text := coalesce(nullif(btrim(p_binding_method), ''), 'zklogin');
  v_new_claim_id uuid;
BEGIN
  IF v_subject = '' OR v_wallet = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  INSERT INTO public.credential_claims (
    subject_id,
    credential_jti,
    claim_type,
    claim_value,
    issuer_id,
    assurance_level,
    issued_at,
    expires_at,
    status,
    policy_scope,
    updated_at
  ) VALUES (
    v_subject,
    NULL,
    'wallet_binding_confirmed',
    jsonb_build_object(
      'wallet_address', v_wallet,
      'chain', 'sui',
      'binding_method', v_method
    ),
    'issuer:abraxas',
    'L2',
    v_now,
    NULL,
    'active',
    'core',
    v_now
  )
  RETURNING id INTO v_new_claim_id;

  UPDATE public.credential_claims
  SET status = 'expired',
      updated_at = v_now
  WHERE subject_id = v_subject
    AND claim_type = 'wallet_binding_confirmed'
    AND status = 'active'
    AND id <> v_new_claim_id;

  INSERT INTO public.wallet_bindings (
    subject_id,
    chain,
    wallet_address,
    binding_method,
    binding_status,
    verified_at,
    revoked_at,
    risk_status
  ) VALUES (
    v_subject,
    'sui',
    v_wallet,
    v_method,
    'active',
    v_now,
    NULL,
    'low'
  )
  ON CONFLICT (subject_id, wallet_address) DO UPDATE SET
    binding_method = EXCLUDED.binding_method,
    binding_status = 'active',
    verified_at = EXCLUDED.verified_at,
    revoked_at = NULL,
    risk_status = 'low';

  RETURN jsonb_build_object('ok', true, 'claim_id', v_new_claim_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'database_error',
      'detail', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_zklogin_wallet_binding_atomic(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_zklogin_wallet_binding_atomic(text, text, text) TO service_role;

-- Atomic credential claim replacement — insert replacement before expiring prior active claims.
CREATE OR REPLACE FUNCTION public.replace_credential_claim_atomic(
  p_subject_id text,
  p_credential_jti text,
  p_claim_type text,
  p_claim_value jsonb,
  p_issuer_id text,
  p_assurance_level text,
  p_issued_at timestamptz DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_evidence_reference text DEFAULT NULL,
  p_jurisdiction text DEFAULT NULL,
  p_policy_scope text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_now timestamptz := pg_catalog.now();
  v_subject text := lower(btrim(p_subject_id));
  v_claim_type text := btrim(p_claim_type);
  v_new_claim_id uuid;
BEGIN
  IF v_subject = '' OR v_claim_type = '' OR p_issuer_id IS NULL OR btrim(p_issuer_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  INSERT INTO public.credential_claims (
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
  ) VALUES (
    v_subject,
    p_credential_jti,
    v_claim_type,
    coalesce(p_claim_value, '{}'::jsonb),
    btrim(p_issuer_id),
    p_assurance_level,
    coalesce(p_issued_at, v_now),
    p_expires_at,
    'active',
    p_evidence_reference,
    p_jurisdiction,
    p_policy_scope,
    v_now
  )
  RETURNING id INTO v_new_claim_id;

  UPDATE public.credential_claims
  SET status = 'expired',
      updated_at = v_now
  WHERE subject_id = v_subject
    AND claim_type = v_claim_type
    AND status = 'active'
    AND id <> v_new_claim_id;

  RETURN jsonb_build_object('ok', true, 'claim_id', v_new_claim_id);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_credential_claim_atomic(
  text, text, text, jsonb, text, text, timestamptz, timestamptz, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_credential_claim_atomic(
  text, text, text, jsonb, text, text, timestamptz, timestamptz, text, text, text
) TO service_role;
