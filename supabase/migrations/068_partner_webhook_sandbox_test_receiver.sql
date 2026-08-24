-- 068_partner_webhook_sandbox_test_receiver.sql
-- Verified-only inbound receipts for sandbox partner.webhook.test events.
--
-- Prerequisite: 062_partner_webhook_outbox.sql, 067_partner_webhook_test_event_atomic.sql
-- OPERATOR: apply manually in Supabase SQL editor when ready.
-- No production apply from this PR.

CREATE TABLE IF NOT EXISTS public.partner_webhook_sandbox_test_receipts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     text        NOT NULL UNIQUE,
  partner_id   text        NOT NULL REFERENCES public.partners(partner_id),
  event_type   text        NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_webhook_sandbox_test_receipts_event_type_check
    CHECK (event_type = 'partner.webhook.test')
);

CREATE INDEX IF NOT EXISTS partner_webhook_sandbox_test_receipts_partner_received_idx
  ON public.partner_webhook_sandbox_test_receipts (partner_id, received_at DESC);

ALTER TABLE public.partner_webhook_sandbox_test_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.partner_webhook_sandbox_test_receipts FROM PUBLIC;
REVOKE ALL ON TABLE public.partner_webhook_sandbox_test_receipts FROM anon;
REVOKE ALL ON TABLE public.partner_webhook_sandbox_test_receipts FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.partner_webhook_sandbox_test_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.insert_partner_webhook_sandbox_test_receipt(
  p_event_id text,
  p_partner_id text
)
RETURNS TABLE (partner_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_event_id IS NULL
     OR pg_catalog.btrim(p_event_id) = ''
     OR p_partner_id IS NULL
     OR pg_catalog.btrim(p_partner_id) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
    INSERT INTO public.partner_webhook_sandbox_test_receipts (event_id, partner_id, event_type)
    VALUES (
      pg_catalog.btrim(p_event_id),
      pg_catalog.btrim(p_partner_id),
      'partner.webhook.test'
    )
    ON CONFLICT (event_id) DO NOTHING
    RETURNING public.partner_webhook_sandbox_test_receipts.partner_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text)
  TO postgres, service_role;
