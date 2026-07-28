# Authentication Root-Cause Report

**Date:** 2026-07-28  
**Scope:** zkLogin / Google OAuth / Passport flow production blockers  
**Branch:** `cursor/auth-session-root-cause-d541`

---

## Executive summary

The reported symptoms (two-click sign-in, “session expired”, Step 4 re-auth prompts, wallet bind failures) are **not independent UI bugs**. They stem from **fragmented auth state** across four layers that were not kept in sync:

| Layer | Storage | Used for |
|-------|---------|----------|
| zkLogin user session | `localStorage` (`abraxas_zklogin_session_v1`) | Client UI: “signed in” |
| Signing material | `localStorage` (ephemeral key + signing session) | Wallet bind, on-chain txs |
| OAuth in-flight | `sessionStorage` (pending key + login lock) | OAuth round-trip |
| Browser session | `httpOnly` cookie (`abraxas_browser_session`) | Server APIs (capture, upload) |

When any layer succeeded while another failed—or when **multiple React auth providers** disagreed—the UI showed contradictory states and generic “session expired” copy.

---

## Symptom → root cause map

### 1. Google Sign In requires two clicks

| Root cause | Mechanism |
|------------|-----------|
| **`loginInFlight` lock not cleared on OAuth failure** | First click sets `abraxas_zklogin_login_in_flight` in `sessionStorage`. If callback fails (pending lost, register error), lock stayed for **90 seconds**. Second click within 90s returned “Sign-in already in progress.” Third click worked → felt like “two taps.” |
| **Component-level `inFlightRef` in `useGoogleSignIn`** | Combined with above; first click appeared to do nothing when blocked. |
| **Nav-only sign-in on Passport** | `PassportDashboard` directs users to top-right Sign in; not a bug but amplifies “first click didn’t work” perception. |

**Fix:** Clear `loginInFlight` on all callback/register failure paths; call `clearStaleLoginInFlight()` before each sign-in attempt.

### 2. “Sign in incomplete” / “Login session expired”

| Root cause | Mechanism |
|------------|-----------|
| **Pending OAuth state lost from `sessionStorage`** | `completeGoogleZkLogin` requires `abraxas_zklogin_pending_v1` (ephemeral key + randomness). Private browsing, ITP, or storage eviction during Google redirect → pending missing → generic “Login session expired.” |
| **Misleading copy in Abraxas Verify Step 4** | `AbraxasIdentityCapture` showed “Your session expired” when React context said unauthenticated—even if `localStorage` still had a valid session (nested provider or hydration lag). |

**Fix:** Actionable error when pending is missing (explain storage/redirect). Step 4 now falls back to `loadUserSession()` and surfaces real errors (not signed in vs cookie mint failed).

### 3. Existing users redirected through account creation

| Root cause | Mechanism |
|------------|-----------|
| **`authLoading` flash** | Nested `SuiAuthProvider` instances reset `isLoading=true` and `session=null` on mount. Passport briefly showed “Sign in to your Passport” for returning users. |
| **Email not hydrated** | OAuth scope was `openid` only in an earlier deploy; email missing → verification gates failed. (Fixed in PR #75: `openid email` + `/api/auth/zklogin/me` backfill.) |

**Fix:** Single root `SuiAuthProvider` in `AppProviders`; sync init from `localStorage` on client; `refreshSession()` after OAuth callback.

### 4. Step 4 asks for Google Sign In when already signed in

| Root cause | Mechanism |
|------------|-----------|
| **Nested `SuiAuthProvider` on `/passport?view=verify`** | `VerifyClient` wrapped its own provider → child tree saw `isAuthenticated=false` while nav (root provider) showed signed in. |
| **Client authenticated, server cookie missing** | Capture API uses `requireBrowserSession()` (httpOnly cookie). Cookie mint was fire-and-forget; race on submit → 401 interpreted as “sign in again.” |

**Fix:** Removed nested providers. `ensureBrowserSession()` awaited before capture submit; provider re-mints cookie when session loads.

### 5. Wallet binding and authenticated features fail

| Root cause | Mechanism |
|------------|-----------|
| **In-memory challenge store on serverless** | `/api/wallet/binding/challenge` used a process-local `Map`. Challenge created on Vercel instance A was invisible to instance B on confirm → “Invalid or expired challenge” → retry feels like broken auth. |
| **Missing ephemeral signing key** | Bind flow needs `getEphemeralSecretKey()` from OAuth pending flow. If pending was lost at login, user is “signed in” in UI but cannot sign. |
| **L3 bind ≠ zkLogin auto-bind** | Register upserts `binding_method: "zklogin"` but `walletBindingL3` only counts `signed_challenge`. Users may think bind is broken when tier logic expects L3 signature. |

**Fix:** Sui wallet challenges now persisted in Supabase `wallet_binding_challenges` (same table as EVM SIWE). Clear errors when signing key missing.

---

## Architecture: single source of truth

```
App layout
  └── AppProviders
        └── SuiAuthProvider  ← ONLY mount point
              ├── reads localStorage session on init
              ├── exposes isAuthenticated / canSignTransactions
              ├── mints httpOnly cookie via ensureBrowserSession()
              └── dispatches abraxas:zklogin-session on changes
```

**Do not** wrap subtrees in additional `SuiAuthProvider` instances.

---

## Instrumentation

Set `NEXT_PUBLIC_ABRAXAS_AUTH_DEBUG=1` in Vercel (or use dev build) to enable console logs prefixed with `[abraxas-auth]`:

| Event | When |
|-------|------|
| `oauth_start` | User taps Sign in |
| `oauth_redirect` | Browser navigating to Google |
| `oauth_callback` | Callback page loads |
| `oauth_callback_error` | Callback failed |
| `zklogin_complete` | Session saved after register |
| `zklogin_complete_error` | Register/derivation failed |
| `session_saved` / `session_loaded` / `session_cleared` | localStorage lifecycle |
| `browser_session_mint` / `browser_session_mint_failed` | httpOnly cookie |
| `login_in_flight_set` / `login_in_flight_cleared` | Duplicate-click guard |
| `auth_provider_ready` / `auth_provider_authenticated` | React context hydrated |
| `wallet_signing_ready` / `wallet_signing_missing` | Ephemeral + signing session |

No tokens, secrets, or full addresses are logged (addresses truncated).

---

## Code changes in this branch

1. **`lib/sui/zklogin/authDebug.ts`** — debug logging
2. **`lib/auth/ensureBrowserSession.ts`** — shared cookie mint + error handling
3. **`SuiAuthProvider`** — sync localStorage init, `refreshSession()`, sign-out clears cookie, single provider contract
4. **`completeLogin.ts` / callback page`** — clear locks on failure, await cookie, better errors
5. **`useGoogleSignIn`** — stale lock clear before attempt
6. **Removed nested `SuiAuthProvider`** from home, verify tab, account, Cielo, case study, docs
7. **`AbraxasIdentityCapture`** — localStorage fallback, real error messages, awaited browser session
8. **`lib/walletBinding/suiChallenge.ts`** — Supabase-backed Sui bind challenges
9. **`DELETE /api/auth/browser-session`** — sign-out cookie cleanup

---

## Validation checklist (human)

1. Hard refresh → Sign in **once** → lands on `/passport?signed_in=1` with nav showing account
2. Complete Abraxas Verify Steps 1–4 **without** being asked to sign in again
3. Wallet bind completes on first attempt (no “invalid challenge” on retry)
4. Sign out → cookie cleared → APIs return 401 until sign-in again
5. With `NEXT_PUBLIC_ABRAXAS_AUTH_DEBUG=1`, confirm log sequence in DevTools Console

---

## Remaining risks (not in this PR)

- **Sui epoch expiry:** `maxEpoch` is current epoch + 10; on-chain txs fail after ~10 epochs while UI may still show signed in. Consider epoch check in `canSignZkLoginTransactions()`.
- **Mobile Safari ITP:** May still evict `sessionStorage` during OAuth; users should avoid private mode.
- **L3 vs zkLogin bind semantics:** Product may want zkLogin auto-bind to satisfy Tier 2 without extra signature step.
