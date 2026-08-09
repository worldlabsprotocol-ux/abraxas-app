-- 064_partner_webhook_alert_state.sql
-- Durable cooldown state for partner webhook operational email alerts (metadata only).
--
-- Prerequisite: 063_partner_webhook_operator_ops.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

CREATE TABLE IF NOT EXISTS public.partner_webhook_alert_state (
  alert_key         text        PRIMARY KEY,
  is_active         boolean     NOT NULL DEFAULT false,
  last_sent_at      timestamptz,
  last_recovery_at  timestamptz,
  cooldown_until    timestamptz,
  safe_metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  send_claim_id     uuid,
  send_claim_until  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_webhook_alert_state_key_check CHECK (
    alert_key IN (
      'dispatcher_execution_failure',
      'terminal_delivery_failure',
      'excessive_backlog',
      'dispatcher_stale',
      'signing_secret_failure'
    )
  )
);

CREATE INDEX IF NOT EXISTS partner_webhook_alert_state_active_idx
  ON public.partner_webhook_alert_state (is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS partner_webhook_alert_state_cooldown_idx
  ON public.partner_webhook_alert_state (cooldown_until)
  WHERE cooldown_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_webhook_alert_state_claim_idx
  ON public.partner_webhook_alert_state (send_claim_until)
  WHERE send_claim_until IS NOT NULL;

ALTER TABLE public.partner_webhook_alert_state ENABLE ROW LEVEL SECURITY;

-- Atomic claim for alert/recovery email delivery. Service-role only.
CREATE OR REPLACE FUNCTION public.claim_partner_webhook_alert_delivery(
  p_alert_key text,
  p_kind text,
  p_now timestamptz DEFAULT now(),
  p_claim_ttl_seconds integer DEFAULT 120,
  p_cooldown_seconds integer DEFAULT 3600
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.partner_webhook_alert_state%ROWTYPE;
  v_claim_id uuid := gen_random_uuid();
  v_claim_until timestamptz := p_now + make_interval(secs => p_claim_ttl_seconds);
BEGIN
  IF p_kind NOT IN ('alert', 'recovery') THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'invalid_kind');
  END IF;

  INSERT INTO public.partner_webhook_alert_state (alert_key)
  VALUES (p_alert_key)
  ON CONFLICT (alert_key) DO NOTHING;

  SELECT * INTO v_row
  FROM public.partner_webhook_alert_state
  WHERE alert_key = p_alert_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_found');
  END IF;

  IF v_row.send_claim_until IS NOT NULL AND v_row.send_claim_until > p_now THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'in_flight');
  END IF;

  IF p_kind = 'alert' THEN
    IF v_row.is_active
       AND v_row.cooldown_until IS NOT NULL
       AND v_row.cooldown_until > p_now THEN
      RETURN jsonb_build_object('claimed', false, 'reason', 'cooldown');
    END IF;
  ELSE
    IF NOT v_row.is_active THEN
      RETURN jsonb_build_object('claimed', false, 'reason', 'not_active');
    END IF;
  END IF;

  UPDATE public.partner_webhook_alert_state
  SET
    send_claim_id = v_claim_id,
    send_claim_until = v_claim_until,
    updated_at = p_now
  WHERE alert_key = p_alert_key;

  RETURN jsonb_build_object(
    'claimed', true,
    'claim_id', v_claim_id,
    'kind', p_kind,
    'was_active', v_row.is_active,
    'last_sent_at', v_row.last_sent_at,
    'last_recovery_at', v_row.last_recovery_at
  );
END;
$$;

-- Finalize or release a claimed alert delivery attempt. Service-role only.
CREATE OR REPLACE FUNCTION public.finalize_partner_webhook_alert_delivery(
  p_alert_key text,
  p_claim_id uuid,
  p_kind text,
  p_success boolean,
  p_safe_metadata jsonb DEFAULT '{}'::jsonb,
  p_now timestamptz DEFAULT now(),
  p_cooldown_seconds integer DEFAULT 3600
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.partner_webhook_alert_state%ROWTYPE;
  v_cooldown_until timestamptz := p_now + make_interval(secs => p_cooldown_seconds);
BEGIN
  SELECT * INTO v_row
  FROM public.partner_webhook_alert_state
  WHERE alert_key = p_alert_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('finalized', false, 'reason', 'not_found');
  END IF;

  IF v_row.send_claim_id IS DISTINCT FROM p_claim_id THEN
    RETURN jsonb_build_object('finalized', false, 'reason', 'claim_mismatch');
  END IF;

  IF NOT p_success THEN
    UPDATE public.partner_webhook_alert_state
    SET
      send_claim_id = NULL,
      send_claim_until = NULL,
      updated_at = p_now
    WHERE alert_key = p_alert_key;

    RETURN jsonb_build_object('finalized', true, 'released', true);
  END IF;

  IF p_kind = 'alert' THEN
    UPDATE public.partner_webhook_alert_state
    SET
      is_active = true,
      last_sent_at = p_now,
      cooldown_until = v_cooldown_until,
      safe_metadata = COALESCE(p_safe_metadata, '{}'::jsonb),
      send_claim_id = NULL,
      send_claim_until = NULL,
      updated_at = p_now
    WHERE alert_key = p_alert_key;
  ELSIF p_kind = 'recovery' THEN
    UPDATE public.partner_webhook_alert_state
    SET
      is_active = false,
      last_recovery_at = p_now,
      cooldown_until = NULL,
      safe_metadata = COALESCE(p_safe_metadata, '{}'::jsonb),
      send_claim_id = NULL,
      send_claim_until = NULL,
      updated_at = p_now
    WHERE alert_key = p_alert_key;
  ELSE
    RETURN jsonb_build_object('finalized', false, 'reason', 'invalid_kind');
  END IF;

  RETURN jsonb_build_object('finalized', true, 'released', false);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_partner_webhook_alert_delivery(text, text, timestamptz, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_partner_webhook_alert_delivery(text, uuid, text, boolean, jsonb, timestamptz, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_partner_webhook_alert_delivery(text, text, timestamptz, integer, integer)
  TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_partner_webhook_alert_delivery(text, uuid, text, boolean, jsonb, timestamptz, integer)
  TO postgres, service_role;
