# PR #293 Progressive-Proof Audit (2026-09-16)

| Field | Value |
|-------|-------|
| **PR** | https://github.com/worldlabsprotocol-ux/abraxas-app/pull/293 |
| **Preview** | https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app |
| **Deployed SHA** | `baee4cdf` (Preview deployment 2026-09-16T21:44:25Z) |
| **PR head** | `baee4cdf` on `cursor/progressive-proof-foundation-d541` |
| **DEMO Supabase** | `ocntwbxarpjeixdnzide` |
| **MAIN Supabase** | Not queried or modified (`bztwutzprwsdrtqdpymf`) |

## DEMO binding

`good-trouble-cannabis.allowed_return_urls` on DEMO includes:

- `https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/demo/reference-partner/browse-callback`

(Legacy `goodtroublecanna.com` entries remain but walkthrough does not use them.)

## CI / build

| Check | Result |
|-------|--------|
| CI on `baee4cdf` | PASS (build, audit-hash-parity, migration-076/081-parity, Vercel) |
| `npm run build` (audit run) | PASS |

## Journey steps

| # | Step | Status | Evidence |
|---|------|--------|----------|
| 1 | Google zkLogin opens Passport without KYC at sign-in | **BLOCKED** | Preview routes return `302 → vercel.com/sso-api` without `VERCEL_PROTECTION_BYPASS`. Cannot reach `/passport` or `/partner/verify` in this runtime. Prior authorized run (user session, ~19:54 UTC) captured account-only copy — see `/opt/cursor/artifacts/screenshots/pr293-validation/passport-signin-*.png`. |
| 2 | GT browse = DOB self-attestation only | **BLOCKED** | Same deployment-protection block. Prior authorized screenshots: `gt-browse-verify-desktop-desktop.png`, `gt-browse-verify-mobile-mobile.png`. |
| 3 | Return to DEMO callback with `browse_receipt` | **BLOCKED** | Requires step 1–2 + live session. Callback route exists at `/demo/reference-partner/browse-callback` (`b9a12655`). |
| 4 | Server verify browse receipt (`valid_for_purchase=false`) | **PASS** | `app/api/age-assurance/browse-receipt/verify/route.test.ts` (8/8): browse policy → `verified=true`, `valid_for_purchase=false`, `assurance_level=L0`. |
| 5 | Same receipt cannot satisfy `good-trouble-retail-v1` | **PASS** | Route test: retail policy → `verified=false`, `code=context_mismatch`. Policy engine: browse L0 → retail `decision=denied` (missing identity_verified, liveness_passed, wallet_binding_confirmed, residency_country). |
| 5b | Expired / revoked / wrong-policy / missing ledger | **PASS** | Route tests: `attestation_inactive`, `context_mismatch`, `signature_invalid`. Policy tests: expired/revoked/wrong-policy fail closed. `evaluate.security.test.ts`: `missingClaims: []` spoof fails closed. |
| 6 | Desktop + mobile screenshots (redacted) | **PARTIAL** | **Blocked-state (this run):** `/opt/cursor/artifacts/screenshots/pr293-audit/blocked-desktop-vercel-sso.png`, `blocked-mobile-vercel-sso.png` — Vercel login wall, no app tokens. **App UI (prior authorized bypass run):** `/opt/cursor/artifacts/screenshots/pr293-validation/` — browse, retail boundary, passport sign-in. |

## Automated gates (this run)

| Gate | Result |
|------|--------|
| Progressive proof + security (`lib/progressiveProof/`) | PASS (45+ tests) |
| Tiered age assurance / policy boundaries | PASS |
| Browse journey integration | PASS |
| Browse receipt verify route regressions | PASS (8 new) |
| Preview API + browser walkthrough | BLOCKED (no bypass secret) |

## First real failure / blocker

**`VERCEL_PROTECTION_BYPASS` not configured in cloud agent runtime.** All preview HTTP and Playwright probes redirect to Vercel SSO (`vercel.com/login` / `sso-api`). Bypass must be sent as header `x-vercel-protection-bypass` only (never in URLs).

## Changes made (this audit)

- Added `app/api/age-assurance/browse-receipt/verify/route.test.ts` — server-side receipt + retail denial + fail-closed regressions.
- Added `scripts/progressive-proof/preview-audit.ts` + `npm run audit:progressive-proof:preview`.
- Captured blocked-state desktop/mobile screenshots for evidence.

## Remaining human / environment action

1. **Environment:** Add `VERCEL_PROTECTION_BYPASS` to the cloud agent environment (Vercel → Project Settings → Deployment Protection → Protection Bypass for Automation). Do not paste the value in chat.
2. **Re-run audit:** `PREVIEW_URL=... DEPLOYED_SHA=... npm run audit:progressive-proof:preview` then `npm run walkthrough:progressive-proof:browse-e2e`.
3. **Google OAuth (in agent Playwright session):** Open browse verify with DEMO callback return URL, complete **Continue with Google**, reply **signed in** — agent resumes `--resume` in the same `auth-state.json` session.

**Sign-in URL (when bypass is configured):**

https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-browse-v1&purpose=browse&return_url=https%3A%2F%2Fabraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app%2Fdemo%2Freference-partner%2Fbrowse-callback

PR #293 remains **unmerged**. MAIN Supabase untouched.
