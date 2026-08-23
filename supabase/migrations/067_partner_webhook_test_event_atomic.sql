-- 067_partner_webhook_test_event_atomic.sql
-- Atomic sandbox webhook test delivery enqueue with transaction-scoped advisory lock.
--
-- Prerequisite: 062_partner_webhook_outbox.sql, 063_partner_webhook_operator_ops.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

ALTER TABLE public.partner_webhook_outbox
  DROP CONSTRAINT IF EXISTS partner_webhook_outbox_event_type_check;

ALTER TABLE public.partner_webhook_outbox
  ADD CONSTRAINT partner_webhook_outbox_event_type_check
  CHECK (event_type IN (
    'partner.receipt.issued',
    'partner.receipt.revoked',
    'partner.access.revoked',
    'partner.credential.revoked',
    'partner.webhook.test'
  ));

CREATE OR REPLACE FUNCTION public.enqueue_partner_webhook_test_delivery(
  p_partner_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_partner_id text;
  v_enabled boolean;
  v_event_id text;
  v_occurred_at timestamptz;
  v_idempotency_key text;
  v_payload jsonb;
  v_recent_count integer;
  v_oldest_recent timestamptz;
  v_retry_after_sec integer;
BEGIN
  v_partner_id := pg_catalog.btrim(p_partner_id);

  IF v_partner_id IS NULL OR v_partner_id = '' THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'partner_id_required');
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_partner_id, 0),
    pg_catalog.hashtextextended('partner.webhook.test', 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.partners AS p
    WHERE p.partner_id = v_partner_id
  ) THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'partner_not_found');
  END IF;

  SELECT c.enabled
  INTO v_enabled
  FROM public.partner_webhook_configs AS c
  WHERE c.partner_id = v_partner_id;

  IF v_enabled IS DISTINCT FROM true THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'webhook_disabled');
  END IF;

  SELECT pg_catalog.count(*)::integer
  INTO v_recent_count
  FROM public.partner_webhook_outbox AS o
  WHERE o.partner_id = v_partner_id
    AND o.event_type = 'partner.webhook.test'
    AND o.created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => 60);

  IF v_recent_count > 0 THEN
    SELECT pg_catalog.min(o.created_at)
    INTO v_oldest_recent
    FROM public.partner_webhook_outbox AS o
    WHERE o.partner_id = v_partner_id
      AND o.event_type = 'partner.webhook.test'
      AND o.created_at >= pg_catalog.now() - pg_catalog.make_interval(secs => 60);

    v_retry_after_sec := pg_catalog.greatest(
      1,
      pg_catalog.ceil(
        EXTRACT(EPOCH FROM (v_oldest_recent + pg_catalog.make_interval(secs => 60) - pg_catalog.now()))
      )::integer
    );

    RETURN pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'rate_limited',
      'retry_after_sec', v_retry_after_sec
    );
  END IF;

  v_event_id := pg_catalog.gen_random_uuid()::text;
  v_occurred_at := pg_catalog.now();
  v_idempotency_key := pg_catalog.concat(
    'webhook:',
    v_partner_id,
    ':partner.webhook.test:',
    v_event_id
  );

  v_payload := pg_catalog.jsonb_build_object(
    'event_id', v_event_id,
    'event_type', 'partner.webhook.test',
    'occurred_at', pg_catalog.to_char(v_occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'partner_id', v_partner_id,
    'test', true
  );

  INSERT INTO public.partner_webhook_outbox (
    partner_id,
    event_type,
    event_id,
    idempotency_key,
    payload,
    occurred_at,
    status,
    next_attempt_at
  ) VALUES (
    v_partner_id,
    'partner.webhook.test',
    v_event_id,
    v_idempotency_key,
    v_payload,
    v_occurred_at,
    'pending',
    v_occurred_at
  );

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'queued', true,
    'event_id', v_event_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'code', 'enqueue_failed');
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text)
  TO postgres, service_role;
