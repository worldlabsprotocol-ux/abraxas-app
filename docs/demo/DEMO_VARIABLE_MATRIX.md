# Partner Sandbox Demo — Variable Matrix

**Current state:** Phase A validation and Phase C provisioning CLI are available. Phase C.1 cleanup is not implemented.

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
| `PARTNER_SANDBOX_DEMO_SUBJECT_ID` | Optional | No | Warn if missing in validate; set from Phase C state file for presenter flow |

## Phase C provisioning (CLI apply / verify)

| Variable | Required | Secret? | Purpose |
|----------|----------|---------|---------|
| `DEMO_SUPABASE_DATABASE_URL` | Apply + verify | **Yes** | Hidden prompt only — Session Pooler URL; never in `.env.demo.local` |
| `DEMO_SUPABASE_SSL_ROOT_CERT_PATH` | Pooler apply/verify | No (path) | Verified TLS CA for Session Pooler |
| `ABRAXAS_SIGNING_KEY` | Apply only | **Yes** | Hidden prompt only — must match `EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT` |
| `ABRAXAS_ISSUER_URL` / `NEXT_PUBLIC_APP_URL` | Apply | No | Credential JWT issuer (demo origin) |
| `EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT` | Apply (when enabled) | No | Committed in `scripts/demo/lib/expectedDemoSigningKeyThumbprint.ts`; `null` disables live apply |

Live `--apply` remains disabled while `EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT` is `null`. Do not store secrets in env files or the state file.

| Tooling | Purpose |
|---------|---------|
| `npm run demo:signing-key:generate` | Local demo key generation outside repository |
| `npm run demo:signing-key:verify` | Local JWK + JWT + receipt verification before thumbprint PR |

See `docs/demo/DEMO_SIGNING_KEY_BOOTSTRAP.md`.

Verify uses read-only PostgreSQL only (not PostgREST). Apply uses one `pg.Client` transaction for all mutations.

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
| `ADMIN_PIN` | **No** | Yes | Demo-only presenter PIN |
| `PARTNER_SANDBOX_DEMO_ENABLED` | **No** | Yes | Exact `true` on demo only |
| `PARTNER_SANDBOX_DEMO_SUBJECT_ID` | **No** | Yes | From `scripts/demo/.sandbox-holder.json` after Phase C verify |

## Explicitly omitted (Phase 1 synthetic-subject demo)

These are **not required** for the offline fixture provisioner or admin-only demo path:

| Variable | Reason omitted |
|----------|----------------|
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | No Google account for synthetic holder |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Same |
| `GOOGLE_ZKLOGIN_LEGACY_CLIENT_IDS` | Same |
| `PILOT_TIER3_SCREENING` | Provisioner writes sandbox screening claim directly via SQL repository |
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

Not needed for Phase C offline synthetic holder provisioning.

## Production must keep disabled

| Variable | Production value |
|----------|------------------|
| `PARTNER_SANDBOX_DEMO_ENABLED` | unset or not `true` |
| `PARTNER_SANDBOX_DEMO_SUBJECT_ID` | unset |
| `PILOT_TIER3_SCREENING` | unset or `false` |
