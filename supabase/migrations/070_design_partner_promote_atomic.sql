-- FILE: supabase/migrations/070_design_partner_promote_atomic.sql
-- Atomic sandbox-only design partner promotion (claim → partner INSERT → key INSERT → onboarded).
--
-- Prerequisite: 016_design_partners.sql, 024_partner_api_keys.sql, 032_reconcile_sandbox_and_cielo_operator_workflow.sql, 039_partner_onboarding.sql
-- OPERATOR: apply manually after merge. Do not apply during PR validation.

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

  -- Claim + partner/key inserts + onboarded status share one block so conflict
  -- signals roll back promoted_partner_id (no conflict RETURN after a surviving claim).
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
