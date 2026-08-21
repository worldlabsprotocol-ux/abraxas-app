-- 066_partner_production_env_promotion_atomic.sql
-- Production partner environment promotion — atomic RPC with write-time readiness and audit.
--
-- Prerequisite: 018_policy_verification.sql (audit_events), 024_partner_api_keys.sql, 039_partner_onboarding.sql, 055_policy_immutable_versions.sql
-- OPERATOR: apply manually. Do not auto-apply from this PR.

-- ── Return URL helpers (mirror lib/connect/returnUrlAllowlistSemantics.ts) ─────

CREATE OR REPLACE FUNCTION public.partner_return_url_normalize_for_allowlist(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v text;
  v_scheme text;
  v_rest text;
  v_hostport text;
  v_path text;
  v_normalized text;
BEGIN
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RETURN NULL;
  END IF;

  v := btrim(p_url);

  IF v ~* '^https://' THEN
    v_scheme := 'https';
    v_rest := substring(v from 9);
  ELSIF v ~* '^http://' THEN
    v_scheme := 'http';
    v_rest := substring(v from 8);
  ELSE
    RETURN NULL;
  END IF;

  IF v_rest IS NULL OR v_rest = '' THEN
    RETURN NULL;
  END IF;

  v_hostport := split_part(regexp_replace(v_rest, '[?#].*$', ''), '/', 1);
  IF v_hostport = '' THEN
    RETURN NULL;
  END IF;

  IF v_scheme = 'http' AND lower(split_part(v_hostport, ':', 1)) <> 'localhost' THEN
    RETURN NULL;
  END IF;

  IF position('/' in v_rest) > 0 THEN
    v_path := substring(v_rest from position('/' in v_rest));
    v_path := regexp_replace(v_path, '[?#].*$', '');
  ELSE
    v_path := '/';
  END IF;

  IF v_path = '' THEN
    v_path := '/';
  END IF;

  v_normalized := v_scheme || '://' || v_hostport || v_path;
  IF right(v_normalized, 1) = '/' THEN
    v_normalized := left(v_normalized, length(v_normalized) - 1);
  END IF;

  RETURN v_normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_return_url_matches_allowlist_entry(
  p_normalized text,
  p_entry text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_candidate text;
BEGIN
  IF p_normalized IS NULL OR p_normalized = '' THEN
    RETURN false;
  END IF;

  v_candidate := public.partner_return_url_normalize_for_allowlist(p_entry);
  IF v_candidate IS NULL THEN
    RETURN false;
  END IF;

  RETURN p_normalized = v_candidate
    OR p_normalized LIKE v_candidate || '/%';
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_return_url_matches_allowlist(
  p_allowed_urls text[],
  p_return_url text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_normalized text;
  v_entry text;
BEGIN
  IF p_allowed_urls IS NULL OR pg_catalog.array_length(p_allowed_urls, 1) IS NULL THEN
    RETURN false;
  END IF;

  v_normalized := public.partner_return_url_normalize_for_allowlist(p_return_url);
  IF v_normalized IS NULL THEN
    RETURN false;
  END IF;

  FOREACH v_entry IN ARRAY p_allowed_urls LOOP
    IF public.partner_return_url_matches_allowlist_entry(v_normalized, v_entry) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_stored_return_url_production_compliant(p_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RETURN false;
  END IF;

  IF p_url NOT ILIKE 'https://%' THEN
    RETURN false;
  END IF;

  IF p_url LIKE '%abraxas-app.vercel.app%' THEN
    RETURN false;
  END IF;

  RETURN public.partner_return_url_normalize_for_allowlist(p_url) IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_is_sandbox_policy_id(p_policy_id text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN p_policy_id IN ('partner-sandbox-gate-v1', 'meridian-investor-gate-v1');
END;
$$;

-- ── Atomic promotion RPC ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.partner_production_env_promote_atomic(
  p_partner_id text,
  p_policy_id text,
  p_return_url text,
  p_operation text,
  p_actor_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_partner public.partners%ROWTYPE;
  v_policy public.partner_policies%ROWTYPE;
  v_checks jsonb := '{}'::jsonb;
  v_all_checks_pass boolean := true;
  v_key record;
  v_active_live_key_count int := 0;
  v_url text;
  v_now timestamptz := pg_catalog.now();
  v_audit_id uuid;
  v_metadata jsonb;
  v_action text;
  v_already boolean := false;
  v_new_envs text[];
  v_previous_envs text[];
  v_previous_status text;
  v_active_policy_count int := 0;
  v_id_pattern constant text := '^[a-z0-9][a-z0-9-]{0,127}$';
BEGIN
  v_checks := jsonb_build_object(
    'query_valid', false,
    'return_url_syntax_valid', false,
    'partner_row_exists', false,
    'partner_is_external', false,
    'partner_status_usable', false,
    'return_urls_configured', false,
    'return_url_request_allowlisted', false,
    'all_stored_return_urls_compliant', false,
    'policy_row_exists', false,
    'policy_active', false,
    'policy_partner_match', false,
    'policy_assigned_match', false,
    'policy_not_sandbox', false,
    'onboarding_fields_present', false
  );

  IF p_operation NOT IN ('activate', 'reverse') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_operation');
  END IF;

  IF p_partner_id IS NULL
     OR btrim(p_partner_id) = ''
     OR p_partner_id !~ v_id_pattern THEN
    IF p_operation = 'reverse' THEN
      v_checks := jsonb_build_object(
        'query_valid', false,
        'partner_row_exists', false,
        'partner_is_external', false
      );
      RETURN jsonb_build_object('ok', false, 'code', 'readiness_failed', 'checks', v_checks);
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'readiness_failed', 'checks', v_checks);
  END IF;

  SELECT * INTO v_partner
  FROM public.partners
  WHERE partner_id = p_partner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_operation = 'reverse' THEN
      v_checks := jsonb_build_object(
        'query_valid', true,
        'partner_row_exists', false,
        'partner_is_external', false
      );
    ELSE
      v_checks := jsonb_set(v_checks, '{query_valid}', 'true'::jsonb);
      v_checks := jsonb_set(v_checks, '{partner_row_exists}', 'false'::jsonb);
    END IF;
    RETURN jsonb_build_object('ok', false, 'code', 'readiness_failed', 'checks', v_checks);
  END IF;

  IF p_operation = 'reverse' THEN
    v_checks := jsonb_build_object(
      'query_valid', true,
      'partner_row_exists', true,
      'partner_is_external', v_partner.is_external IS TRUE
    );

    IF (v_checks->>'partner_is_external')::boolean IS NOT TRUE THEN
      RETURN jsonb_build_object('ok', false, 'code', 'readiness_failed', 'checks', v_checks);
    END IF;

    FOR v_key IN
      SELECT id
      FROM public.partner_api_keys
      WHERE partner_id = p_partner_id
        AND revoked_at IS NULL
        AND key_prefix LIKE 'abx_live_%'
      FOR UPDATE
    LOOP
      v_active_live_key_count := v_active_live_key_count + 1;
    END LOOP;

    v_already :=
      NOT ('production' = ANY(COALESCE(v_partner.allowed_environments, ARRAY[]::text[])))
      AND v_partner.status = 'pilot'
      AND v_active_live_key_count = 0;

    IF v_already THEN
      v_action := 'admin.partner.production_env.reverse';
      v_metadata := jsonb_build_object(
        'admin_access_method', 'email',
        'previous_allowed_environments', COALESCE(v_partner.allowed_environments, ARRAY[]::text[]),
        'new_allowed_environments', ARRAY['sandbox']::text[],
        'previous_status', v_partner.status,
        'new_status', 'pilot',
        'already_reversed', true,
        'operation', 'reverse'
      );

      INSERT INTO public.audit_events (
        actor_type,
        actor_id,
        action,
        object_type,
        object_id,
        policy_id,
        policy_version,
        metadata,
        event_hash
      ) VALUES (
        'admin_operator',
        p_actor_category,
        v_action,
        'partner',
        p_partner_id,
        NULL,
        NULL,
        v_metadata,
        NULL
      )
      RETURNING id INTO v_audit_id;

      RETURN jsonb_build_object(
        'ok', true,
        'partner_id', p_partner_id,
        'allowed_environments', COALESCE(v_partner.allowed_environments, ARRAY['sandbox']::text[]),
        'status', v_partner.status,
        'already_reversed', true,
        'audit_event_id', v_audit_id
      );
    END IF;

    UPDATE public.partners
    SET allowed_environments = ARRAY['sandbox']::text[],
        status = 'pilot',
        updated_at = v_now
    WHERE partner_id = p_partner_id;

    UPDATE public.partner_api_keys
    SET revoked_at = v_now
    WHERE partner_id = p_partner_id
      AND revoked_at IS NULL
      AND key_prefix LIKE 'abx_live_%';

    v_action := 'admin.partner.production_env.reverse';
    v_metadata := jsonb_build_object(
      'admin_access_method', 'email',
      'previous_allowed_environments', COALESCE(v_partner.allowed_environments, ARRAY[]::text[]),
      'new_allowed_environments', ARRAY['sandbox']::text[],
      'previous_status', v_partner.status,
      'new_status', 'pilot',
      'already_reversed', false,
      'operation', 'reverse'
    );

    INSERT INTO public.audit_events (
      actor_type,
      actor_id,
      action,
      object_type,
      object_id,
      policy_id,
      policy_version,
      metadata,
      event_hash
    ) VALUES (
      'admin_operator',
      p_actor_category,
      v_action,
      'partner',
      p_partner_id,
      NULL,
      NULL,
      v_metadata,
      NULL
    )
    RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
      'ok', true,
      'partner_id', p_partner_id,
      'allowed_environments', ARRAY['sandbox']::text[],
      'status', 'pilot',
      'already_reversed', false,
      'audit_event_id', v_audit_id
    );
  END IF;

  -- activate
  IF p_policy_id IS NULL
     OR btrim(p_policy_id) = ''
     OR p_policy_id !~ v_id_pattern
     OR p_return_url IS NULL
     OR btrim(p_return_url) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'readiness_failed', 'checks', v_checks);
  END IF;

  v_checks := jsonb_set(v_checks, '{query_valid}', 'true'::jsonb);
  v_checks := jsonb_set(
    v_checks,
    '{return_url_syntax_valid}',
    to_jsonb(p_return_url ILIKE 'https://%' AND public.partner_return_url_normalize_for_allowlist(p_return_url) IS NOT NULL)
  );

  v_checks := jsonb_set(v_checks, '{partner_row_exists}', 'true'::jsonb);
  v_checks := jsonb_set(v_checks, '{partner_is_external}', to_jsonb(v_partner.is_external IS TRUE));
  v_checks := jsonb_set(
    v_checks,
    '{partner_status_usable}',
    to_jsonb(v_partner.status IN ('pilot', 'active'))
  );
  v_checks := jsonb_set(
    v_checks,
    '{return_urls_configured}',
    to_jsonb(
      COALESCE(v_partner.allowed_return_urls, ARRAY[]::text[]) <> ARRAY[]::text[]
      AND NOT EXISTS (
        SELECT 1
        FROM pg_catalog.unnest(COALESCE(v_partner.allowed_return_urls, ARRAY[]::text[])) AS u(url)
        WHERE u.url LIKE '%abraxas-app.vercel.app%'
      )
    )
  );
  v_checks := jsonb_set(
    v_checks,
    '{return_url_request_allowlisted}',
    to_jsonb(public.partner_return_url_matches_allowlist(v_partner.allowed_return_urls, p_return_url))
  );

  v_all_checks_pass := true;
  IF COALESCE(v_partner.allowed_return_urls, ARRAY[]::text[]) = ARRAY[]::text[] THEN
    v_checks := jsonb_set(v_checks, '{all_stored_return_urls_compliant}', 'false'::jsonb);
    v_all_checks_pass := false;
  ELSE
    FOREACH v_url IN ARRAY v_partner.allowed_return_urls LOOP
      IF NOT public.partner_stored_return_url_production_compliant(v_url) THEN
        v_checks := jsonb_set(v_checks, '{all_stored_return_urls_compliant}', 'false'::jsonb);
        v_all_checks_pass := false;
        EXIT;
      END IF;
    END LOOP;
    IF v_all_checks_pass THEN
      v_checks := jsonb_set(v_checks, '{all_stored_return_urls_compliant}', 'true'::jsonb);
    END IF;
  END IF;

  -- Lock complete policy-version family (serializes with publish_partner_policy_draft).
  PERFORM 1
  FROM public.partner_policies
  WHERE id = p_policy_id
  FOR UPDATE;

  SELECT count(*) INTO v_active_policy_count
  FROM public.partner_policies
  WHERE id = p_policy_id
    AND status = 'active';

  v_checks := jsonb_set(
    v_checks,
    '{policy_row_exists}',
    to_jsonb(EXISTS (
      SELECT 1 FROM public.partner_policies WHERE id = p_policy_id
    ))
  );

  v_checks := jsonb_set(
    v_checks,
    '{policy_active}',
    to_jsonb(v_active_policy_count = 1)
  );

  IF v_active_policy_count = 1 THEN
    SELECT * INTO v_policy
    FROM public.partner_policies
    WHERE id = p_policy_id
      AND status = 'active';

    v_checks := jsonb_set(v_checks, '{policy_partner_match}', to_jsonb(v_policy.partner_id = p_partner_id));
    v_checks := jsonb_set(
      v_checks,
      '{policy_not_sandbox}',
      to_jsonb(
        NOT public.partner_is_sandbox_policy_id(p_policy_id)
        AND COALESCE((v_policy.rules_json->>'sandbox_only')::boolean, false) IS NOT TRUE
      )
    );
  ELSE
    v_checks := jsonb_set(v_checks, '{policy_partner_match}', 'false'::jsonb);
    v_checks := jsonb_set(v_checks, '{policy_not_sandbox}', 'false'::jsonb);
  END IF;

  v_checks := jsonb_set(
    v_checks,
    '{policy_assigned_match}',
    to_jsonb(v_partner.assigned_policy_id = p_policy_id)
  );
  v_checks := jsonb_set(
    v_checks,
    '{onboarding_fields_present}',
    to_jsonb(v_partner.is_external IS NOT NULL AND v_partner.onboarding_checklist IS NOT NULL)
  );

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_each_text(v_checks) AS entry(key, value)
    WHERE entry.value = 'false'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'readiness_failed', 'checks', v_checks);
  END IF;

  IF 'production' = ANY(COALESCE(v_partner.allowed_environments, ARRAY[]::text[])) THEN
    v_action := 'admin.partner.production_env.activate';
    v_metadata := jsonb_build_object(
      'admin_access_method', 'email',
      'previous_allowed_environments', COALESCE(v_partner.allowed_environments, ARRAY[]::text[]),
      'new_allowed_environments', COALESCE(v_partner.allowed_environments, ARRAY[]::text[]),
      'previous_status', v_partner.status,
      'new_status', v_partner.status,
      'already_production_enabled', true,
      'policy_id', p_policy_id,
      'operation', 'activate'
    );

    INSERT INTO public.audit_events (
      actor_type,
      actor_id,
      action,
      object_type,
      object_id,
      policy_id,
      policy_version,
      metadata,
      event_hash
    ) VALUES (
      'admin_operator',
      p_actor_category,
      v_action,
      'partner',
      p_partner_id,
      p_policy_id,
      NULL,
      v_metadata,
      NULL
    )
    RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
      'ok', true,
      'partner_id', p_partner_id,
      'allowed_environments', COALESCE(v_partner.allowed_environments, ARRAY[]::text[]),
      'status', v_partner.status,
      'already_production_enabled', true,
      'audit_event_id', v_audit_id
    );
  END IF;

  v_previous_envs := COALESCE(v_partner.allowed_environments, ARRAY[]::text[]);
  v_previous_status := v_partner.status;

  SELECT pg_catalog.array_agg(DISTINCT env ORDER BY env)
  INTO v_new_envs
  FROM (
    SELECT pg_catalog.unnest(v_previous_envs) AS env
    UNION ALL
    SELECT 'production'
  ) AS merged;

  UPDATE public.partners
  SET allowed_environments = COALESCE(v_new_envs, ARRAY['sandbox', 'production']::text[]),
      updated_at = v_now
  WHERE partner_id = p_partner_id
  RETURNING allowed_environments, status INTO v_partner.allowed_environments, v_partner.status;

  v_action := 'admin.partner.production_env.activate';
  v_metadata := jsonb_build_object(
    'admin_access_method', 'email',
    'previous_allowed_environments', v_previous_envs,
    'new_allowed_environments', COALESCE(v_new_envs, ARRAY['sandbox', 'production']::text[]),
    'previous_status', v_previous_status,
    'new_status', v_partner.status,
    'already_production_enabled', false,
    'policy_id', p_policy_id,
    'operation', 'activate'
  );

  INSERT INTO public.audit_events (
    actor_type,
    actor_id,
    action,
    object_type,
    object_id,
    policy_id,
    policy_version,
    metadata,
    event_hash
  ) VALUES (
    'admin_operator',
    p_actor_category,
    v_action,
    'partner',
    p_partner_id,
    p_policy_id,
    NULL,
    v_metadata,
    NULL
  )
  RETURNING id INTO v_audit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'partner_id', p_partner_id,
    'allowed_environments', COALESCE(v_new_envs, ARRAY['sandbox', 'production']::text[]),
    'status', v_partner.status,
    'already_production_enabled', false,
    'audit_event_id', v_audit_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.partner_return_url_normalize_for_allowlist(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_return_url_matches_allowlist_entry(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_return_url_matches_allowlist(text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_stored_return_url_production_compliant(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_is_sandbox_policy_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.partner_production_env_promote_atomic(text, text, text, text, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.partner_return_url_normalize_for_allowlist(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_return_url_matches_allowlist_entry(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_return_url_matches_allowlist(text[], text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_stored_return_url_production_compliant(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_is_sandbox_policy_id(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.partner_production_env_promote_atomic(text, text, text, text, text) FROM anon;

REVOKE EXECUTE ON FUNCTION public.partner_return_url_normalize_for_allowlist(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_return_url_matches_allowlist_entry(text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_return_url_matches_allowlist(text[], text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_stored_return_url_production_compliant(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_is_sandbox_policy_id(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_production_env_promote_atomic(text, text, text, text, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.partner_return_url_normalize_for_allowlist(text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.partner_return_url_matches_allowlist_entry(text, text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.partner_return_url_matches_allowlist(text[], text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.partner_stored_return_url_production_compliant(text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.partner_is_sandbox_policy_id(text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.partner_production_env_promote_atomic(text, text, text, text, text) TO postgres, service_role;
