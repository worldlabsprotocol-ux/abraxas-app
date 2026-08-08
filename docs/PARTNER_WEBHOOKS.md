# Partner Webhooks Operator Runbook

Signed, non-PII lifecycle notifications for approved partner backends. **Notification only** — partners must re-fetch the public receipt and validate `currently_valid` before granting access. This is not a legal compliance program.

## Migrations (do not apply from PR)

Apply manually in order:

1. `supabase/migrations/062_partner_webhook_outbox.sql`

## Environment

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_WEBHOOK_MASTER_KEY` | Encrypt signing secrets at rest (falls back to `ABRAXAS_SIGNING_KEY`) |
| `CRON_SECRET` | Protects `/api/cron/partner-webhook-dispatch` |
| `REQUIRE_PARTNER_API_KEY` | When `true`, partner delivery history requires API key |

## Event types

| Event | When enqueued |
|-------|----------------|
| `partner.receipt.issued` | Partner Flow issues a new approved receipt (`replay_status === issued`) |
| `partner.receipt.revoked` | Admin receipt revocation succeeds |
| `partner.access.revoked` | Admin subject partner access revocation succeeds |
| `partner.credential.revoked` | Admin credential claim revocation affects partner receipts |

## Payload (non-PII)

```json
{
  "event_id": "uuid",
  "event_type": "partner.receipt.issued",
  "occurred_at": "2026-08-08T00:00:00.000Z",
  "partner_id": "partner-slug",
  "policy_id": "policy-id",
  "receipt_id": "dr_…",
  "decision_id": "uuid",
  "reason_code": "operator_security_review"
}
```

Never includes email, wallet, OAuth subject, JWTs, claims, documents, or storage paths.

## Headers

| Header | Value |
|--------|-------|
| `X-Abraxas-Webhook-Id` | `event_id` |
| `X-Abraxas-Webhook-Timestamp` | Unix seconds |
| `X-Abraxas-Webhook-Signature` | `v1=<hmac-sha256-hex>` of `{timestamp}.{rawBody}` |

## Admin configuration

1. Open `/admin/partners` → **Webhooks** tab
2. Enter `partner_id` and HTTPS endpoint (no query strings, fragments, localhost, or private IPs)
3. Copy signing secret on first save or rotate (shown **once only**)
4. Explicitly **Enable delivery** (disabled by default)

Delivery health: pending, delivering, delivered, retrying, failed.

## Partner delivery history API

```
GET /api/v1/partner/webhooks/deliveries
Authorization: Bearer abx_live_…
```

Requires `webhooks:read` scope on the partner API key. Returns only that partner's delivery records.

## Required Vercel cron configuration

Add to `vercel.json` (included in this PR):

```json
{
  "path": "/api/cron/partner-webhook-dispatch",
  "schedule": "*/5 * * * *"
}
```

Set `CRON_SECRET` in Vercel project settings. The cron route processes up to 50 pending/retrying outbox events per run with bounded exponential backoff (1m, 5m, 15m, 1h, 4h; max 6 attempts).

## Partner signature verification example (Node.js)

```javascript
import crypto from "crypto";

function verifyAbraxasWebhook({ rawBody, timestamp, signatureHeader, secret, maxSkewSec = 300 }) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > maxSkewSec) {
    throw new Error("timestamp_skew");
  }
  const expected = `v1=${crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader.trim()))) {
    throw new Error("signature_mismatch");
  }
}

// In your HTTPS handler:
// const rawBody = await readRawBody(req);
// verifyAbraxasWebhook({
//   rawBody,
//   timestamp: req.headers["x-abraxas-webhook-timestamp"],
//   signatureHeader: req.headers["x-abraxas-webhook-signature"],
//   secret: process.env.ABRAXAS_WEBHOOK_SECRET,
// });
// const event = JSON.parse(rawBody);
// Re-fetch public receipt + validate currently_valid before granting access.
```

## Safety guarantees

- Enqueue is **best-effort** — never blocks Partner Flow, revocation, privacy, or receipt issuance
- At-least-once delivery with idempotent `event_id`
- SSRF protections on endpoint configuration and delivery (`redirect: manual`)
- No Supabase Storage or PII in webhook payloads
