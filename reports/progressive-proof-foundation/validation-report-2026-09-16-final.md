# PR #293 Validation Report (final pass)

**SHA:** pending push  
**Preview:** https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app

## 307 redirect investigation (`preview-validation-2026-09-16T19-54-29-091Z.md`)

| Probe | Without bypass | With bypass (prior run) |
|-------|----------------|------------------------|
| `/api/health` | `302 → vercel.com/sso-api` (Vercel SSO) | `307` (not SSO — app routes loaded in browser) |
| `/api/protocol/status` | `302 → vercel.com/sso-api` | Should return `200` JSON when bypass headers are set |

**Conclusion:** `/api/health` is not a deployed route. The failing `307` is not the partner app routing users to KYC — it is either a same-origin edge redirect or a non-existent path probe. The harness now:

- Traces and classifies redirects (Vercel SSO vs same-origin)
- Uses `/api/protocol/status` for reachability
- Seeds bypass cookies via `vercelBypassSeedUrl()` before browser navigation

## Passport sign-in copy assertion fix

**Bug:** PASS was recorded with detail `document prompt on load` when marketing copy contained the word "verification" (e.g. "Reusable private verification").

**Fix:** `lib/preview/passportSignInAssertions.ts` — PASS detail is now `account-only copy visible; no document/KYC UI on load`. Checks file inputs, Veriff, and identity capture — not generic verification marketing text.

## Automated gates

| Gate | Result |
|------|--------|
| `npm run build` | PASS |
| Full test suite | PASS (3044+) |
| Policy fail-closed (browse/retail/Stocklana/expired/revoked/wrong-policy) | PASS |
| `evaluate.security.test.ts` (missingClaims: [] spoof) | PASS |

## Preview flows (requires `VERCEL_PROTECTION_BYPASS`)

| Flow | Automated | Notes |
|------|-----------|-------|
| Google sign-in without KYC at account creation | UI partial | Signed-out `/passport` — no file upload / ID capture UI |
| Google OAuth completion | **Manual** | Requires human Google account |
| GT browse lower-assurance receipt | UI partial + policy | Browse verify copy; self-attest API needs session |
| GT retail stronger evidence | UI partial | "Signing in is not age verification" on retail verify |
| Browse receipt cannot satisfy retail/Stocklana | PASS (policy engine) | |

## First incomplete step (this environment)

**`VERCEL_PROTECTION_BYPASS` / `VERCEL_AUTOMATION_BYPASS_SECRET` not available in agent shell** — API and browser preview checks cannot run here. Policy and security regressions pass locally.

Rerun:

```bash
PREVIEW_URL=https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app \
VERCEL_PROTECTION_BYPASS=<secret> \
DEPLOYED_SHA=<sha> \
npm run walkthrough:progressive-proof:preview
```
