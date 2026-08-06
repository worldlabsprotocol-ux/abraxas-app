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

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PARTNER_FLOW_RATE_LIMIT_ENABLED` | `true` | Set `false` to disable limits |
| `PARTNER_FLOW_RATE_LIMIT_WINDOW_SEC` | `60` | Rolling window (seconds) |
| `PARTNER_FLOW_RATE_LIMIT_SALT` | falls back to `ABRAXAS_PSEUDONYM_SALT` | HMAC salt for client bucket keys |
| Per-endpoint `PARTNER_FLOW_RATE_LIMIT_*` | 20–120/min | Max requests per window |

Defaults (per 60s window): evaluate/complete/consent **30**, refresh **20**, public receipt **120**.

## Client identity (privacy)

Rate-limit buckets use **HMAC-SHA256** over:

- Browser-session routes: `session:{suiAddress}` (never stored in telemetry)
- Public receipt: `ip:{clientIp}` (IP is hashed only; raw IP is never logged or written to audit metadata)

Rejected requests return **HTTP 429** with a **`Retry-After`** header (seconds).

## Distributed protection (Vercel)

Current implementation uses an **in-process memory** store (`lib/partner/partnerFlowRateLimit.ts`). This is correct for local development and provides per-instance protection on serverless, but **does not coordinate across Vercel instances**.

For durable cross-instance limits, configure **Upstash Redis**:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Distributed wiring is documented as a dependency; env vars alone do not enable shared limits until a Redis-backed store is implemented.

## P1-4 telemetry

Structured logs (`type: abraxas_partner_flow_telemetry`) and in-memory aggregates record:

- Outcome, HTTP status, latency
- Rate-limit rejections
- `partner_id` / `policy_id` when safely available
- Audit persistence failures

No PII, JWTs, emails, wallet addresses, raw IPs, documents, or claims.

Usage rows with `response_state: rate_limited` or `http_status: 429` are written to `partner_api_usage` when Supabase is configured.

## Operational health

- **Admin API:** `GET /api/admin/partner-flow/health` (admin auth required)
- **Admin UI:** `/admin/partner-flow`
- **CLI:** `npm run partner-flow:health`

Reports last-24h aggregates: request counts, 429 totals, error rates, audit persistence failures. No sensitive event payloads.

## Tradeoffs

| Approach | Pros | Cons |
|----------|------|------|
| In-memory limits | No infra; fast; safe for dev | Per-instance only on Vercel |
| `partner_api_usage` telemetry | Durable history; existing table | Fire-and-forget; not real-time alerting |
| Session-based buckets | Stable per holder; no IP retention | Requires authenticated session |
| IP-hashed buckets (public receipt) | Protects unauthenticated surface | Shared NAT may share a bucket |
