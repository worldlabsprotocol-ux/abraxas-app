-- FILE: supabase/rollbacks/072_design_partner_lifecycle_audit_atomic_rollback.sql
-- Restores migration-070 promote RPC and drops 072-only lifecycle audit functions.
-- Does NOT delete audit_events rows written while 072 was active.
-- OPERATOR: apply manually. Review before running in any environment.

DROP FUNCTION IF EXISTS public.design_partner_lifecycle_audit_list(uuid, integer);
DROP FUNCTION IF EXISTS public.design_partner_review_transition_atomic(uuid, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.design_partner_promote_atomic_v2(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.design_partner_promote_atomic(uuid, text, text, text);
DROP FUNCTION IF EXISTS public._design_partner_promote_impl(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public._insert_lifecycle_audit_event(text, text, uuid, text, text, text, boolean);
DROP FUNCTION IF EXISTS public._compute_lifecycle_audit_event_hash(text, text, text, text, text, text, text, boolean, text);
DROP FUNCTION IF EXISTS public._serialize_lifecycle_audit_hash_payload(text, text, text, text, text, text, text, boolean, text);
DROP FUNCTION IF EXISTS public._lifecycle_audit_access_method(text);
DROP FUNCTION IF EXISTS public._format_iso8601_utc_ms(timestamptz);

-- Exact migration-070 body and grants restored below.

CREATE OR REPLACE FUNCTION public.design_partner_promote_atomic(
  p_application_id uuid,
  p_partner_id text,
  p_key_prefix text,
  p_key_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_app public.design_partners%ROWTYPE;
  v_now timestamptz := pg_catalog.now();
  v_display_name text;
  v_onboarding_notes text;
  v_id_pattern constant text := '^[a-z0-9][a-z0-9_-]*$';
BEGIN
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

REVOKE ALL ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.design_partner_promote_atomic(uuid, text, text, text) TO postgres, service_role;
