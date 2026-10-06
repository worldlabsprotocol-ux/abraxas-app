-- FILE: supabase/migrations/133_partner_flow_continuation_atomic_rpc_disambiguation.sql
-- Fix deterministic PostgreSQL 42702 in ensure_partner_flow_continuation_by_opaque (#566).
-- Migration 132 RETURNS TABLE output variable opaque_verify_request collides with the
-- partial unique-index ON CONFLICT inference expression inside PL/pgSQL.
-- Idempotent. Safe on DEMO and Production.

CREATE OR REPLACE FUNCTION public.ensure_partner_flow_continuation_by_opaque(
  p_opaque text,
  p_jti text,
  p_partner_id text,
  p_policy_id text,
  p_policy_version integer,
  p_return_url text,
  p_expires_at timestamptz,
  p_created_at timestamptz,
  p_permission text DEFAULT NULL,
  p_permission_version text DEFAULT NULL,
  p_purpose text DEFAULT NULL,
  p_app_slug text DEFAULT NULL
)
RETURNS TABLE (
  was_created boolean,
  jti text,
  partner_id text,
  policy_id text,
  policy_version integer,
  return_url text,
  permission text,
  permission_version text,
  purpose text,
  app_slug text,
  verify_request_id uuid,
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  opaque_verify_request text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  v_opaque text := pg_catalog.btrim(p_opaque);
  v_row public.partner_flow_continuations%ROWTYPE;
  v_attempt integer := 0;
  v_max_attempts constant integer := 2;
BEGIN
  IF v_opaque IS NULL OR v_opaque = '' THEN
    RETURN;
  END IF;

  WHILE v_attempt < v_max_attempts LOOP
    v_attempt := v_attempt + 1;

    INSERT INTO public.partner_flow_continuations (
      jti,
      partner_id,
      policy_id,
      policy_version,
      return_url,
      permission,
      permission_version,
      purpose,
      app_slug,
      verify_request_id,
      opaque_verify_request,
      consumed_at,
      expires_at,
      created_at
    )
    VALUES (
      p_jti,
      p_partner_id,
      p_policy_id,
      p_policy_version,
      p_return_url,
      p_permission,
      p_permission_version,
      p_purpose,
      p_app_slug,
      NULL,
      v_opaque,
      NULL,
      p_expires_at,
      p_created_at
    )
    ON CONFLICT (opaque_verify_request) WHERE opaque_verify_request IS NOT NULL
    DO NOTHING
    RETURNING * INTO v_row;

    IF FOUND THEN
      RETURN QUERY
      SELECT
        true,
        v_row.jti,
        v_row.partner_id,
        v_row.policy_id,
        v_row.policy_version,
        v_row.return_url,
        v_row.permission,
        v_row.permission_version,
        v_row.purpose,
        v_row.app_slug,
        v_row.verify_request_id,
        v_row.consumed_at,
        v_row.expires_at,
        v_row.created_at,
        v_row.opaque_verify_request;
      RETURN;
    END IF;

    SELECT * INTO v_row
      FROM public.partner_flow_continuations c
     WHERE c.opaque_verify_request = v_opaque
     LIMIT 1;

    IF FOUND THEN
      RETURN QUERY
      SELECT
        false,
        v_row.jti,
        v_row.partner_id,
        v_row.policy_id,
        v_row.policy_version,
        v_row.return_url,
        v_row.permission,
        v_row.permission_version,
        v_row.purpose,
        v_row.app_slug,
        v_row.verify_request_id,
        v_row.consumed_at,
        v_row.expires_at,
        v_row.created_at,
        v_row.opaque_verify_request;
      RETURN;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_partner_flow_continuation_by_opaque(
  text, text, text, text, integer, text, timestamptz, timestamptz, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_partner_flow_continuation_by_opaque(
  text, text, text, text, integer, text, timestamptz, timestamptz, text, text, text, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
