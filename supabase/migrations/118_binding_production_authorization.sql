-- FILE: supabase/migrations/118_binding_production_authorization.sql
-- Per-binding production authorization lifecycle (extends #116 / #500).
--
-- Prerequisites:
--   116_partner_application_policy_bindings.sql
--   110_partner_launchpad_activate_production_atomic.sql (production_activated_at, activation RPC)
--   095_partner_launchpad_production_credential_atomic.sql (launchpad_application_id on partner_api_keys)

ALTER TABLE public.partner_launchpad_application_policies
  ADD COLUMN IF NOT EXISTS production_status text NOT NULL DEFAULT 'sandbox_only'
    CHECK (production_status IN (
      'sandbox_only',
      'production_requested',
      'production_under_review',
      'production_approved',
      'production_active',
      'production_rejected',
      'production_suspended'
    )),
  ADD COLUMN IF NOT EXISTS production_authorized_by text,
  ADD COLUMN IF NOT EXISTS production_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS production_suspended_by text;

CREATE TABLE IF NOT EXISTS public.partner_binding_production_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  binding_id uuid NOT NULL REFERENCES public.partner_launchpad_application_policies(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.partner_launchpad_applications(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  policy_id text NOT NULL,
  policy_version integer NOT NULL,
  policy_template_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  request_notes text,
  reviewer_notes text,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_binding_production_requests_pending_idx
  ON public.partner_binding_production_access_requests (binding_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS partner_binding_production_requests_partner_idx
  ON public.partner_binding_production_access_requests (partner_id, application_id, created_at DESC);

ALTER TABLE public.partner_binding_production_access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_binding_production_access_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_binding_production_access_requests TO service_role;

UPDATE public.partner_launchpad_application_policies b
   SET production_status = 'production_active',
       production_authorized_at = COALESCE(b.production_authorized_at, a.production_activated_at),
       production_authorized_by = COALESCE(b.production_authorized_by, 'legacy_app_activation')
  FROM public.partner_launchpad_applications a
 WHERE b.application_id = a.id
   AND b.binding_role = 'primary'
   AND a.production_activated_at IS NOT NULL
   AND b.production_status = 'sandbox_only';

CREATE OR REPLACE FUNCTION public.partner_launchpad_request_binding_production_atomic(
  p_binding_id uuid,
  p_application_id uuid,
  p_partner_id text,
  p_request_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_binding public.partner_launchpad_application_policies%ROWTYPE;
  v_app public.partner_launchpad_applications%ROWTYPE;
  v_request_id uuid;
  v_now timestamptz := pg_catalog.now();
  v_pending uuid;
BEGIN
  SELECT * INTO v_binding
    FROM public.partner_launchpad_application_policies
   WHERE id = p_binding_id
     AND application_id = p_application_id
     AND partner_id = p_partner_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_not_found');
  END IF;

  SELECT * INTO v_app
    FROM public.partner_launchpad_applications
   WHERE id = p_application_id
     AND partner_id = p_partner_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_not_found');
  END IF;

  IF v_binding.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_not_active');
  END IF;

  IF v_binding.binding_role = 'primary' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'primary_uses_app_review');
  END IF;

  IF v_app.production_activated_at IS NULL OR v_app.environment <> 'production' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_production_not_active');
  END IF;

  IF v_binding.production_status = 'production_active' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_already_production_active');
  END IF;

  IF v_binding.production_status = 'production_suspended' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_production_suspended');
  END IF;

  SELECT id INTO v_pending
    FROM public.partner_binding_production_access_requests
   WHERE binding_id = p_binding_id
     AND status = 'pending'
   LIMIT 1;
  IF v_pending IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'idempotency_replay',
      'request_id', v_pending::text,
      'binding_id', v_binding.id::text,
      'production_status', v_binding.production_status
    );
  END IF;

  INSERT INTO public.partner_binding_production_access_requests (
    binding_id, application_id, partner_id,
    policy_id, policy_version, policy_template_id,
    status, request_notes
  ) VALUES (
    v_binding.id, v_app.id, p_partner_id,
    v_binding.policy_id, v_binding.policy_version, v_binding.policy_template_id,
    'pending', NULLIF(btrim(p_request_notes), '')
  )
  RETURNING id INTO v_request_id;

  UPDATE public.partner_launchpad_application_policies
     SET production_status = 'production_requested',
         updated_at = v_now
   WHERE id = v_binding.id;

  INSERT INTO public.partner_launchpad_activity (
    application_id, partner_id, event_type, public_code, metadata
  ) VALUES (
    v_app.id, p_partner_id, 'binding_production_requested', 'binding_production_requested',
    jsonb_build_object(
      'binding_id', v_binding.id::text,
      'request_id', v_request_id::text,
      'policy_id', v_binding.policy_id,
      'policy_version', v_binding.policy_version,
      'policy_template_id', v_binding.policy_template_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true, 'code', 'requested',
    'request_id', v_request_id::text,
    'binding_id', v_binding.id::text,
    'production_status', 'production_requested'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_launchpad_decide_binding_production_atomic(
  p_decision text,
  p_request_id uuid DEFAULT NULL,
  p_binding_id uuid DEFAULT NULL,
  p_reviewer_id text DEFAULT NULL,
  p_reviewer_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_request public.partner_binding_production_access_requests%ROWTYPE;
  v_binding public.partner_launchpad_application_policies%ROWTYPE;
  v_app public.partner_launchpad_applications%ROWTYPE;
  v_now timestamptz := pg_catalog.now();
BEGIN
  IF p_decision NOT IN ('approve', 'reject', 'suspend', 'reactivate') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_decision IN ('approve', 'reject') THEN
    IF p_request_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
    END IF;
    SELECT * INTO v_request
      FROM public.partner_binding_production_access_requests
     WHERE id = p_request_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'not_found');
    END IF;
    SELECT * INTO v_binding FROM public.partner_launchpad_application_policies WHERE id = v_request.binding_id FOR UPDATE;
    SELECT * INTO v_app FROM public.partner_launchpad_applications WHERE id = v_request.application_id AND partner_id = v_request.partner_id FOR UPDATE;
  ELSE
    IF p_binding_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
    END IF;
    SELECT * INTO v_binding FROM public.partner_launchpad_application_policies WHERE id = p_binding_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'binding_not_found');
    END IF;
    SELECT * INTO v_app FROM public.partner_launchpad_applications WHERE id = v_binding.application_id AND partner_id = v_binding.partner_id FOR UPDATE;
    SELECT * INTO v_request FROM public.partner_binding_production_access_requests WHERE binding_id = p_binding_id AND status = 'approved' ORDER BY reviewed_at DESC NULLS LAST LIMIT 1;
  END IF;

  IF p_decision = 'approve' THEN
    IF v_request.status <> 'pending' THEN
      IF v_request.status = 'approved' AND v_binding.production_status = 'production_active' THEN
        RETURN jsonb_build_object('ok', true, 'code', 'idempotency_replay', 'binding_id', v_binding.id::text, 'production_status', 'production_active');
      END IF;
      RETURN jsonb_build_object('ok', false, 'code', 'request_not_pending');
    END IF;
    IF v_app.production_activated_at IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'application_production_not_active');
    END IF;

    UPDATE public.partner_binding_production_access_requests
       SET status = 'approved', reviewer_notes = NULLIF(btrim(p_reviewer_notes), ''),
           reviewed_by = NULLIF(btrim(p_reviewer_id), ''), reviewed_at = v_now
     WHERE id = v_request.id;

    UPDATE public.partner_launchpad_application_policies
       SET production_status = 'production_active',
           production_authorized_at = COALESCE(production_authorized_at, v_now),
           production_authorized_by = COALESCE(NULLIF(btrim(p_reviewer_id), ''), production_authorized_by, 'operator_review'),
           production_suspended_at = NULL, production_suspended_by = NULL, updated_at = v_now
     WHERE id = v_binding.id;

    INSERT INTO public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
    VALUES (v_app.id, v_request.partner_id, 'binding_production_approved', 'binding_production_approved',
      jsonb_build_object('binding_id', v_binding.id::text, 'request_id', v_request.id::text, 'policy_id', v_binding.policy_id, 'policy_version', v_binding.policy_version));
    INSERT INTO public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
    VALUES (v_app.id, v_request.partner_id, 'binding_production_activated', 'binding_production_activated',
      jsonb_build_object('binding_id', v_binding.id::text, 'request_id', v_request.id::text, 'policy_id', v_binding.policy_id, 'policy_version', v_binding.policy_version));

    RETURN jsonb_build_object('ok', true, 'code', 'approved', 'binding_id', v_binding.id::text, 'production_status', 'production_active');
  END IF;

  IF p_decision = 'reject' THEN
    IF v_request.status <> 'pending' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'request_not_pending');
    END IF;
    UPDATE public.partner_binding_production_access_requests
       SET status = 'rejected', reviewer_notes = NULLIF(btrim(p_reviewer_notes), ''),
           reviewed_by = NULLIF(btrim(p_reviewer_id), ''), reviewed_at = v_now
     WHERE id = v_request.id;
    UPDATE public.partner_launchpad_application_policies
       SET production_status = 'production_rejected', updated_at = v_now
     WHERE id = v_binding.id;
    INSERT INTO public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
    VALUES (v_app.id, v_request.partner_id, 'binding_production_rejected', 'binding_production_rejected',
      jsonb_build_object('binding_id', v_binding.id::text, 'request_id', v_request.id::text, 'policy_id', v_binding.policy_id));
    RETURN jsonb_build_object('ok', true, 'code', 'rejected', 'binding_id', v_binding.id::text, 'production_status', 'production_rejected');
  END IF;

  IF p_decision = 'suspend' THEN
    IF v_binding.production_status <> 'production_active' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'binding_not_production_active');
    END IF;
    UPDATE public.partner_launchpad_application_policies
       SET production_status = 'production_suspended', production_suspended_at = v_now,
           production_suspended_by = NULLIF(btrim(p_reviewer_id), ''), updated_at = v_now
     WHERE id = v_binding.id;
    INSERT INTO public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
    VALUES (v_app.id, v_binding.partner_id, 'binding_production_suspended', 'binding_production_suspended',
      jsonb_build_object('binding_id', v_binding.id::text, 'policy_id', v_binding.policy_id));
    RETURN jsonb_build_object('ok', true, 'code', 'suspended', 'binding_id', v_binding.id::text, 'production_status', 'production_suspended');
  END IF;

  IF v_binding.production_status <> 'production_suspended' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_not_suspended');
  END IF;
  IF v_binding.production_authorized_at IS NULL OR v_app.production_activated_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'binding_never_authorized');
  END IF;
  UPDATE public.partner_launchpad_application_policies
     SET production_status = 'production_active', production_suspended_at = NULL,
         production_suspended_by = NULL, updated_at = v_now
   WHERE id = v_binding.id;
  INSERT INTO public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
  VALUES (v_app.id, v_binding.partner_id, 'binding_production_reactivated', 'binding_production_reactivated',
    jsonb_build_object('binding_id', v_binding.id::text, 'policy_id', v_binding.policy_id));
  RETURN jsonb_build_object('ok', true, 'code', 'reactivated', 'binding_id', v_binding.id::text, 'production_status', 'production_active');
END;
$$;

-- Extend app activation to sync primary binding authorization.
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
  v_activated_at timestamptz;
BEGIN
  IF p_request_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input', 'activates_mainnet', false, 'executes', false);
  END IF;

  SELECT * INTO v_request FROM public.partner_production_access_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'activates_mainnet', false, 'executes', false);
  END IF;
  IF v_request.status = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_state', 'activates_mainnet', false, 'executes', false);
  END IF;

  SELECT * INTO v_app FROM public.partner_launchpad_applications
   WHERE id = v_request.application_id AND partner_id = v_request.partner_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'activates_mainnet', false, 'executes', false);
  END IF;

  v_prior_environment := v_app.environment;
  v_prior_activated := v_app.production_activated_at;

  IF v_app.production_api_key_id IS NOT NULL THEN
    SELECT * INTO v_key FROM public.partner_api_keys
     WHERE id = v_app.production_api_key_id AND partner_id = v_request.partner_id FOR UPDATE;
    v_active := FOUND AND v_key.revoked_at IS NULL AND v_key.key_prefix LIKE 'abx_live_%';
  END IF;

  IF v_app.production_activated_at IS NOT NULL AND v_request.status = 'approved' AND v_active THEN
    RETURN jsonb_build_object(
      'ok', true, 'code', 'idempotency_replay', 'request_id', v_request.id::text,
      'application_id', v_app.id::text, 'partner_id', v_request.partner_id,
      'api_key_id', v_app.production_api_key_id::text, 'key_prefix', v_key.key_prefix,
      'credential_state', 'active', 'environment', v_app.environment,
      'production_activated_at', v_app.production_activated_at,
      'policy_id', v_app.policy_id, 'policy_version', v_app.policy_version,
      'prior_environment', v_prior_environment, 'activates_mainnet', false, 'executes', false, 'issues_production_key', false
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
    INSERT INTO public.partner_api_keys (partner_id, display_name, key_prefix, key_hash, scopes, launchpad_application_id)
    VALUES (v_request.partner_id, v_app.display_name || ' production', p_key_prefix, p_key_hash,
      ARRAY['verify:credential', 'verify:registry', 'webhooks:read']::text[], v_app.id)
    RETURNING id INTO v_new_id;
    IF v_app.production_api_key_id IS NOT NULL AND NOT v_active THEN
      UPDATE public.partner_api_keys SET revoked_at = COALESCE(revoked_at, v_now)
       WHERE id = v_app.production_api_key_id AND partner_id = v_request.partner_id;
    END IF;
  ELSE
    v_new_id := v_app.production_api_key_id;
    p_key_prefix := v_key.key_prefix;
  END IF;

  v_activated_at := COALESCE(v_prior_activated, v_now);

  UPDATE public.partner_production_access_requests
     SET status = 'approved', reviewer_notes = COALESCE(NULLIF(btrim(p_reviewer_notes), ''), reviewer_notes, 'production_activated'),
         reviewed_at = COALESCE(reviewed_at, v_now)
   WHERE id = p_request_id;

  UPDATE public.partner_launchpad_applications
     SET environment = 'production', status = 'active', production_api_key_id = v_new_id,
         production_activated_at = v_activated_at, updated_at = v_now
   WHERE id = v_app.id AND partner_id = v_request.partner_id;

  UPDATE public.partners
     SET allowed_environments = ARRAY(SELECT DISTINCT unnest(COALESCE(allowed_environments, ARRAY[]::text[]) || ARRAY['production']::text[])),
         updated_at = v_now
   WHERE partner_id = v_request.partner_id;

  UPDATE public.partner_launchpad_application_policies
     SET production_status = 'production_active',
         production_authorized_at = COALESCE(production_authorized_at, v_activated_at),
         production_authorized_by = COALESCE(production_authorized_by, 'app_activation'),
         updated_at = v_now
   WHERE application_id = v_app.id AND partner_id = v_request.partner_id
     AND binding_role = 'primary' AND policy_id = v_app.policy_id;

  INSERT INTO public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
  VALUES (v_app.id, v_request.partner_id, 'production_application_activated', 'production_application_activated',
    jsonb_build_object('request_id', p_request_id::text, 'environment', 'production', 'policy_id', v_app.policy_id,
      'policy_version', v_app.policy_version, 'key_prefix', p_key_prefix, 'api_key_id', v_new_id::text,
      'prior_environment', v_prior_environment, 'prior_production_activated_at', v_prior_activated,
      'issues_production_key', NOT v_active, 'activates_production', true, 'activates_mainnet', false));

  RETURN jsonb_build_object(
    'ok', true, 'code', CASE WHEN v_active THEN 'reactivated' ELSE 'activated' END,
    'request_id', v_request.id::text, 'application_id', v_app.id::text, 'partner_id', v_request.partner_id,
    'api_key_id', v_new_id::text, 'key_prefix', p_key_prefix, 'credential_state', 'active',
    'environment', 'production', 'production_activated_at', v_activated_at,
    'policy_id', v_app.policy_id, 'policy_version', v_app.policy_version,
    'prior_environment', v_prior_environment, 'activates_mainnet', false, 'executes', false, 'issues_production_key', NOT v_active
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_issued', 'credential_state', 'active', 'activates_mainnet', false, 'executes', false);
  WHEN OTHERS THEN RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_launchpad_request_binding_production_atomic(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_request_binding_production_atomic(uuid, uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.partner_launchpad_decide_binding_production_atomic(text, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_launchpad_decide_binding_production_atomic(text, uuid, uuid, text, text) TO service_role;
