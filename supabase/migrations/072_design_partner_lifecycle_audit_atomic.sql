-- FILE: supabase/migrations/072_design_partner_lifecycle_audit_atomic.sql
-- Design-partner lifecycle audit trail (atomic promote/transition + bounded list RPC).
--
-- Prerequisite: 016_design_partners.sql, 024_partner_api_keys.sql, 032_reconcile_sandbox_and_cielo_operator_workflow.sql,
--               039_partner_onboarding.sql, 018_policy_verification.sql (audit_events; pgcrypto in extensions on Supabase)
-- OPERATOR: apply manually after merge. Do not apply during PR validation.

-- ── Pure helpers (SECURITY INVOKER; not granted to application roles) ─────────

CREATE OR REPLACE FUNCTION public._format_iso8601_utc_ms(p_ts timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT to_char(p_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS')
         || '.'
         || lpad(
              mod(
                floor(extract(epoch FROM (p_ts AT TIME ZONE 'UTC')) * 1000)::bigint,
                1000
              )::text,
              3,
              '0'
            )
         || 'Z';
$$;

CREATE OR REPLACE FUNCTION public._lifecycle_audit_access_method(p_actor_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_actor_category = 'admin_authorized_email' THEN 'email'
    WHEN p_actor_category = 'admin_pin' THEN 'pin_header'
    WHEN p_actor_category = 'admin_unknown' THEN 'unknown'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._serialize_lifecycle_audit_hash_payload(
  p_actor_category text,
  p_action text,
  p_application_id text,
  p_from_status text,
  p_to_status text,
  p_admin_access_method text,
  p_promoted_partner_id text,
  p_include_promoted_partner_id boolean,
  p_ts text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_metadata text;
BEGIN
  IF p_actor_category IS NULL
     OR p_actor_category NOT IN ('admin_authorized_email', 'admin_pin', 'admin_unknown') THEN
    RAISE EXCEPTION 'invalid_lifecycle_actor_category';
  END IF;

  IF p_action IS NULL
     OR p_action NOT IN (
       'admin.design_partner.approved',
       'admin.design_partner.rejected',
       'admin.design_partner.promoted'
     ) THEN
    RAISE EXCEPTION 'invalid_lifecycle_action';
  END IF;

  IF p_application_id IS NULL
     OR p_application_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'invalid_lifecycle_application_id';
  END IF;

  IF p_from_status IS NULL
     OR p_from_status NOT IN ('submitted', 'approved', 'rejected', 'onboarded') THEN
    RAISE EXCEPTION 'invalid_lifecycle_from_status';
  END IF;

  IF p_to_status IS NULL
     OR p_to_status NOT IN ('submitted', 'approved', 'rejected', 'onboarded') THEN
    RAISE EXCEPTION 'invalid_lifecycle_to_status';
  END IF;

  IF p_admin_access_method IS NULL
     OR p_admin_access_method NOT IN ('email', 'pin_header', 'pin_cookie', 'unknown') THEN
    RAISE EXCEPTION 'invalid_lifecycle_admin_access_method';
  END IF;

  IF p_ts IS NULL
     OR p_ts !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' THEN
    RAISE EXCEPTION 'invalid_lifecycle_ts';
  END IF;

  v_metadata := '{"from_status":"' || p_from_status
    || '","to_status":"' || p_to_status
    || '","admin_access_method":"' || p_admin_access_method || '"';

  IF p_include_promoted_partner_id THEN
    IF p_promoted_partner_id IS NULL
       OR p_promoted_partner_id !~ '^[a-z0-9][a-z0-9_-]{0,127}$' THEN
      RAISE EXCEPTION 'invalid_lifecycle_promoted_partner_id';
    END IF;
    v_metadata := v_metadata || ',"promoted_partner_id":"' || p_promoted_partner_id || '"';
  END IF;

  v_metadata := v_metadata || '}';

  RETURN '{'
    || '"actor_type":"admin_operator",'
    || '"actor_id":"' || p_actor_category || '",'
    || '"action":"' || p_action || '",'
    || '"object_type":"design_partner_application",'
    || '"object_id":"' || p_application_id || '",'
    || '"policy_id":null,'
    || '"policy_version":null,'
    || '"metadata":' || v_metadata || ','
    || '"ts":"' || p_ts || '"'
    || '}';
END;
$$;

CREATE OR REPLACE FUNCTION public._compute_lifecycle_audit_event_hash(
  p_actor_category text,
  p_action text,
  p_application_id text,
  p_from_status text,
  p_to_status text,
  p_admin_access_method text,
  p_promoted_partner_id text,
  p_include_promoted_partner_id boolean,
  p_ts text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT encode(
    extensions.digest(
      convert_to(
        public._serialize_lifecycle_audit_hash_payload(
          p_actor_category,
          p_action,
          p_application_id,
          p_from_status,
          p_to_status,
          p_admin_access_method,
          p_promoted_partner_id,
          p_include_promoted_partner_id,
          p_ts
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

-- ── Audit insert (SECURITY INVOKER; internal only; called from entry RPCs) ────

CREATE OR REPLACE FUNCTION public._insert_lifecycle_audit_event(
  p_actor_category text,
  p_action text,
  p_application_id uuid,
  p_from_status text,
  p_to_status text,
  p_promoted_partner_id text,
  p_include_promoted_partner_id boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_ts text;
  v_hash text;
  v_access_method text;
  v_metadata jsonb;
  v_event_id uuid;
BEGIN
  v_access_method := public._lifecycle_audit_access_method(p_actor_category);
  IF v_access_method IS NULL THEN
    RAISE EXCEPTION 'invalid_lifecycle_actor_category';
  END IF;

  v_ts := public._format_iso8601_utc_ms(v_now);

  v_hash := public._compute_lifecycle_audit_event_hash(
    p_actor_category,
    p_action,
    lower(p_application_id::text),
    p_from_status,
    p_to_status,
    v_access_method,
    p_promoted_partner_id,
    p_include_promoted_partner_id,
    v_ts
  );

  IF p_include_promoted_partner_id THEN
    v_metadata := jsonb_build_object(
      'from_status', p_from_status,
      'to_status', p_to_status,
      'admin_access_method', v_access_method,
      'promoted_partner_id', p_promoted_partner_id
    );
  ELSE
    v_metadata := jsonb_build_object(
      'from_status', p_from_status,
      'to_status', p_to_status,
      'admin_access_method', v_access_method
    );
  END IF;

  INSERT INTO public.audit_events (
    actor_type,
    actor_id,
    action,
    object_type,
    object_id,
    policy_id,
    policy_version,
    metadata,
    event_hash,
    created_at
  ) VALUES (
    'admin_operator',
    p_actor_category,
    p_action,
    'design_partner_application',
    lower(p_application_id::text),
    NULL,
    NULL,
    v_metadata,
    v_hash,
    v_now
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- ── Promotion implementation (single audit insert on first success) ─────────────

CREATE OR REPLACE FUNCTION public._design_partner_promote_impl(
  p_application_id uuid,
  p_partner_id text,
  p_key_prefix text,
  p_key_hash text,
  p_actor_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_app public.design_partners%ROWTYPE;
  v_now timestamptz := pg_catalog.now();
  v_display_name text;
  v_onboarding_notes text;
  v_id_pattern constant text := '^[a-z0-9][a-z0-9_-]*$';
  v_from_status text;
BEGIN
  IF p_actor_category IS NULL
     OR p_actor_category NOT IN ('admin_authorized_email', 'admin_pin', 'admin_unknown') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_application_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_partner_id IS NULL
     OR btrim(p_partner_id) = ''
     OR length(p_partner_id) > 128
     OR p_partner_id !~ v_id_pattern THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_key_prefix IS NULL
     OR length(p_key_prefix) <> 16
     OR p_key_prefix !~ '^abx_test_[A-Za-z0-9_-]{7}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_key_hash IS NULL
     OR p_key_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  SELECT *
    INTO v_app
    FROM public.design_partners
   WHERE id = p_application_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_not_found');
  END IF;

  IF v_app.promoted_partner_id IS NOT NULL OR v_app.status = 'onboarded' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_already_promoted');
  END IF;

  IF v_app.status = 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_rejected');
  END IF;

  IF v_app.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_not_promotable');
  END IF;

  v_from_status := v_app.status;
  v_display_name := v_app.company || ' · sandbox';
  v_onboarding_notes := 'Promoted from design partner application ' || v_app.id::text;

  BEGIN
    UPDATE public.design_partners
       SET promoted_partner_id = p_partner_id,
           reviewed_at = v_now
     WHERE id = p_application_id;

    BEGIN
      INSERT INTO public.partners (
        partner_id,
        company,
        contact_name,
        contact_email,
        use_case,
        status,
        allowed_environments,
        is_external,
        public_listing_ok,
        onboarding_notes,
        updated_at
      ) VALUES (
        p_partner_id,
        v_app.company,
        v_app.contact_name,
        v_app.email,
        v_app.use_case,
        'pilot',
        ARRAY['sandbox']::text[],
        true,
        COALESCE(v_app.public_name_ok, false),
        v_onboarding_notes,
        v_now
      );
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'partner_id_conflict' USING ERRCODE = 'P0001';
    END;

    BEGIN
      INSERT INTO public.partner_api_keys (
        partner_id,
        display_name,
        key_prefix,
        key_hash,
        scopes
      ) VALUES (
        p_partner_id,
        v_display_name,
        p_key_prefix,
        p_key_hash,
        ARRAY['verify:credential', 'verify:registry']::text[]
      );
    EXCEPTION
      WHEN unique_violation THEN
        RAISE EXCEPTION 'key_insert_failed' USING ERRCODE = 'P0001';
    END;

    UPDATE public.design_partners
       SET status = 'onboarded',
           reviewed_at = v_now
     WHERE id = p_application_id;

    PERFORM public._insert_lifecycle_audit_event(
      p_actor_category,
      'admin.design_partner.promoted',
      p_application_id,
      v_from_status,
      'onboarded',
      p_partner_id,
      true
    );
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'ok',
    'application_id', v_app.id,
    'partner_id', p_partner_id,
    'key_prefix', p_key_prefix
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.design_partner_promote_atomic(
  p_application_id uuid,
  p_partner_id text,
  p_key_prefix text,
  p_key_hash text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public._design_partner_promote_impl(
    p_application_id,
    p_partner_id,
    p_key_prefix,
    p_key_hash,
    'admin_unknown'
  );
$$;

CREATE OR REPLACE FUNCTION public.design_partner_promote_atomic_v2(
  p_application_id uuid,
  p_partner_id text,
  p_key_prefix text,
  p_key_hash text,
  p_actor_category text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public._design_partner_promote_impl(
    p_application_id,
    p_partner_id,
    p_key_prefix,
    p_key_hash,
    p_actor_category
  );
$$;

-- ── Review transition RPC ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.design_partner_review_transition_atomic(
  p_application_id uuid,
  p_target_status text,
  p_actor_category text,
  p_reviewer_notes text,
  p_reviewer_notes_present boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_app public.design_partners%ROWTYPE;
  v_now timestamptz := pg_catalog.now();
  v_notes text;
  v_from_status text;
  v_action text;
  v_audit_id uuid;
BEGIN
  IF p_application_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_target_status IS NULL OR p_target_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;

  IF p_actor_category IS NULL
     OR p_actor_category NOT IN ('admin_authorized_email', 'admin_pin', 'admin_unknown') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_actor_category');
  END IF;

  IF p_reviewer_notes_present THEN
    IF p_reviewer_notes IS NULL OR btrim(p_reviewer_notes) = '' THEN
      v_notes := NULL;
    ELSE
      v_notes := btrim(p_reviewer_notes);
    END IF;
  END IF;

  SELECT *
    INTO v_app
    FROM public.design_partners
   WHERE id = p_application_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_not_found');
  END IF;

  IF v_app.promoted_partner_id IS NOT NULL OR v_app.status = 'onboarded' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'application_already_promoted');
  END IF;

  IF v_app.status = p_target_status THEN
    IF NOT p_reviewer_notes_present THEN
      RETURN jsonb_build_object(
        'ok', true,
        'code', 'no_op',
        'application', jsonb_build_object(
          'id', v_app.id,
          'status', v_app.status,
          'promoted_partner_id', v_app.promoted_partner_id,
          'reviewer_notes', v_app.reviewer_notes
        )
      );
    END IF;

    UPDATE public.design_partners
       SET reviewer_notes = v_notes
     WHERE id = p_application_id
     RETURNING * INTO v_app;

    RETURN jsonb_build_object(
      'ok', true,
      'code', 'notes_only',
      'application', jsonb_build_object(
        'id', v_app.id,
        'status', v_app.status,
        'promoted_partner_id', v_app.promoted_partner_id,
        'reviewer_notes', v_app.reviewer_notes
      )
    );
  END IF;

  IF v_app.status = 'rejected' AND p_target_status = 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'status_conflict');
  END IF;

  IF p_target_status = 'approved' AND v_app.status <> 'submitted' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'status_conflict');
  END IF;

  IF p_target_status = 'rejected' AND v_app.status NOT IN ('submitted', 'approved') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'status_conflict');
  END IF;

  v_from_status := v_app.status;
  v_action := CASE
    WHEN p_target_status = 'approved' THEN 'admin.design_partner.approved'
    ELSE 'admin.design_partner.rejected'
  END;

  IF p_reviewer_notes_present THEN
    UPDATE public.design_partners
       SET status = p_target_status,
           reviewed_at = v_now,
           reviewer_notes = v_notes
     WHERE id = p_application_id
     RETURNING * INTO v_app;
  ELSE
    UPDATE public.design_partners
       SET status = p_target_status,
           reviewed_at = v_now
     WHERE id = p_application_id
     RETURNING * INTO v_app;
  END IF;

  v_audit_id := public._insert_lifecycle_audit_event(
    p_actor_category,
    v_action,
    p_application_id,
    v_from_status,
    p_target_status,
    NULL,
    false
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'ok',
    'application', jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'promoted_partner_id', v_app.promoted_partner_id,
      'reviewer_notes', v_app.reviewer_notes
    ),
    'audit_event_id', v_audit_id
  );
END;
$$;

-- ── Bounded lifecycle history (fixed DTO; no raw metadata) ───────────────────

CREATE OR REPLACE FUNCTION public.design_partner_lifecycle_audit_list(
  p_application_id uuid,
  p_limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_object_id text;
  v_rows jsonb := '[]'::jsonb;
  v_row record;
  v_from_status text;
  v_to_status text;
  v_access_method text;
  v_promoted_partner_id text;
BEGIN
  IF p_application_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_object_id := lower(p_application_id::text);
  IF v_object_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN '[]'::jsonb;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 50);

  FOR v_row IN
    SELECT
      ae.action,
      ae.object_id,
      ae.actor_id,
      ae.created_at,
      ae.metadata
    FROM public.audit_events ae
    WHERE ae.object_type = 'design_partner_application'
      AND ae.object_id = v_object_id
      AND ae.action IN (
        'admin.design_partner.approved',
        'admin.design_partner.rejected',
        'admin.design_partner.promoted'
      )
    ORDER BY ae.created_at DESC
    LIMIT v_limit
  LOOP
    v_from_status := v_row.metadata ->> 'from_status';
    v_to_status := v_row.metadata ->> 'to_status';
    v_access_method := v_row.metadata ->> 'admin_access_method';
    v_promoted_partner_id := v_row.metadata ->> 'promoted_partner_id';

    IF v_from_status IS NULL
       OR v_from_status NOT IN ('submitted', 'approved', 'rejected', 'onboarded')
       OR v_to_status IS NULL
       OR v_to_status NOT IN ('submitted', 'approved', 'rejected', 'onboarded')
       OR v_access_method IS NULL
       OR v_access_method NOT IN ('email', 'pin_header', 'pin_cookie', 'unknown') THEN
      CONTINUE;
    END IF;

    IF v_row.action = 'admin.design_partner.promoted' THEN
      IF v_promoted_partner_id IS NULL
         OR v_promoted_partner_id !~ '^[a-z0-9][a-z0-9_-]{0,127}$' THEN
        CONTINUE;
      END IF;
    ELSE
      v_promoted_partner_id := NULL;
    END IF;

    IF v_row.actor_id IS NOT NULL
       AND v_row.actor_id NOT IN ('admin_authorized_email', 'admin_pin', 'admin_unknown') THEN
      CONTINUE;
    END IF;

    v_rows := v_rows || jsonb_build_array(
      jsonb_build_object(
        'event_type', v_row.action,
        'application_id', v_row.object_id,
        'from_status', v_from_status,
        'to_status', v_to_status,
        'promoted_partner_id', v_promoted_partner_id,
        'occurred_at', public._format_iso8601_utc_ms(v_row.created_at),
        'operator_category', v_row.actor_id
      )
    );
  END LOOP;

  RETURN v_rows;
END;
$$;

-- ── Privileges ────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public._format_iso8601_utc_ms(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._lifecycle_audit_access_method(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._serialize_lifecycle_audit_hash_payload(text, text, text, text, text, text, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._compute_lifecycle_audit_event_hash(text, text, text, text, text, text, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._insert_lifecycle_audit_event(text, text, uuid, text, text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._design_partner_promote_impl(uuid, text, text, text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public._format_iso8601_utc_ms(timestamptz) FROM service_role, anon, authenticated;
REVOKE ALL ON FUNCTION public._lifecycle_audit_access_method(text) FROM service_role, anon, authenticated;
REVOKE ALL ON FUNCTION public._serialize_lifecycle_audit_hash_payload(text, text, text, text, text, text, text, boolean, text) FROM service_role, anon, authenticated;
REVOKE ALL ON FUNCTION public._compute_lifecycle_audit_event_hash(text, text, text, text, text, text, text, boolean, text) FROM service_role, anon, authenticated;
REVOKE ALL ON FUNCTION public._insert_lifecycle_audit_event(text, text, uuid, text, text, text, boolean) FROM service_role, anon, authenticated;
REVOKE ALL ON FUNCTION public._design_partner_promote_impl(uuid, text, text, text, text) FROM service_role, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'parity_unprivileged') THEN
    REVOKE ALL ON FUNCTION public._format_iso8601_utc_ms(timestamptz) FROM parity_unprivileged;
    REVOKE ALL ON FUNCTION public._lifecycle_audit_access_method(text) FROM parity_unprivileged;
    REVOKE ALL ON FUNCTION public._serialize_lifecycle_audit_hash_payload(text, text, text, text, text, text, text, boolean, text) FROM parity_unprivileged;
    REVOKE ALL ON FUNCTION public._compute_lifecycle_audit_event_hash(text, text, text, text, text, text, text, boolean, text) FROM parity_unprivileged;
    REVOKE ALL ON FUNCTION public._insert_lifecycle_audit_event(text, text, uuid, text, text, text, boolean) FROM parity_unprivileged;
    REVOKE ALL ON FUNCTION public._design_partner_promote_impl(uuid, text, text, text, text) FROM parity_unprivileged;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) FROM authenticated;

REVOKE ALL ON FUNCTION public.design_partner_promote_atomic_v2(uuid, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.design_partner_promote_atomic_v2(uuid, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.design_partner_promote_atomic_v2(uuid, text, text, text, text) FROM authenticated;

REVOKE ALL ON FUNCTION public.design_partner_review_transition_atomic(uuid, text, text, text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.design_partner_review_transition_atomic(uuid, text, text, text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.design_partner_review_transition_atomic(uuid, text, text, text, boolean) FROM authenticated;

REVOKE ALL ON FUNCTION public.design_partner_lifecycle_audit_list(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.design_partner_lifecycle_audit_list(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.design_partner_lifecycle_audit_list(uuid, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.design_partner_promote_atomic_v2(uuid, text, text, text, text) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.design_partner_review_transition_atomic(uuid, text, text, text, boolean) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.design_partner_lifecycle_audit_list(uuid, integer) TO postgres, service_role;
