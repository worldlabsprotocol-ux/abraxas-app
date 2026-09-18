# Partner Event Delivery

Signed lifecycle notifications for relying partners. **Notification only.** Partners must fetch `GET /api/receipts/{id}/public` and verify the signed receipt on their server before granting access. Webhook delivery is best effort with bounded retries. This implementation does not claim guaranteed delivery.

## Production schema compatibility

No new migration is required. Event Delivery persists on the existing `062`/`067` outbox CHECK:

| Public payload `event_type` | Stored outbox `event_type` |
|-----------------------------|----------------------------|
| `receipt.issued` | `partner.receipt.issued` |
| `receipt.revoked` | `partner.receipt.revoked` |
| TEST EVENT | `partner.webhook.test` |

`receipt.expired`, `decision.denied`, and `integration.health_changed` are **not** enqueued unless a fail-closed schema probe proves the CHECK already allows those stored values. Launchpad overview and Integration Health then show skip code `event_type_not_supported` and keep production compatibility limited to `receipt.issued`, `receipt.revoked`, and TEST EVENT.

DEMO Preview TEST EVENT enqueue requires `enqueue_partner_webhook_test_delivery(text)` from migrations **067 then 069**. Those files were not applied on DEMO `ocntwbxarpjeixdnzide` at the time of the Preview failure. Operator steps: `docs/demo/DEMO_WEBHOOK_TEST_EVENT_067_069_RUNBOOK.md`. Never apply that runbook on MAIN or Production.

Reuse `ABRAXAS_WEBHOOK_MASTER_KEY` and dispatch cron from `docs/PARTNER_WEBHOOKS.md`. No MAIN Supabase, Production Vercel, Google OAuth, or production activation changes.

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
