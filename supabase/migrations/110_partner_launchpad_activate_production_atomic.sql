-- FILE: supabase/migrations/110_partner_launchpad_activate_production_atomic.sql
-- Canonical production activation: review approval + environment + credential + audit in one transaction.
--
-- Prerequisite: 084, 085, 095
-- Replaces split approve (085 RPC) + credential issue (095 RPC) for new operator workflows.
-- Legacy RPCs remain for read compatibility; application code must call this RPC only.

ALTER TABLE public.partner_launchpad_applications
  ADD COLUMN IF NOT EXISTS production_activated_at timestamptz;

CREATE OR REPLACE FUNCTION public.partner_launchpad_activate_production_atomic(
  p_request_id uuid,
  p_key_prefix text DEFAULT NULL,
  p_key_hash text DEFAULT NULL,
  p_reviewer_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_request public.partner_production_access_requests%ROWTYPE;
  v_app public.partner_launchpad_applications%ROWTYPE;
  v_key public.partner_api_keys%ROWTYPE;
  v_new_id uuid;
  v_now timestamptz := pg_catalog.now();
  v_active boolean := false;
  v_prior_environment text;
  v_prior_activated timestamptz;
BEGIN
  IF p_request_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false);
  END IF;

  SELECT * INTO v_request
    FROM public.partner_production_access_requests
   WHERE id = p_request_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'activates_mainnet', false, 'executes', false);
  END IF;

  IF v_request.status = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state', 'activates_mainnet', false, 'executes', false);
  END IF;

  SELECT * INTO v_app
    FROM public.partner_launchpad_applications
   WHERE id = v_request.application_id
     AND partner_id = v_request.partner_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'activates_mainnet', false, 'executes', false);
  END IF;

  v_prior_environment := v_app.environment;
  v_prior_activated := v_app.production_activated_at;

  IF v_app.production_api_key_id IS NOT NULL THEN
    SELECT * INTO v_key
      FROM public.partner_api_keys
     WHERE id = v_app.production_api_key_id
       AND partner_id = v_request.partner_id
     FOR UPDATE;
    v_active := FOUND AND v_key.revoked_at IS NULL AND v_key.key_prefix LIKE 'abx_live_%';
  END IF;

  IF v_app.production_activated_at IS NOT NULL
     AND v_request.status = 'approved'
     AND v_active THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'idempotency_replay',
      'request_id', v_request.id::text,
      'application_id', v_app.id::text,
      'partner_id', v_request.partner_id,
      'api_key_id', v_app.production_api_key_id::text,
      'key_prefix', v_key.key_prefix,
      'credential_state', 'active',
      'environment', v_app.environment,
      'production_activated_at', v_app.production_activated_at,
      'policy_id', v_app.policy_id,
      'policy_version', v_app.policy_version,
      'prior_environment', v_prior_environment,
      'activates_mainnet', false,
      'executes', false,
      'issues_production_key', false
    );
  END IF;

  IF v_request.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state', 'activates_mainnet', false, 'executes', false);
  END IF;

  IF NOT v_active THEN
    IF p_key_prefix IS NULL OR length(p_key_prefix) <> 16 OR p_key_prefix !~ '^abx_live_[A-Za-z0-9_-]{7}$' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false);
    END IF;
    IF p_key_hash IS NULL OR p_key_hash !~ '^[a-f0-9]{64}$' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false);
    END IF;

    INSERT INTO public.partner_api_keys (
      partner_id, display_name, key_prefix, key_hash, scopes, launchpad_application_id
    ) VALUES (
      v_request.partner_id,
      v_app.display_name || ' production',
      p_key_prefix,
      p_key_hash,
      ARRAY['verify:credential', 'verify:registry', 'webhooks:read']::text[],
      v_app.id
    )
    RETURNING id INTO v_new_id;

    IF v_app.production_api_key_id IS NOT NULL AND NOT v_active THEN
      UPDATE public.partner_api_keys
         SET revoked_at = COALESCE(revoked_at, v_now)
       WHERE id = v_app.production_api_key_id
         AND partner_id = v_request.partner_id;
    END IF;
  ELSE
    v_new_id := v_app.production_api_key_id;
    p_key_prefix := v_key.key_prefix;
  END IF;

  UPDATE public.partner_production_access_requests
     SET status = 'approved',
         reviewer_notes = COALESCE(NULLIF(btrim(p_reviewer_notes), ''), reviewer_notes, 'production_activated'),
         reviewed_at = COALESCE(reviewed_at, v_now)
   WHERE id = p_request_id;

  UPDATE public.partner_launchpad_applications
     SET environment = 'production',
         status = 'active',
         production_api_key_id = v_new_id,
         production_activated_at = COALESCE(production_activated_at, v_now),
         updated_at = v_now
   WHERE id = v_app.id
     AND partner_id = v_request.partner_id;

  UPDATE public.partners
     SET allowed_environments = ARRAY(
           SELECT DISTINCT unnest(COALESCE(allowed_environments, ARRAY[]::text[]) || ARRAY['production']::text[])
         ),
         updated_at = v_now
   WHERE partner_id = v_request.partner_id;

  INSERT INTO public.partner_launchpad_activity (
    application_id, partner_id, event_type, public_code, metadata
  ) VALUES (
    v_app.id,
    v_request.partner_id,
    'production_application_activated',
    'production_application_activated',
    jsonb_build_object(
      'request_id', p_request_id::text,
      'environment', 'production',
      'policy_id', v_app.policy_id,
      'policy_version', v_app.policy_version,
      'key_prefix', p_key_prefix,
      'api_key_id', v_new_id::text,
      'prior_environment', v_prior_environment,
      'prior_production_activated_at', v_prior_activated,
      'issues_production_key', NOT v_active,
      'activates_production', true,
      'activates_mainnet', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', CASE WHEN v_active THEN 'reactivated' ELSE 'activated' END,
    'request_id', v_request.id::text,
    'application_id', v_app.id::text,
    'partner_id', v_request.partner_id,
    'api_key_id', v_new_id::text,
    'key_prefix', p_key_prefix,
    'credential_state', 'active',
    'environment', 'production',
    'production_activated_at', COALESCE(v_prior_activated, v_now),
    'policy_id', v_app.policy_id,
    'policy_version', v_app.policy_version,
    'prior_environment', v_prior_environment,
    'activates_mainnet', false,
    'executes', false,
    'issues_production_key', NOT v_active
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_issued',
      'credential_state', 'active',
      'activates_mainnet', false,
      'executes', false
    );
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_launchpad_activate_production_atomic(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.partner_launchpad_activate_production_atomic(uuid, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_activate_production_atomic(uuid, text, text, text) TO postgres, service_role;
