-- FILE: supabase/migrations/100_receipt_lifecycle_outbox_events.sql
-- DEMO-first: expand partner webhook outbox event_type CHECK for receipt lifecycle.
-- Prerequisite: 067_partner_webhook_test_event_atomic.sql
-- Do not apply from Vercel or this PR.
-- Service-role outbox remains fail-closed when CHECK rejects unknown types.

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
    'receipt.expiring',
    'receipt.revoked',
    'receipt.invalidated',
    'decision.denied',
    'integration.health_changed'
  ));
