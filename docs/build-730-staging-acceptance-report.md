# Build #730 — Staging acceptance report

**Date:** 2026-10-17 (updated)  
**PR:** #730 (`cursor/build-730-native-auth-trust-5ffe`)  
**Latest preview (branch):** `https://abraxas-k6x7dukmv-worldlabsprotocol-uxs-projects.vercel.app` @ `bd81a3ce`

## 1. Vercel preview access

| Mechanism | Result |
| --- | --- |
| Unauthenticated browser/curl | **302** → Vercel SSO (`vercel.com/sso-api`) |
| `x-vercel-protection-bypass` (deployment protection secret in agent env) | **200** on `/welcome` and JSON API routes |
| Vercel MCP `web_fetch_vercel_url` / `get_access_to_vercel_url` | **403** — cannot read deployment bypass metadata for team `worldlabsprotocol-uxs-projects` |
| Vercel MCP `create_project_env` (Preview native flag) | **403** — write not authorized in this MCP scope |

**Operator (shortest path):** Use **`vercel login`** + **`vercel curl`** or Playwright with **`VERCEL_PROTECTION_BYPASS`** / **`x-vercel-trusted-oidc-idp-token`** (see [Deployment Protection](https://vercel.com/docs/deployment-protection)). Do not disable org-wide Vercel Authentication.

## 2. Preview environment verification (no secrets printed)

Probed via `scripts/build-730/preview-readiness-curl.sh` with deployment protection bypass:

| Check | Result |
| --- | --- |
| `GET /api/launchpad/staging/environment` | **200** — `supabase_project_ref`: **`ocntwbxarpjeixdnzide`**, `deployment_environment`: **preview** |
| `GET /api/auth/native/enabled` | **`enabled`: false** (feature flag not set on Preview) |
| Preview env var names in Vercel (read via MCP) | **`ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED`** — **not present**; **`ABRAXAS_BROWSER_SESSION_SECRET`** — present; **`ABRAXAS_WEBAUTHN_RP_ID`** — not present (RP ID can fall back to request `Host` on preview) |
| Production | Latest production remains **`main`** pre-#730; native auth must stay off |

**Required operator action before HTTPS WebAuthn acceptance:**

1. Vercel → **abraxas-app** → **Settings → Environment Variables → Preview** (branch `cursor/build-730-native-auth-trust-5ffe` recommended):
   - `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=true`
   - `ABRAXAS_ACCOUNT_SESSION_SECRET` (≥32 chars) **or** rely on existing `ABRAXAS_BROWSER_SESSION_SECRET` on Preview
   - Optional: `ABRAXAS_WEBAUTHN_RP_ID=<preview-hostname>` when using a stable alias
   - Confirm `NEXT_PUBLIC_SUPABASE_URL` + service role → **`ocntwbxarpjeixdnzide`**
   - **Never** set `ABRAXAS_NATIVE_ACCOUNT_MEMORY` on Preview/Production
2. **Redeploy** the PR preview after env changes.

After deploy, `GET /api/auth/native/enabled` should return `enabled: true` and a non-secret `runtime` block (added in this PR).

## 3. Database migrations — **PASSED (staging Postgres)**

Unchanged from prior report: migrations **144** + **145** applied on **`ocntwbxarpjeixdnzide`**; SQL acceptance **`postgres_acceptance_ok`**.

## 4. HTTPS WebAuthn E2E on preview — **NOT RUN**

Playwright against latest preview with bypass header:

```bash
export NATIVE_AUTH_BASE_URL="https://abraxas-k6x7dukmv-worldlabsprotocol-uxs-projects.vercel.app"
export VERCEL_PROTECTION_BYPASS="<deployment-protection-bypass>"
export NATIVE_AUTH_SKIP_WEBSERVER=1
./node_modules/.bin/playwright test -c playwright.native-auth.config.ts
```

**Result (2026-10-17):** **5 skipped** — `enabled: false` on deployment. No passkey journey executed on HTTPS preview.

## 5. Local staging-Postgres WebAuthn (supplementary, not HTTPS preview)

Attempted dev server bound to **`ocntwbxarpjeixdnzide`** with **`memory_store: false`** (after memory-selection fix):

- HTTP negative tests: **3/3 pass**
- Passkey register: **`POST .../register/options` → 500** — Supabase **`Invalid API key`** (agent VM `SUPABASE_SERVICE_ROLE_KEY` does not match staging project)

This confirms code paths hit real PostgREST when configured, but **does not substitute** for preview HTTPS + Vercel-configured credentials.

## 6. Sandbox / Launchpad on preview — **NOT RUN**

Blocked by native auth disabled and incomplete WebAuthn session on preview.

## 7. Negative authorization

| Layer | Result |
| --- | --- |
| Postgres RPC / unique indexes | **Pass** (prior SQL acceptance) |
| Preview HTTP negatives (Playwright) | **Skipped** (native auth off on preview) |
| Local HTTP negatives (Postgres mode, invalid key) | **3 pass** on unauthenticated routes |

## 8. Code fixes in this acceptance pass (PR #730)

- **`nativeAccountMemoryStoreEnabled`**: honor explicit `false`; prefer Postgres when `NEXT_PUBLIC_SUPABASE_URL` resolves to a project ref (avoids accidental memory when `VITEST=true` in dev/agent env).
- **`GET /api/auth/native/enabled`**: non-secret `runtime` diagnostics for operators.
- **`playwright.native-auth.config.ts`**: optional `VERCEL_PROTECTION_BYPASS` → `x-vercel-protection-bypass` on all requests.
- **`tests/native-auth/staging-http-negative.spec.ts`**, **`scripts/build-730/preview-readiness-curl.sh`**.

## 9. Operator handoff (complete staging journey)

| Item | Value |
| --- | --- |
| **Deployment** | `https://abraxas-k6x7dukmv-worldlabsprotocol-uxs-projects.vercel.app` (or current PR preview URL from Vercel) |
| **Vercel action** | Set Preview env vars in §2; redeploy |
| **Access** | `vercel curl` or `VERCEL_PROTECTION_BYPASS` / Trusted Sources OIDC header for Playwright |
| **Test command** | See §4 |
| **Success** | Playwright lifecycle **2/2 pass**; `runtime.memory_store: false` on preview; sandbox enroll returns stable `partner_id` on repeat |

## 10. Merge recommendation

**Keep PR #730 in draft. Do not merge** until preview shows `enabled: true` and Playwright passkey + sandbox/Launchpad journey passes against **`ocntwbxarpjeixdnzide`** on HTTPS.

Production: leave **`ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED`** unset/false.
