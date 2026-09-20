-- FILE: supabase/migrations/095_partner_launchpad_production_credential_atomic.sql
-- Atomic operator Production credential issue / rotate / revoke.
--
-- Prerequisite: 085_partner_launchpad_hardening.sql
-- DEMO-first. Do not apply from Vercel or this PR. Operator applies manually.
-- Service-role execute only. RLS on partner_api_keys stays enabled.
--
-- Invariant: at most one unrevoked abx_live_ key per Launchpad application.
-- Does not approve reviews, change environment, activate Mainnet, or execute actions.

ALTER TABLE public.partner_api_keys
  ADD COLUMN IF NOT EXISTS launchpad_application_id uuid
    REFERENCES public.partner_launchpad_applications(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_api_keys_one_active_live_per_app
  ON public.partner_api_keys (launchpad_application_id)
  WHERE revoked_at IS NULL
    AND launchpad_application_id IS NOT NULL
    AND key_prefix LIKE 'abx_live_%';

CREATE OR REPLACE FUNCTION public.partner_launchpad_operate_production_credential_atomic(
  p_request_id uuid,
  p_action text,
  p_key_prefix text DEFAULT NULL,
  p_key_hash text DEFAULT NULL
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
BEGIN
  IF p_request_id IS NULL OR p_action IS NULL OR p_action NOT IN ('issue', 'rotate', 'revoke') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false, 'environment_changed', false);
  END IF;

  SELECT * INTO v_request
    FROM public.partner_production_access_requests
   WHERE id = p_request_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'activates_mainnet', false, 'executes', false, 'environment_changed', false);
  END IF;

  SELECT * INTO v_app
    FROM public.partner_launchpad_applications
   WHERE id = v_request.application_id
     AND partner_id = v_request.partner_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'activates_mainnet', false, 'executes', false, 'environment_changed', false);
  END IF;

  IF v_app.production_api_key_id IS NOT NULL THEN
    SELECT * INTO v_key
      FROM public.partner_api_keys
     WHERE id = v_app.production_api_key_id
       AND partner_id = v_request.partner_id
     FOR UPDATE;
    v_active := FOUND AND v_key.revoked_at IS NULL AND v_key.key_prefix LIKE 'abx_live_%';
  END IF;

  IF p_action = 'revoke' THEN
    IF NOT v_active THEN
      RETURN jsonb_build_object(
        'ok', true,
        'code', 'already_revoked',
        'action', 'revoke',
        'credential_state', CASE WHEN v_app.production_api_key_id IS NULL THEN 'never_issued' ELSE 'revoked' END,
        'request_id', v_request.id::text,
        'application_id', v_app.id::text,
        'activates_mainnet', false,
        'executes', false,
        'environment_changed', false
      );
    END IF;
    UPDATE public.partner_api_keys
       SET revoked_at = v_now
     WHERE id = v_key.id
       AND partner_id = v_request.partner_id;
    INSERT INTO public.partner_launchpad_activity (
      application_id, partner_id, event_type, public_code, metadata
    ) VALUES (
      v_app.id,
      v_request.partner_id,
      'production_credential_revoked',
      'production_credential_revoked',
      jsonb_build_object(
        'request_id', v_request.id::text,
        'policy_id', v_app.policy_id,
        'policy_version', v_app.policy_version,
        'issues_production_key', false,
        'activates_production', false
      )
    );
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'revoked',
      'action', 'revoke',
      'credential_state', 'revoked',
      'request_id', v_request.id::text,
      'application_id', v_app.id::text,
      'activates_mainnet', false,
      'executes', false,
      'environment_changed', false
    );
  END IF;

  IF v_request.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'review_not_approved', 'activates_mainnet', false, 'executes', false, 'environment_changed', false);
  END IF;

  IF p_action = 'issue' AND v_active THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_issued',
      'credential_state', 'active',
      'request_id', v_request.id::text,
      'application_id', v_app.id::text,
      'activates_mainnet', false,
      'executes', false,
      'environment_changed', false
    );
  END IF;

  IF p_action = 'rotate' AND NOT v_active THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'rotation_not_available',
      'credential_state', CASE WHEN v_app.production_api_key_id IS NULL THEN 'never_issued' ELSE 'revoked' END,
      'activates_mainnet', false,
      'executes', false,
      'environment_changed', false
    );
  END IF;

  IF p_key_prefix IS NULL OR length(p_key_prefix) <> 16 OR p_key_prefix !~ '^abx_live_[A-Za-z0-9_-]{7}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false, 'environment_changed', false);
  END IF;
  IF p_key_hash IS NULL OR p_key_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false, 'environment_changed', false);
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

  IF p_action = 'rotate' THEN
    UPDATE public.partner_api_keys
       SET revoked_at = v_now
     WHERE id = v_key.id
       AND partner_id = v_request.partner_id
       AND revoked_at IS NULL;
  ELSIF v_app.production_api_key_id IS NOT NULL AND NOT v_active THEN
    UPDATE public.partner_api_keys
       SET revoked_at = COALESCE(revoked_at, v_now)
     WHERE id = v_app.production_api_key_id
       AND partner_id = v_request.partner_id;
  END IF;

  UPDATE public.partner_launchpad_applications
     SET production_api_key_id = v_new_id,
         updated_at = v_now
   WHERE id = v_app.id
     AND partner_id = v_request.partner_id;

  INSERT INTO public.partner_launchpad_activity (
    application_id, partner_id, event_type, public_code, metadata
  ) VALUES (
    v_app.id,
    v_request.partner_id,
    CASE WHEN p_action = 'rotate' THEN 'production_credential_rotated' ELSE 'production_credential_issued' END,
    CASE WHEN p_action = 'rotate' THEN 'production_credential_rotated' ELSE 'production_credential_issued' END,
    jsonb_build_object(
      'request_id', v_request.id::text,
      'key_prefix', p_key_prefix,
      'policy_id', v_app.policy_id,
      'policy_version', v_app.policy_version,
      'issues_production_key', true,
      'activates_production', false
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', CASE WHEN p_action = 'rotate' THEN 'rotated' ELSE 'issued' END,
    'action', p_action,
    'credential_state', CASE WHEN p_action = 'rotate' THEN 'rotating' ELSE 'active' END,
    'key_prefix', p_key_prefix,
    'request_id', v_request.id::text,
    'application_id', v_app.id::text,
    'activates_mainnet', false,
    'executes', false,
    'environment_changed', false
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', CASE WHEN p_action = 'issue' THEN 'already_issued' ELSE 'rotation_not_available' END,
      'credential_state', 'active',
      'activates_mainnet', false,
      'executes', false,
      'environment_changed', false
    );
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_launchpad_operate_production_credential_atomic(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.partner_launchpad_operate_production_credential_atomic(uuid, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_operate_production_credential_atomic(uuid, text, text, text) TO postgres, service_role;
