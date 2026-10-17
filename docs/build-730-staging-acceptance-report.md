# Build #730 — Staging acceptance report

**Date:** 2026-10-17  
**PR:** #730 (`cursor/build-730-native-auth-trust-5ffe`)  
**Agent run:** Cloud Agent `bc-d491b464-9cb3-4a36-b137-98aa4b8f5ffe`

## 1. Staging environment inspected (no secrets exposed)

| Resource | Finding |
| --- | --- |
| **Authorized staging Postgres** | Supabase project **`abraxas-partner-demo`** (`ref`: `ocntwbxarpjeixdnzide`, `us-east-1`) — matches repo guard `LAUNCHPAD_EXPECTED_SUPABASE_REF=ocntwbxarpjeixdnzide` in `scripts/launchpad-staging-smoke/run.ts` |
| **PR preview deployment** | Vercel preview **`abraxas-gw0fvxz8y-worldlabsprotocol-uxs-projects.vercel.app`** — commit `126322fb`, branch `cursor/build-730-native-auth-trust-5ffe`, state **READY** |
| **Production deployment** | Latest production is **`main` @ `b08383b9`** — **does not include #730**; native auth must remain off production until merge + explicit enable |
| **Local agent `.env.local`** | `NEXT_PUBLIC_SUPABASE_URL` is **`http://placeholder`** — not wired to staging; **cannot** run Next.js against real Postgres from this VM without operator env pull |
| **Vercel access from agent** | `web_fetch_vercel_url` and protection bypass → **403 / Vercel Authentication** — preview is behind **Vercel Authentication**, not reachable for browser/WebAuthn acceptance in this run |
| **Memory store** | **Not used** for staging DB validation |

### Required preview environment (operator — not verified applied on preview)

Set on **Preview** environment for `abraxas-app` (not Production):

- `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true`
- `ABRAXAS_ACCOUNT_SESSION_SECRET` — ≥32 chars, dedicated secret
- `ABRAXAS_WEBAUTHN_RP_ID` — hostname of preview (e.g. `abraxas-gw0fvxz8y-worldlabsprotocol-uxs-projects.vercel.app`) or custom staging domain
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — must target **`ocntwbxarpjeixdnzide`**
- **Do not set** `ABRAXAS_NATIVE_ACCOUNT_MEMORY`

WebAuthn **origin** must match the HTTPS preview URL exactly.

## 2. Database migrations — **PASSED (staging Postgres)**

Applied via Supabase MCP to **`ocntwbxarpjeixdnzide`**:

| Migration | Status |
| --- | --- |
| `144_native_account_webauthn` | **Applied** (`20261017182600`) |
| `145_abraxas_webauthn_hardening` | **Applied** (`20261017182605`) |

**Evidence (SQL acceptance on live staging DB):**

- All `abraxas_*` native-account tables present; **RLS enabled** on each.
- **Atomic challenge consume:** first `abraxas_consume_webauthn_challenge_atomic` → `ok: true`; second → `challenge_unavailable`.
- **Enrollment idempotency:** duplicate `(account_id, partner_id)` insert → `unique_violation` (expected).
- **Revoked membership row** can be persisted with `status = 'revoked'`.

Verdict SQL returned: **`postgres_acceptance_ok`**.

This validates **persistence and DB-level security primitives**; it is **not** a substitute for HTTP/WebAuthn or Launchpad RPC E2E.

## 3. Real WebAuthn lifecycle on staging browser — **NOT RUN (blocked)**

| Step | Status |
| --- | --- |
| Open `/welcome` on preview | **Blocked** — Vercel Authentication |
| Passkey register / authenticate | **Not run** on staging |
| Session cookie / sign-out / return | **Not run** on staging |

**Previously verified (local only, memory store):** Playwright + CDP virtual authenticator — register, sign-out, sign-in, same `abx_ac_*` (`playwright.native-auth.config.ts`). **Not claimed as staging acceptance.**

## 4. Real sandbox provisioning on staging — **NOT RUN (blocked)**

Launchpad sandbox provision requires:

1. Reachable preview with native auth env + Supabase service role bound to `ocntwbxarpjeixdnzide`
2. `partner_launchpad_provision_sandbox_atomic` RPC (present on this project from prior migrations)

Agent could **not** invoke `/api/sandbox/enroll` against a protected preview or against real PostgREST without service credentials.

## 5. Negative authorization — partial

| Test | Staging Postgres | Staging HTTP |
| --- | --- | --- |
| Challenge replay | **Pass** (atomic RPC) | Not run |
| Duplicate sandbox enrollment | **Pass** (unique index) | Not run |
| RLS enabled | **Pass** | Not run |
| Rate limits / origin / RP mismatch | Not run | Not run |
| Cross-tenant / claim abuse | Covered in Vitest only | Not run |

## 6. Legacy continuity — **unchanged by evidence**

- No migration modifies `sui_zklogin_identities`, holder subjects, or partner API key tables.
- Production deployment remains pre-#730; **native auth not enabled** on production.
- No automatic native ↔ holder linking shipped.

## 7. Operator procedure to complete staging acceptance

Run from a machine with **Vercel SSO** and **Preview env vars** configured:

```bash
# 1) Confirm DB (already applied on abraxas-partner-demo)
#    Migrations 144 + 145 listed in Supabase dashboard for ocntwbxarpjeixdnzide

# 2) Pull preview env (example)
vercel env pull .env.staging.preview --environment=preview --yes
# Set on preview in Vercel dashboard if missing:
#   ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true
#   ABRAXAS_ACCOUNT_SESSION_SECRET=...
#   ABRAXAS_WEBAUTHN_RP_ID=<preview-hostname>

# 3) Staging URL (PR preview or dedicated staging alias — NOT production)
export LAUNCHPAD_STAGING_URL="https://abraxas-gw0fvxz8y-worldlabsprotocol-uxs-projects.vercel.app"
export LAUNCHPAD_EXPECTED_SUPABASE_REF="ocntwbxarpjeixdnzide"

# 4) Browser WebAuthn (virtual authenticator)
export NATIVE_AUTH_SKIP_WEBSERVER=1
export NATIVE_AUTH_BASE_URL="$LAUNCHPAD_STAGING_URL"
npx playwright test -c playwright.native-auth.config.ts

# 5) Optional: Launchpad smoke (existing)
npm run smoke:launchpad:staging
```

Use **`vercel curl "$LAUNCHPAD_STAGING_URL/api/auth/native/enabled"`** when Deployment Protection blocks raw curl.

## 8. Final merge recommendation

| Criterion | Status |
| --- | --- |
| Staging Postgres migrations 144–145 | **Done** |
| DB persistence / atomicity / idempotency | **Verified on `ocntwbxarpjeixdnzide`** |
| Staging HTTPS WebAuthn + sandbox E2E | **Blocked** — Vercel Authentication + missing preview env wiring in agent |
| Production safety | **#730 not on production**; keep flag off until staging E2E passes |

**Recommendation: keep PR #730 in draft.** Merge is **not** safe until an operator completes **§7** on the authorized preview with real WebAuthn and at least one successful **`/api/sandbox/enroll`** against Launchpad RPC.

**Do not** enable `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` on Production until staging sign-off is recorded.
