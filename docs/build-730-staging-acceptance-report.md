# Build #730 — Staging acceptance report

**Date:** 2026-10-17 (final HTTPS run)  
**PR:** #730 (`cursor/build-730-native-auth-trust-5ffe`)  
**Preview URL (branch alias):** `https://abraxas-app-git-cursor-bu-f23cf3-worldlabsprotocol-uxs-projects.vercel.app`  
**Commit verified on preview:** `0d91581677373075998753861d4df20d9147caca`

## 1. Deployment & configuration — **PASS**

| Check | Result |
| --- | --- |
| Branch commit on preview | **`0d915816`** matches latest PR push |
| `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` | **`enabled: true`**, `native_auth_flag_state: enabled` |
| Memory auth store | **`memory_store: false`** |
| Staging Postgres | **`supabase_project_ref: ocntwbxarpjeixdnzide`** |
| WebAuthn RP ID | **`abraxas-app-git-cursor-bu-f23cf3-worldlabsprotocol-uxs-projects.vercel.app`** (matches HTTPS host; env RP override not required) |
| WebAuthn origin | **`https://abraxas-app-git-cursor-bu-f23cf3-worldlabsprotocol-uxs-projects.vercel.app`** |
| Production native auth | **Not enabled** (`/api/auth/native/enabled` returns legacy `auth not configured` on production URL) |

**Note:** Preview env var `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` was applied **after** an earlier deploy; a **redeploy** (commit `0d915816`) was required before `enabled: true` appeared at runtime.

## 2. HTTPS Playwright — **8/8 PASS** (real staging PostgreSQL)

Command:

```bash
export NATIVE_AUTH_BASE_URL="https://abraxas-app-git-cursor-bu-f23cf3-worldlabsprotocol-uxs-projects.vercel.app"
export VERCEL_PROTECTION_BYPASS="<deployment-protection-bypass>"
export NATIVE_AUTH_SKIP_WEBSERVER=1
./node_modules/.bin/playwright test -c playwright.native-auth.config.ts
```

| Test | Result |
| --- | --- |
| Staging E2E: passkey register, refresh, sign-out, sign-in, revoke | **Pass** |
| Staging E2E: sandbox → Launchpad, return sign-in, idempotent enroll | **Pass** |
| Staging E2E: origin mismatch + missing session rejected | **Pass** |
| HTTP negatives: unauthenticated sandbox enroll | **Pass** |
| HTTP negatives: register verify without challenge | **Pass** |
| HTTP negatives: session unauthenticated | **Pass** |
| Lifecycle: register / sign-out / sign-in same account | **Pass** |
| Lifecycle: sandbox enroll idempotent | **Pass** |

Log artifact: `/opt/cursor/artifacts/build-730-playwright-https-staging.log`

## 3. Vitest security (local memory store)

`lib/auth/nativeAccount/nativeAuth.security.test.ts` — **7/7 pass** (challenge replay, membership isolation, API gate).

## 4. Postgres migrations (prior)

Migrations **144** + **145** on **`ocntwbxarpjeixdnzide`** — applied; SQL acceptance **`postgres_acceptance_ok`**.

## 5. Legacy continuity

- Passport zkLogin route returns **401** without holder session (unchanged).
- No production native flag; partner API key paths not modified in this acceptance pass.

## 6. Merge recommendation

**Staging HTTPS journey and security HTTP checks passed** on authorized preview against **`ocntwbxarpjeixdnzide`**.

**Recommend:** human review of PR #730, CI green, then merge — **still do not enable** `ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED` on **Production** until a separate production rollout plan is approved.
