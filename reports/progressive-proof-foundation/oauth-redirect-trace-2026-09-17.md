# OAuth redirect trace — Preview vs Production landing (PR #293)

**Date:** 2026-09-17  
**Preview origin:** `https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app`  
**Production origin (forbidden during audit):** `https://abraxasworld.xyz`  
**PR:** #293 — unmerged. MAIN / Production env not modified.

## Question

Google sign-in started from PR Preview but the human session ended at `https://abraxasworld.xyz/passport?sign_in_error=Failed%20to%20save%20identity`. Was that a Preview env pin, an app redirect, or a stale/disconnected browser tab?

## Trace (URLs + status codes only)

### HTTP (curl-class, header-only bypass)

| Step | Status | Origin | Path | Location |
|------|--------|--------|------|----------|
| Preview `/partner/verify` (GT browse) | 200 | `…git-cursor-pr-296681…vercel.app` | `/partner/verify?…` | — |
| Preview `/auth/zklogin/callback` | 200 | `…git-cursor-pr-296681…vercel.app` | `/auth/zklogin/callback` | — |
| Preview `/passport` | 200 | `…git-cursor-pr-296681…vercel.app` | `/passport` | — |
| Production `/partner/verify` (same query) | 200 | `abraxasworld.xyz` | `/partner/verify?…` | — |
| Production `/auth/zklogin/callback` | 200 | `abraxasworld.xyz` | `/auth/zklogin/callback` | — |

No Preview → Production **HTTP 301/302** on these paths.

### Browser automation (controlled Playwright session)

| Step | Origin | Notes |
|------|--------|-------|
| Load Preview browse verify | `…git-cursor-pr-296681…vercel.app` | CTA **Create or open my Passport** |
| Click CTA → Google OAuth | `accounts.google.com` | `redirect_uri` = `https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/auth/zklogin/callback` (exact match) |
| Load Preview callback (no token) | `…git-cursor-pr-296681…vercel.app` | Stays on Preview host |

Client OAuth uses `window.location.origin` (`lib/sui/zklogin/config.ts`). Callback failure uses same-origin `router.replace("/passport?sign_in_error=…")` (`app/auth/zklogin/callback/page.tsx`). There is **no application redirect** from Preview OAuth to `abraxasworld.xyz`.

## Root cause of Production landing

**Stale / disconnected browser session**, not Preview env or app redirect.

1. Initial Preview handoff at ~13:27Z showed Google `redirect_uri` on the Preview host (not Production).
2. Playwright interactive wait used a **30-minute** `waitForFunction` timeout; it expired while the human was still on Google (~14:08Z). The script exited; the controlled session was no longer attached.
3. When inspected after “signed in”, Desktop Chrome was on **`abraxasworld.xyz/passport`** — a **different origin** than the Preview OAuth start. Register ran on Production (same-origin to that tab), producing `Failed to save identity`.
4. DEMO Supabase logs around the walkthrough window show health checks only — **no** `sui_zklogin_identities` upsert from Preview register.

**Not the cause:** Preview `NEXT_PUBLIC_APP_URL` pin for client OAuth (client ignores pin; uses browser origin). **Not the cause:** HTTP canonical redirect from Preview host to `abraxasworld.xyz`.

## Fixes on PR #293 (Preview-only / audit tooling)

1. **`lib/preview/previewAuditOrigin.ts`** — abort if navigation or register hits Production origins.
2. **`preview-browse-e2e.ts`** — interactive handoff waits **indefinitely** (`SIGN_IN_TIMEOUT_MS=0` default) with 30s heartbeat; blocks `POST /api/auth/zklogin/register` on Production; writes `controlled-session.json`.
3. **`trace-preview-oauth-redirect.ts`** — reproducible redirect_uri + callback origin proof without human Google.

## Preview-only setting (if register still fails on Preview after retry)

Ensure Preview env does **not** set `NEXT_PUBLIC_APP_URL` or `ABRAXAS_ISSUER_URL` to `https://abraxasworld.xyz` for server-generated links. Client OAuth already uses Preview origin when the tab stays on Preview. Do **not** set `NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI` to Production for Preview audits.

## Next step (not started)

After redeploy + trace PASS + fresh Desktop session from Preview `/partner/verify`, human Google sign-in may resume. **Do not** reuse the Production passport tab from the failed run.
