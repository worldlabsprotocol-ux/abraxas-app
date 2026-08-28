-- FILE: supabase/migrations/074_design_partner_lifecycle_audit_list_v2.sql
-- Phase B1: cursor-paginated lifecycle audit list RPC (v2 envelope).
--
-- Adds design_partner_lifecycle_audit_list_v2 only. Preserves migration 072 v1 unchanged.
-- Does not grant new audit_events table privileges, mutate rows, or alter ownership/RLS/indexes/ACLs.
-- Does not modify migration 072 or 073 objects.
--
-- OPERATOR: apply manually after B1 review. Production application is a separate gate.

CREATE OR REPLACE FUNCTION public.design_partner_lifecycle_audit_list_v2(
  p_application_id uuid,
  p_limit integer DEFAULT 25,
  p_cursor_occurred_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_object_id text;
  v_events jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_row record;
  v_returned integer := 0;
  v_has_more boolean := false;
  v_last_created_at timestamptz;
  v_last_id uuid;
  v_promoted_partner_id text;
BEGIN
  IF p_application_id IS NULL THEN
    RETURN jsonb_build_object('events', '[]'::jsonb, 'next_cursor', NULL);
  END IF;

  IF (p_cursor_occurred_at IS NULL) <> (p_cursor_id IS NULL) THEN
    RETURN jsonb_build_object('events', '[]'::jsonb, 'next_cursor', NULL);
  END IF;

  v_object_id := lower(p_application_id::text);
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 25);

  FOR v_row IN
    WITH validated AS (
      SELECT
        ae.id,
        ae.action,
        ae.object_id,
        ae.actor_id,
        ae.created_at,
        ae.metadata ->> 'from_status' AS from_status,
        ae.metadata ->> 'to_status' AS to_status,
        ae.metadata ->> 'admin_access_method' AS access_method,
        ae.metadata ->> 'promoted_partner_id' AS promoted_partner_id_raw
      FROM public.audit_events AS ae
      WHERE ae.object_type = 'design_partner_application'
        AND ae.object_id = v_object_id
        AND ae.action IN (
          'admin.design_partner.approved',
          'admin.design_partner.rejected',
          'admin.design_partner.promoted'
        )
        AND (ae.metadata ->> 'from_status') IN ('submitted', 'approved', 'rejected', 'onboarded')
        AND (ae.metadata ->> 'to_status') IN ('submitted', 'approved', 'rejected', 'onboarded')
        AND (ae.metadata ->> 'admin_access_method') IN ('email', 'pin_header', 'pin_cookie', 'unknown')
        AND (
          ae.action <> 'admin.design_partner.promoted'
          OR (
            ae.metadata ->> 'promoted_partner_id' IS NOT NULL
            AND ae.metadata ->> 'promoted_partner_id' ~ '^[a-z0-9][a-z0-9_-]{0,127}$'
          )
        )
        AND (
          ae.actor_id IS NULL
          OR ae.actor_id IN ('admin_authorized_email', 'admin_pin', 'admin_unknown')
        )
    )
    SELECT
      v.id,
      v.action,
      v.object_id,
      v.actor_id,
      v.created_at,
      v.from_status,
      v.to_status,
      CASE
        WHEN v.action = 'admin.design_partner.promoted' THEN v.promoted_partner_id_raw
        ELSE NULL
      END AS promoted_partner_id
    FROM validated AS v
    WHERE (
      p_cursor_occurred_at IS NULL
      AND p_cursor_id IS NULL
    ) OR (
      (v.created_at, v.id) < (p_cursor_occurred_at, p_cursor_id)
    )
    ORDER BY v.created_at DESC, v.id DESC
    LIMIT v_limit + 1
  LOOP
    v_returned := v_returned + 1;
    IF v_returned > v_limit THEN
      v_has_more := true;
      EXIT;
    END IF;

    v_last_created_at := v_row.created_at;
    v_last_id := v_row.id;

    v_events := v_events || jsonb_build_array(
      jsonb_build_object(
        'event_type', v_row.action,
        'application_id', v_row.object_id,
        'from_status', v_row.from_status,
        'to_status', v_row.to_status,
        'promoted_partner_id', v_row.promoted_partner_id,
        'occurred_at', public._format_iso8601_utc_ms(v_row.created_at),
        'operator_category', v_row.actor_id
      )
    );
  END LOOP;

  IF v_has_more THEN
    v_next_cursor := jsonb_build_object(
      'occurred_at', public._format_iso8601_utc_ms(v_last_created_at),
      'id', v_last_id::text
    );
  END IF;

  RETURN jsonb_build_object(
    'events', v_events,
    'next_cursor', v_next_cursor
  );
END;
$$;

ALTER FUNCTION public.design_partner_lifecycle_audit_list_v2(
  uuid,
  integer,
  timestamptz,
  uuid
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.design_partner_lifecycle_audit_list_v2(
  uuid,
  integer,
  timestamptz,
  uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.design_partner_lifecycle_audit_list_v2(
  uuid,
  integer,
  timestamptz,
  uuid
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.design_partner_lifecycle_audit_list_v2(
  uuid,
  integer,
  timestamptz,
  uuid
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.design_partner_lifecycle_audit_list_v2(
  uuid,
  integer,
  timestamptz,
  uuid
) TO postgres, service_role;
