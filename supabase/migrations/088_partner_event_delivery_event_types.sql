-- 088_partner_event_delivery_event_types.sql
-- DEMO-ONLY / OPERATOR APPLY: Partner Event Delivery public event types.
-- Prerequisite: 062_partner_webhook_outbox.sql, 067_partner_webhook_test_event_atomic.sql
-- Do not apply to MAIN or Production from this PR.
-- Expands outbox event_type CHECK so versioned lifecycle events can persist
-- alongside legacy partner.* names. Delivery remains best-effort; this does
-- not claim guaranteed delivery.

ALTER TABLE public.partner_webhook_outbox
  DROP CONSTRAINT IF EXISTS partner_webhook_outbox_event_type_check;

ALTER TABLE public.partner_webhook_outbox
  ADD CONSTRAINT partner_webhook_outbox_event_type_check
  CHECK (event_type IN (
    'partner.receipt.issued',
    'partner.receipt.revoked',
    'partner.access.revoked',
    'partner.credential.revoked',
    'partner.webhook.test',
    'receipt.issued',
    'receipt.expired',
    'receipt.revoked',
    'decision.denied',
    'integration.health_changed'
  ));
