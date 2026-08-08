# Partner Webhooks Operator Runbook

Signed, non-PII lifecycle notifications for approved partner backends. **Notification only** — partners must re-fetch the public receipt and validate `currently_valid` before granting access. This is not a legal compliance program.

## Migrations (do not apply from PR)

Apply manually in order:

1. `supabase/migrations/062_partner_webhook_outbox.sql`

## Environment

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_WEBHOOK_MASTER_KEY` | **Required.** Dedicated key to encrypt webhook signing secrets at rest. Do not reuse `ABRAXAS_SIGNING_KEY` — rotating receipt signing keys must not brick stored webhook secrets. |
| `CRON_SECRET` | **Required for dispatch.** Protects `/api/cron/partner-webhook-dispatch`. Route returns `503 cron_not_configured` when unset; returns `401` when Authorization is wrong. |
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

**Endpoint changes reset trust:** saving a new endpoint URL automatically disables delivery, rotates the signing secret, and reveals the new secret once. The admin must re-enable after the partner updates its verifier. The previous endpoint and secret cannot receive new signed events.

Delivery health: pending, delivering, delivered, retrying, failed.

## Partner delivery history API

```
GET /api/v1/partner/webhooks/deliveries
Authorization: Bearer abx_live_…
```

Requires `webhooks:read` scope on the partner API key. Returns only that partner's delivery records.

## Required Vercel cron configuration

**Pro plan (production):** add to `vercel.json` `crons` array:

```json
{
  "path": "/api/cron/partner-webhook-dispatch",
  "schedule": "*/5 * * * *"
}
```

Vercel Hobby accounts only allow daily cron expressions; use an external scheduler (or upgrade to Pro) to call `GET /api/cron/partner-webhook-dispatch` with `Authorization: Bearer $CRON_SECRET` every 5 minutes until Pro cron is enabled.

Set `CRON_SECRET` in Vercel project settings. The cron route **fails closed** without it and never dispatches without a valid `Authorization: Bearer $CRON_SECRET` header. It processes up to 50 pending/retrying outbox events per run with bounded exponential backoff (1m, 5m, 15m, 1h, 4h; max 6 attempts).

Outbox events use a **delivery lease** (`delivery_lease_until`, `delivery_worker_id`, `delivery_claim_id`). Final status writes are scoped to the claiming worker and claim token; stale workers cannot overwrite a newer reclaim. If a cron invocation crashes while `status=delivering`, the lease expires after 5 minutes and a later worker reclaims the event.

## SSRF and DNS rebinding

- Endpoint URLs are validated at admin configuration time (HTTPS only, no query/fragment, blocked hostnames, DNS resolution to public addresses only).
- **Public IP classifier** (`webhookPublicIp.ts`) rejects all non-globally-routable ranges: IPv4 `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16`, `172.16/12`, `192.0.0/24`, documentation (`192.0.2/24`, `198.51.100/24`, `203.0.113/24`), benchmark (`198.18/15`), multicast, reserved, broadcast; IPv6 unspecified, loopback, link-local, unique-local, documentation, multicast, and IPv4-mapped unsafe addresses.
- **Every delivery re-resolves DNS** immediately before `fetch()`. If resolution becomes unsafe, delivery is rejected with no outbound request.
- **Vercel limitation:** true IP pinning / fixed egress is not available on serverless functions. Defense relies on delivery-time DNS revalidation plus `redirect: manual`. If an endpoint fails delivery-time validation, events remain in `retrying`/`failed` — delivery stays disabled until the endpoint passes validation again.

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
- SSRF protections on endpoint configuration **and** every delivery attempt (`redirect: manual`, delivery-time DNS revalidation)
- Endpoint changes disable delivery and rotate signing secrets automatically
- Durable delivery leases recover from crashed cron workers
- No Supabase Storage or PII in webhook payloads
