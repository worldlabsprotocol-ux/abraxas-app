# Partner Sandbox Demo — Variable Matrix

**Current state:** Phase A supplies **read-only validation only**. It cannot provision, clean up, migrate, or modify a database.

The validator is intentionally unusable until **both** `DEMO_SUPABASE_PROJECT_REF` and `PRODUCTION_SUPABASE_PROJECT_REF` are configured correctly: the demo ref must differ from every production/denied ref, and the production safety input must match the immutable denylist in `scripts/demo/lib/knownProductionSupabaseProjectRefs.ts`.

The production Supabase project reference is a **non-secret deployment identifier** (public hostname segment). Changing production Supabase projects requires a **reviewed repository update** to that immutable denylist — not an environment-variable change alone.

This matrix covers the **admin-only synthetic-subject demo** at `demo.abraxasworld.xyz`. Default position: **do not share Production secrets** with the demo environment.

## Phase A validation (read-only)

| Variable | Required | Secret? | Purpose |
|----------|----------|---------|---------|
| `DEMO_SUPABASE_PROJECT_REF` | **Yes** | No | Required allowlist — demo Supabase project ref; must differ from every production ref |
| `PRODUCTION_SUPABASE_PROJECT_REF` | **Yes** | No | Required safety input — non-secret deployment identifier; must match `KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS` |
| `DEMO_DENIED_SUPABASE_PROJECT_REFS` | Optional | No | Comma-separated extra project refs that must never be targeted |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | No | Must match `DEMO_SUPABASE_PROJECT_REF` and must not match any denied production ref |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Read-only validation queries (demo project only) |
| `PARTNER_SANDBOX_DEMO_SUBJECT_ID` | Optional | No | Warn if missing; validate shape if present |

## Phase A catalog limits

RLS flags, `pg_policies`, `pg_indexes`, database functions/RPCs, `information_schema` columns, and extension catalog state are **UNVERIFIABLE** through Supabase REST in Phase A. The validator reports these as `UNVERIFIABLE` — they are **not** security validation successes and do not replace database permissions or operator migration review.

## Required to build (demo Vercel deployment)

| Variable | Share with Production? | Redeploy on change? |
|----------|----------------------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **No** | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **No** | Yes |
| `NEXT_PUBLIC_APP_URL` | **No** (`https://demo.abraxasworld.xyz`) | Yes |
| `ABRAXAS_ISSUER_URL` | **No** | Yes |

## Required at runtime (demo presenter flow)

| Variable | Share with Production? | Redeploy on change? | Notes |
|----------|----------------------|---------------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | **No** | Yes | Demo project only |
| `ABRAXAS_SIGNING_KEY` | **No** (fresh demo key) | Yes | Receipt/credential signing |
| `ABRAXAS_PUBLIC_KEY` | **No** | Yes | Verification |
| `ABRAXAS_BROWSER_SESSION_SECRET` | **No** | Yes | Admin session cookies |
| `ADMIN_PIN` | **No** | No | Demo-only presenter PIN |
| `PARTNER_SANDBOX_DEMO_ENABLED` | **No** | Yes | Exact `true` on demo only |
| `PARTNER_SANDBOX_DEMO_SUBJECT_ID` | **No** | Yes | Synthetic holder from Phase B provisioner |

## Explicitly omitted (Phase 1 synthetic-subject demo)

These are **not required** for the offline fixture provisioner or admin-only demo path:

| Variable | Reason omitted |
|----------|----------------|
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | No Google account for synthetic holder |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Same |
| `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` | Same |
| `PILOT_TIER3_SCREENING` | Provisioner calls `applySandboxScreeningClear` directly |
| `CRON_SECRET` | Webhook dispatch not required for Phase 1 rehearsal |
| `ABRAXAS_WEBHOOK_MASTER_KEY` | Webhook delivery disabled by default |
| `PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED` | Not required when delivery disabled |
| `PARTNER_WEBHOOK_ALERTS_ENABLED` | No demo alert emails |
| `RESEND_API_KEY` / `EMAIL_FROM` | No outbound email on demo |
| `SUI_SPONSOR_SECRET_KEY` / `SUI_ISSUANCE_CAP_OBJECT_ID` | No on-chain mint for synthetic holder |
| `INTERNAL_API_SECRET` | **Must not be set** — blocks `/api/credentials/issue` backdoor |
| `UPSTASH_REDIS_REST_*` | Optional; in-memory rate limits suffice for low-traffic demo |

## Required only for future webhook delivery rehearsal

| Variable | When needed |
|----------|-------------|
| `CRON_SECRET` | Vercel cron dispatch enabled |
| `ABRAXAS_WEBHOOK_MASTER_KEY` | Encrypting webhook signing secrets |
| `PARTNER_WEBHOOK_DISPATCH_SCHEDULER_CONFIGURED` | Admin UI scheduler indicator |

Webhook endpoint must point to a **demo-only HTTPS receiver**, never a production partner URL.

## Required only if zkLogin setup path is used (optional)

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | Browser OAuth |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Server audience verification |
| Google Console origins | `https://demo.abraxasworld.xyz` |

Not needed for Phase B offline synthetic holder provisioning.

## Production must keep disabled

| Variable | Production value |
|----------|------------------|
| `PARTNER_SANDBOX_DEMO_ENABLED` | unset or not `true` |
| `PARTNER_SANDBOX_DEMO_SUBJECT_ID` | unset |
| `PILOT_TIER3_SCREENING` | unset or `false` |
