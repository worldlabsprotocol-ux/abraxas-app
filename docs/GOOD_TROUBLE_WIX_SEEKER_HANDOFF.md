# Good Trouble × Abraxas — Wix Velo Seeker handoff

This document is the **operator install guide** for connecting Good Trouble’s Wix site to the canonical Abraxas sandbox purchase flow (L0 21+ self-attestation). The reference implementation lives in `examples/good-trouble-wix/` in the Abraxas repository. **Nothing deploys to Wix automatically from this repo.**

## Root cause (Seeker demo)

1. Abraxas **Share → Return** redirects to `https://www.goodtroublecanna.com/age-verification-result?gtv=…&receipt_id=…` (Wix-hosted **Checking verification** page).
2. That page must call Wix backend `completePurchaseVerification` (PKCE + public receipt fetch + strict validation).
3. The homepage age popup only skipped **browse** or **traditional yes** state — not **purchase** receipts validated on the callback page, so users saw the sandbox yes/no gate again after a successful Abraxas return.

## Security boundary

- **L0 DOB self-attestation** is a narrow sandbox eligibility signal, not government-ID age verification.
- Callback query strings (`receipt_id`, `status`, etc.) **never** authorize access alone.
- `good_trouble_abraxas_purchase_verified` (localStorage) and `good_trouble_purchase_verified_pilot` (sessionStorage) are **UI-only** age-popup hints after server verification — **not** checkout, fulfillment, or regulated cannabis authorization.

## Files to copy into Wix

| Repo path | Wix destination |
|-----------|-----------------|
| `examples/good-trouble-wix/public/*` | Site **Public** |
| `examples/good-trouble-wix/pages/*` (Velo page modules) | Matching page code panels |
| `examples/good-trouble-wix/backend/*` | Site **Backend** |

Full inventory: `examples/good-trouble-wix/WIX_DEPLOYMENT_MANIFEST.md`.

## Required Wix pages

| Path | Role |
|------|------|
| `/age-verification-result` | Purchase callback — **Checking verification…** → backend verify → redirect home |
| Age Verification popup | `#yesButton` / `#noButton` / `#abraxasButton` — uses `shouldSkipAgeGate` |
| `/browse-verification-result` | Browse L0 callback (separate policy) |

## Backend web methods (Anyone)

- `createPurchaseVerificationStart`
- `completePurchaseVerification`
- `createBrowseVerificationStart`
- `completeBrowseVerification`

## Allowlist (Abraxas Launchpad)

Partner `good-trouble` must allow (no query):

- `https://www.goodtroublecanna.com/age-verification-result`
- `https://www.goodtroublecanna.com/browse-verification-result`

Runtime `return_url` may include `?gtv={flowId}`; Abraxas preserves it on redirect.

## Canonical sandbox verification (policy v2)

Backend `abraxasReceiptValidator.js` validates public receipts from `GET https://abraxasworld.xyz/api/receipts/{id}/public`:

- Partner `good-trouble`, policy `good-trouble-age_21_retail-v1`, policy version **2** when present
- Sandbox: `decision_context=sandbox_only`, `production_usable=false`, pilot invalidation reason
- L0 pilot: `self_attested_age_band` claim, no identity/liveness claims
- PKCE: `gtv` flow id + verifier in sessionStorage (never in URL)

Mirror: `lib/goodTrouble/sandboxPartnerVerification.ts` (Partner Kit) in the Abraxas app.

## Session state after Permit

On `verified: true` from `completePurchaseVerification`, `/age-verification-result`:

1. Marks nonce flow **consumed** (replay denied).
2. Sets session flag `good_trouble_purchase_verified_pilot`.
3. Persists **localStorage** `good_trouble_abraxas_purchase_verified` with receipt `expires_at` (from server).
4. Redirects to trusted same-origin path (usually `/`).

Age popup `shouldSkipAgeGate` reads purchase localStorage first, then browse, then traditional self-attestation.

## Acceptance tests (before Seeker demo)

Run in Abraxas repo:

```bash
npx vitest run examples/good-trouble-wix/pages/goodTroublePurchaseAgeGateSkip.integration.test.js
npx vitest run examples/good-trouble-wix/pages/goodTroublePurchaseCallbackContinue.integration.test.js
npx vitest run examples/good-trouble-wix/pages/ageGateAccessState.test.js
npx vitest run examples/good-trouble-wix/backend/abraxasVerification.test.js
```

## Physical Seeker checklist

1. Start purchase verification from Good Trouble (not Desktop Site).
2. Complete Abraxas L0 attestation → Share → **Return to Good Trouble**.
3. **Checking verification** completes without error; lands on homepage.
4. Age popup does **not** reappear until receipt TTL expires or localStorage cleared.
5. New private tab / cleared site data → age popup returns (no inherited auth).
6. Tampered callback URL without PKCE verifier → safe failure, popup remains.
