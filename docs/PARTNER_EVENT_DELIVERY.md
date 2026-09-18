# Partner Event Delivery

Signed lifecycle notifications for relying partners. **Notification only.** Partners must fetch `GET /api/receipts/{id}/public` and verify the signed receipt on their server before granting access. Webhook delivery is best effort with bounded retries. This implementation does not claim guaranteed delivery.

## DEMO migration (optional, labeled)

Apply only on DEMO / isolated operator databases. Do not apply to MAIN or Production from this PR.

1. Existing webhook stack: `062`, `063`, `064`, `067`, `068`, `069` as already documented in `docs/PARTNER_WEBHOOKS.md`
2. Event Delivery types: `supabase/migrations/088_partner_event_delivery_event_types.sql`

`088` expands `partner_webhook_outbox.event_type` so public types can persist:

- `receipt.issued`
- `receipt.expired`
- `receipt.revoked`
- `decision.denied`
- `integration.health_changed`

Legacy `partner.*` types remain valid for existing rows.

Environment: reuse `ABRAXAS_WEBHOOK_MASTER_KEY` and dispatch cron from the webhook runbook. No MAIN Supabase, Production Vercel, Google OAuth, or production activation changes.

## Public event schema (`2026-09-18`)

Allowed keys only: event ID, schema version, event type, timestamp, partner ID, policy ID, policy version, receipt ID or decision ID when applicable, narrow outcome, signature metadata.

Never included: DOB, documents, images, legal name, email, wallet address, raw credential JWT, identity-provider token, full user profile.

Headers stay `X-Abraxas-Webhook-Id`, `X-Abraxas-Webhook-Timestamp`, `X-Abraxas-Webhook-Signature` (`v1=` HMAC of `{timestamp}.{rawBody}`).

## Partner Launchpad

Self-service at `/developers/launchpad`:

- add / rotate / remove HTTPS endpoint (SSRF-safe validation)
- create or rotate signing secret (copy once)
- enable or disable delivery
- send a labeled TEST EVENT
- view partner-visible states: queued, delivered, retrying, failed, dead-lettered
- redeliver eligible failed events (same event ID)

## Verification helpers

`lib/partner/eventDelivery` and docs at `/docs/partner-event-delivery`:

- accept valid signatures
- reject invalid signatures (fail closed)
- reject stale timestamps
- ignore duplicate event IDs
- reject wrong partner
- still verify the receipt server-side before grant
