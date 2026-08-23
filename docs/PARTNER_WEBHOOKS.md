# Partner Webhooks Operator Runbook

Signed, non-PII lifecycle notifications for approved partner backends. **Notification only** — partners must re-fetch the public receipt and validate `currently_valid` before granting access. This is not a legal compliance program.

## Migrations (do not apply from PR)

Apply manually in order:

1. `supabase/migrations/062_partner_webhook_outbox.sql`
2. `supabase/migrations/063_partner_webhook_operator_ops.sql`
3. `supabase/migrations/064_partner_webhook_alert_state.sql`

## Environment

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_WEBHOOK_MASTER_KEY` | **Required.** Server-only dedicated key to encrypt webhook signing secrets at rest. Never use a `NEXT_PUBLIC_` variable. Do not reuse `ABRAXAS_SIGNING_KEY`. |
| `CRON_SECRET` | **Required for dispatch.** Server-only bearer token for `/api/cron/partner-webhook-dispatch`. Never use a `NEXT_PUBLIC_` variable. Route returns `503 cron_not_configured` when unset; returns `401` when Authorization is wrong. |
| `PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED` | Set to `true` (exact string, server-only) **only after** the dispatch cron deployment is live. Admin UI shows “Dispatch scheduler not yet configured” until this is set and `CRON_SECRET` is present. |
| `PARTNER_WEBHOOK_ALERTS_ENABLED` | Set to `true` (trimmed exact string, server-only) to enable operational email alerts. Requires `RESEND_API_KEY`, `EMAIL_FROM`, and `ABRAXAS_ADMIN_EMAILS`. Never use `NEXT_PUBLIC_` variables. |
| `RESEND_API_KEY` | Resend API key for operational alert emails (server-only). |
| `EMAIL_FROM` | Verified Resend sender address for alert emails (server-only). |
| `ABRAXAS_ADMIN_EMAILS` | Comma-separated admin recipient emails for operational alerts (server-only). Required — no `ADMIN_EMAIL` fallback. |
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

## Operator dead-letter recovery

Admin UI (`/admin/partners` → Webhooks) lists failed deliveries (metadata only) and supports manual retry:

- `GET /api/admin/partners/webhooks/failed-deliveries`
- `POST /api/admin/partners/webhooks/retry` with `{ "outbox_id": "…" }`

Manual retry requeues the **same** `event_id` and payload. It does not create a new Partner Flow receipt or billable event. Retries are refused when webhook delivery is disabled for that partner. Each retry is audited in `partner_webhook_retry_audit` (migration 063).

Dispatch run telemetry is stored in `partner_webhook_dispatch_runs` (migration 063).

## Operational email alerts

When `PARTNER_WEBHOOK_ALERTS_ENABLED=true` and Resend is configured (`RESEND_API_KEY`, `EMAIL_FROM`, `ABRAXAS_ADMIN_EMAILS`), Abraxas sends **metadata-only** operational emails for:

| Alert | Trigger | Owner |
|-------|---------|-------|
| Dispatcher execution failure | Dispatch cron throws before completing | Dispatch cron (`/api/cron/partner-webhook-dispatch`) |
| Terminal delivery failure | One or more outbox rows in `failed` status | Health monitor cron |
| Excessive backlog | `pending + retrying` ≥ 50 | Health monitor cron |
| Dispatcher stale | Scheduler configured but no successful dispatch run in 15+ minutes | Health monitor cron |
| Signing secret failure | Enabled config cannot decrypt signing secret (or master key missing) | Health monitor cron |

Anti-spam: durable cooldown state in `partner_webhook_alert_state` (migration 064) with atomic PostgreSQL claim/finalize RPCs (`claim_partner_webhook_alert_delivery`, `finalize_partner_webhook_alert_delivery`). One alert key per category, 60-minute default cooldown, recovery email when a condition clears. Failed provider delivery releases the claim without advancing cooldown or inactive state. Alerts never include payloads, secrets, authorization headers, response bodies, PII, wallets, JWTs, raw exception text, or full endpoint URLs — only allowlisted error categories and optional SHA-256 fingerprints for dispatcher failures.

Admin UI (`/admin/partners` → Webhooks) shows whether alerting is configured and lists active alert keys (safe metadata only).

### Required Vercel cron configuration (health monitor)

`vercel.json` includes a health monitor cron every 15 minutes:

```json
{
  "path": "/api/cron/partner-webhook-health",
  "schedule": "*/15 * * * *"
}
```

This route uses the same `CRON_SECRET` bearer auth and fail-closed behavior as dispatch. It does **not** duplicate dispatcher execution failure alerts — those are owned by the dispatch cron only.

## Partner delivery history API

```
GET /api/v1/partner/webhooks/deliveries
Authorization: Bearer abx_live_…
```

Requires `webhooks:read` scope on the partner API key. Returns only that partner's delivery records.

## Read-only delivery observability (Production admin)

**Read-only.** No retry, requeue, config update, secret rotation, enable/disable, key issue, partner activation, or migration work from this surface.

1. Open `/admin/partners` → **Delivery observability** tab
2. Enter an explicit `partner_id` and click **Load** — no observability query runs until both are provided
3. Expand a delivery row to load attempt metadata for that `event_id` (scoped to the selected partner)

### API

```
GET /api/admin/partners/webhooks/observability?partner_id=<partner_id>
GET /api/admin/partners/webhooks/observability?partner_id=<partner_id>&event_id=<event_id>
```

- **Production:** requires an allowlisted browser session (`checkProductionSensitiveAdminAccess`). PIN-only requests return `401`.
- **Demo/local:** legacy PIN-based admin access remains unchanged for other routes; this observability route still uses Production-sensitive session gating when on Production origin.
- `partner_id` is required; `event_id` is optional (attempts mode).
- Cross-partner or missing `event_id` lookups return generic `404 Delivery not found`.
- Delivery history is bounded (50 rows per partner).
- Dispatch scheduler context is optional: when `partner_webhook_dispatch_runs` is unavailable, partner-specific data still returns with `dispatch_summary_available: false`.

**Never returned or rendered:** endpoint URLs, signing secrets/prefixes, ciphertext, payloads, response snippets, env/cron values, SQL details, or alert-state data.

## Required Vercel cron configuration

**Production (Vercel Pro):** `vercel.json` includes a cron entry that invokes the dispatcher every five minutes:

```json
{
  "path": "/api/cron/partner-webhook-dispatch",
  "schedule": "*/5 * * * *"
}
```

Vercel sends `Authorization: Bearer $CRON_SECRET` on each cron invocation when `CRON_SECRET` is set in the project environment.

**Alternative (external scheduler):** if not using Vercel cron, call `GET /api/cron/partner-webhook-dispatch` with `Authorization: Bearer $CRON_SECRET` every five minutes from your scheduler.

### Post-deployment operator steps

1. Deploy this cron entry to production (main branch).
2. Confirm `CRON_SECRET` and `ABRAXAS_WEBHOOK_MASTER_KEY` are set as **server-only** Vercel environment variables (never `NEXT_PUBLIC_`).
3. **After** the deployment is live and cron is firing, set `PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED=true` in Vercel Production and redeploy if required.
4. Verify `/admin/partners` → **Webhooks** shows the scheduler configured and records a successful dispatch run.

Set `CRON_SECRET` in Vercel project settings. The cron route **fails closed** without it and never dispatches without a valid `Authorization: Bearer $CRON_SECRET` header. It processes up to 50 pending/retrying outbox events per run with bounded exponential backoff (1m, 5m, 15m, 1h, 4h; max 6 attempts). Overlapping cron invocations are safe: delivery leases prevent duplicate final writes.

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
