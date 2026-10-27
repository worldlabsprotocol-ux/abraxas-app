# Build 863 — Restore authoritative session continuity

## Root cause (confirmed)

| Layer | Preview (pre-fix) | Demo / Production |
| --- | --- | --- |
| Sandbox provision | Works (Supabase + service role on Preview) | Works |
| Partner API key auth | Works (401 invalid / auth path) | Works |
| Console session JWT | **503** — `issuePartnerConsoleSessionToken()` returned `null` | Works |

**Cause:** `ABRAXAS_BROWSER_SESSION_SECRET` was scoped to **Production only** on Vercel (`abraxas-app`). Partner console cookies are domain-separated in `partnerConsoleSessionSecret.ts` and do **not** use `ABRAXAS_SIGNING_KEY`.

This is **missing Preview environment configuration**, not a protocol or Launchpad auth redesign. Invalid keys still fail closed with 401; only minting the HttpOnly session JWT was unavailable.

## Remediation applied

1. **Vercel Preview env:** Added **distinct** `ABRAXAS_BROWSER_SESSION_SECRET` for **Preview** target only (Build 863; not copied from Production).
2. **Code:** Session route returns `launchpad_console_session_unconfigured` when auth succeeded but the browser session secret is absent (vs generic `launchpad_not_configured`).
3. **UX:** Integration Studio maps the new code to operator-safe recovery copy.

## Verification (Build 863 — commit `252dfe63`, Preview redeploy)

| Check | Result |
| --- | --- |
| Session attach after sandbox create | **200** on Preview alias `abraxas-app-git-cursor-bu-0e7c60-…` |
| Playwright desktop journey | **Pass** (`integration-studio-provisioned-e2e.spec.ts`) |
| Playwright mobile viewport | **Pass** (`playwright.mobile-staging.config.ts`) |
| Local adversarial (546 + sandbox contract) | **Pass** |
| Sovereign trust execution + independent verifier | **Pass** with `ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1` |

**Remaining for founder gate on Demo/production host:** holder-complete live receipt retrieved from the Studio harness and verified via public `/verify` without trusting Studio local state (Preview harness proves session + request path; not a substitute for Demo issuance parity after merge).

## Related docs

- `docs/INTEGRATION_STUDIO_PREVIEW_STAGING.md`
- `docs/LAUNCHPAD_DEPLOYMENT.md`
