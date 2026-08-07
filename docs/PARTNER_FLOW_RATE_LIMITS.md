# Partner Flow rate limits and P1-4 telemetry

Operational reliability for public Partner Flow surfaces: configurable server-side rate limiting, privacy-preserving client identity, and admin health visibility.

## Protected endpoints

| Method | Route | Rate-limit key |
|--------|-------|----------------|
| POST | `/api/v1/partner-flow/evaluate` | `PARTNER_FLOW_RATE_LIMIT_EVALUATE` |
| POST | `/api/v1/partner-flow/complete` | `PARTNER_FLOW_RATE_LIMIT_COMPLETE` |
| POST | `/api/v1/partner-flow/refresh` | `PARTNER_FLOW_RATE_LIMIT_REFRESH` |
| GET | `/api/receipts/{receiptId}/public` | `PARTNER_FLOW_RATE_LIMIT_PUBLIC_RECEIPT` |
| POST | `/api/v1/verification-requests/{id}/consent` | `PARTNER_FLOW_RATE_LIMIT_CONSENT` |

## Required Vercel environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PARTNER_FLOW_RATE_LIMIT_SALT` | **Recommended** | Dedicated strong secret (≥16 chars) for HMAC bucket keys |
| `ABRAXAS_BROWSER_SESSION_SECRET` | **Fallback** | Existing server-only secret; used when dedicated salt is unset |
| `ABRAXAS_SIGNING_KEY` | **Fallback** | Second fallback server-only secret |

**Production rule:** At least one strong server secret must be configured. There is **no** public literal fallback (e.g. `abraxas-partner-flow-pilot` is rejected).

When no strong secret is configured in production:

- **Public receipt** (`GET /api/receipts/{id}/public`): **fails closed** with HTTP 503 (rate-limit identity unavailable).
- **Session-authenticated routes**: rate limiting is **disabled** and a **critical** structured log is emitted once per instance (`abraxas_partner_flow_rate_limit_misconfigured`).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PARTNER_FLOW_RATE_LIMIT_ENABLED` | `true` | Set `false` to disable limits |
| `PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC` | `60` | Rolling window (seconds) |
| Per-endpoint `PARTNER_FLOW_RATE_LIMIT_*` | 20–120/min | Max requests per window |

Defaults (per 60s window): evaluate/complete/consent **30**, refresh **20**, public receipt **120**.

## Client identity (privacy)

Rate-limit buckets use **HMAC-SHA256** with a strong server-only secret over:

- Browser-session routes: `session:{suiAddress}` (never stored in telemetry)
- Public receipt on Vercel: `vercel-ip:{x-real-ip}` using platform-controlled headers only

**Trusted IP strategy**

| Runtime | IP source | Notes |
|---------|-----------|-------|
| Vercel (`VERCEL=1`) | `x-real-ip`, then `x-vercel-forwarded-for` | `x-forwarded-for` is **never** used (client-spoofable) |
| Local / other | `untrusted-proxy:shared` | Single shared bucket; not client-spoofable |

Raw IPs, HMAC salts, bucket keys, wallet IDs, sessions, and tokens are **never** logged, returned in responses, written to audit metadata, telemetry, or admin health output.

Rejected abuse returns **HTTP 429** with **`Retry-After`** (seconds).

## Distributed protection (Vercel)

### Default: basic per-instance protection

Without Upstash, limits use an **in-process memory** store (`lib/partner/partnerFlowRateLimit.ts`). This is correct for local development and provides per-instance protection on serverless, but **does not coordinate across Vercel instances**.

Admin health shows: **“Basic per-instance protection active”**.

### Network-wide protection with Upstash Redis

When **both** server-only variables are set, limits are enforced via the official `@upstash/ratelimit` library backed by `@upstash/redis`:

| Variable | Required for distributed mode |
|----------|-------------------------------|
| `UPSTASH_REDIS_REST_URL` | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Yes |

Admin health shows: **“Network-wide protection active”** only when Upstash is configured **and** reachable. Env var names alone do not imply Redis is active.

**Operator setup (Vercel)**

1. Create an Upstash Redis database (REST API enabled) in the [Upstash console](https://console.upstash.com/).
2. Copy the REST URL and REST token from the database details page.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `UPSTASH_REDIS_REST_URL` — server-only, all production/preview environments as needed
   - `UPSTASH_REDIS_REST_TOKEN` — server-only, same scopes
4. Redeploy. Confirm `/admin/partner-flow` shows **“Network-wide protection active”**.
5. Do **not** commit tokens to the repo or expose them in client bundles.

**Fail-closed when Upstash is configured but unavailable**

If both Upstash variables are set but Redis is unreachable:

- Public receipt requests return **HTTP 503** (`rate_limit_store_unavailable`) — no silent downgrade to in-memory limits.
- Admin health shows unreachable status with a safe error code (e.g. `unreachable`, `ping_failed`) — no secrets or bucket keys.
- Remove both Upstash variables to intentionally return to basic per-instance protection.

Implementation: `lib/partner/partnerFlowUpstashStore.ts` + `lib/partner/partnerFlowRateLimit.ts`.

## P1-4 telemetry

Structured logs (`type: abraxas_partner_flow_telemetry`) and in-memory aggregates record:

- Outcome, HTTP status, latency
- Rate-limit rejections
- `partner_id` / `policy_id` when safely available
- Audit persistence failures

No PII, JWTs, emails, wallet addresses, raw IPs, documents, or claims.

Usage rows with `response_state: rate_limited` or `http_status: 429` are written to `partner_api_usage` when Supabase is configured.

## Operational health

- **API:** `GET /api/admin/partner-flow/health` (admin auth required)
- **Admin UI:** `/admin/partner-flow`
- **CLI:** `npm run partner-flow:health`

Reports last-24h aggregates: request counts, 429 totals, error rates, audit persistence failures, `hmacSecretConfigured`, `trustedIpStrategy`, and distributed store reachability. No sensitive event payloads.

## Tradeoffs

| Approach | Pros | Cons |
|----------|------|------|
| In-memory limits | No infra; fast; safe for dev | Per-instance only on Vercel |
| Upstash Redis limits | Shared across all Vercel instances | Requires Upstash account + env vars |
| `partner_api_usage` telemetry | Durable history; existing table | Fire-and-forget; not real-time alerting |
| Session-based buckets | Stable per holder; no IP retention | Requires authenticated session |
| Vercel `x-real-ip` buckets | Spoof-resistant on Vercel | Shared NAT may share a bucket |
| Untrusted-proxy shared fallback | Cannot be client-spoofed locally | All local clients share one bucket |
| Fail-closed public receipt w/o secret | Prevents predictable HMAC keys | Public receipt 503 until secret is set |
| Fail-closed when Upstash down | No silent downgrade from distributed mode | 503 until Redis is restored or vars removed |
