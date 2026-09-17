# Progressive proof live audit — PR #293 (2026-09-17)

**PR:** [#293](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/293) (`cursor/progressive-proof-foundation-d541` → `main`) — **unmerged**

## Deployment confirmation

| Item | Value |
|------|-------|
| Preview URL | `https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app` |
| Deployed preview SHA | **`7f5f9e1c`** (Vercel Preview deploy `2026-09-17T12:32:51Z`) |
| Prior failure SHA | `7c71ee21` (register HTTP 500 during Google sign-in) |
| DEMO Supabase ref | **`ocntwbxarpjeixdnzide`** — `service_role` INSERT/UPDATE on `sui_zklogin_identities` **granted**; `upsert_zklogin_wallet_binding_atomic` RPC present |
| MAIN Supabase | `bztwutzprwsdrtqdpymf` — **not queried or modified** |

## First live failure — root cause (SHA `7c71ee21`)

| Check | Result |
|-------|--------|
| Symptom | `POST /api/auth/zklogin/register` → **HTTP 500** after Google OAuth reached Abraxas |
| Route | `app/api/auth/zklogin/register/route.ts` — upsert `sui_zklogin_identities` after JWT verify |
| Server-side cause | Preview bound to **production/staging** Supabase (`bztwutzprwsdrtqdpymf`); migration `065` `service_role` INSERT grant exists on **DEMO only** → Postgres **42501 permission denied** → generic `Failed to save identity` |
| Wallet extension warnings | Client-only; unrelated to 500 |
| Fix (app, `8f22eab5`) | Fail-fast **503** `preview_supabase_not_demo_bound` when `VERCEL_ENV=preview` + production ref; classify upsert errors (`identity_save_permission_denied`); regression tests in `lib/auth/zkloginRegisterRoute.test.ts` |

### Required DEMO configuration (Vercel Preview — no MAIN changes)

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ocntwbxarpjeixdnzide.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | DEMO anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | DEMO service role key |
| `GOOGLE_ZKLOGIN_CLIENT_ID` | Server JWT audience |
| `NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID` | Browser OAuth client |

Redeploy preview after saving. Live probe on `7f5f9e1c` confirmed DEMO binding (`all_match_demo: true`).

## Live audit steps (resume after `8f22eab5` deploy)

| Step | Status | Notes |
|------|--------|-------|
| 1. Unit / policy / register regression tests | **PASS** | 15/15 zklogin register tests; progressive proof security tests |
| 2. Production build | **PASS** | `npm run build` on `8f22eab5` |
| 3. Preview deployment SHA | **PASS** | Latest Preview deploy **`7f5f9e1c`** (`2026-09-17T12:32:51Z`) |
| 4. DEMO Supabase grants | **PASS** | Verified via Supabase MCP on `ocntwbxarpjeixdnzide` only (prior run) |
| 5. Preview access (automation) | **PASS** | This run: `VERCEL_PROTECTION_BYPASS` present (not printed) |
| 5b. Preview Supabase binding (URL + anon + service-role) | **PASS** | All three refs = `ocntwbxarpjeixdnzide`; `all_match_demo: true`; `production_ref_detected: false` |
| 6. Google sign-in + zklogin register | **NOT RUN** | Binding gate cleared; interactive Google deferred (this run stopped after probe PASS) |
| 7. GT browse DOB-only | **NOT RUN** | Blocked at step 6 |
| 8. DEMO callback + `browse_receipt` | **NOT RUN** | Blocked at step 6 |
| 9. Live verify API `valid_for_purchase=false` | **NOT RUN** | Blocked at step 6 |
| 10. Retail denial (`good-trouble-retail-v1`) | **NOT RUN** | Blocked at step 6 |

## Reproduce (clean Chromium, no wallet extensions)

```bash
PREVIEW_URL=https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app \
DEPLOYED_SHA=8f22eab5 \
npm run walkthrough:progressive-proof:browse-e2e -- --interactive
```

- Headed Chrome on agent Desktop (`DISPLAY=:1`); script monitors `POST /api/auth/zklogin/register` status/code only (no tokens).
- Complete Vercel SSO in Desktop if bypass secret absent; then Google sign-in in same window.

## Probe (no OAuth tokens)

```bash
PREVIEW_URL=... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/probe-zklogin-register.ts
```

Expected without valid token: **400** or **401** (invalid token). If still on MAIN: **503** `preview_supabase_not_demo_bound`. **Not 500**.
