# Good Trouble Canna — Wix Abraxas Sandbox Reference

Bounded reference for integrating Abraxas Passport as an **optional** age-verification path on [Good Trouble Canna](https://www.goodtroublecanna.com/). The traditional self-attestation path remains unchanged.

**No API key** is required for the browser redirect or `GET /api/receipts/{receipt_id}/public`.

**Wix membership is not required.** Anonymous visitors use a PKCE-style proof-of-possession flow (verifier in `sessionStorage`, challenge server-side only).

Account bootstrap, email sharing, newsletters, and partner SSO remain **in development** and are **not implemented** in this reference.

## Paths

| Path | Purpose |
|------|---------|
| `backend/constants.js` | Integration constants (`sandbox`, partner/policy ids, TTLs) |
| `backend/sha256Adapter.js` | Backend-only SHA-256 via `node:crypto` (auto-wired; no init call) |
| `backend/pkceProof.js` | Flow/verifier validation + timing-safe challenge compare |
| `backend/nonceLifecycle.js` | Flow state machine + PKCE callback workflow |
| `backend/memoryNonceStore.js` | In-memory store for tests |
| `backend/wixNonceStore.js` | wix-data adapter (Admin-only collection) |
| `backend/abraxasReceiptValidator.js` | Strict sandbox receipt validation |
| `backend/abraxasVerification.web.js` | Wix Velo web-method wrapper |
| `backend/abraxasVerification.test.js` | Reference module tests |
| `pages/ageVerificationPopupLogic.js` | CAPTCHA gating + traditional self-attestation logic → Wix `src/public/ageVerificationPopupLogic.js` |
| `pages/AgeVerificationPopup.js` | Popup page code → Age Verification popup panel; imports `public/ageVerificationPopupLogic` |
| `pages/AgeVerificationResult.js` | Callback page (`/age-verification-result`) |
| `../docs/GOOD_TROUBLE_WIX_SANDBOX.md` | Operator checklist + UX copy |

## Integration constants

| Constant | Value |
|----------|-------|
| `mode` | `sandbox` (strict) |
| `partner_id` | `good-trouble-cannabis` |
| `policy_id` | `good-trouble-retail-v1` |
| Entry | `https://abraxasworld.xyz/partner/verify` |
| Callback (query-free allowlist entry) | `https://www.goodtroublecanna.com/age-verification-result` |
| Flow query param | `gtv` = opaque `gtf_{64hex}` flow identifier (not the verifier) |

## PKCE proof-of-possession trust model

| Principle | Implementation |
|-----------|----------------|
| No anonymous visitor ID | No `visitorId` — possession of verifier proves same browser context |
| Verifier never in URL | Callback URL carries `gtv` flow ID + Abraxas frozen params only |
| Verifier storage | `sessionStorage` under `abraxas_gt_verifier_{flowId}` |
| Server storage | `verifierChallenge` = SHA-256(verifier), flow metadata, lifecycle state |
| Copied callback URL | Fails — verifier missing in different browser/tab |
| localStorage | Not used as authoritative verified state |
| Wix membership | **Not required** |

The traditional **“Yes, I’m 21 or older”** (`#yesButton`) self-attestation remains independent and **never requires CAPTCHA**. Only **“Verify with Abraxas Passport”** (`#abraxasButton`) is gated behind `#abraxasCaptcha`. The **“No, I’m not”** exit button (`#noButton`) is always enabled. CAPTCHA is a **human check for Abraxas start only** — not age, identity, or eligibility verification. Traditional Yes writes a **30-day** `localStorage` expiry (`good_trouble_age_self_attested`) — self-attestation only, not Abraxas authority.

## Web method permissions

Configure in Wix Editor → Web Methods:

| Method | Permission | Notes |
|--------|------------|-------|
| `createAbraxasVerificationStart` | **Anyone** | Returns `verifyUrl`, `flowId`, `verifier` over TLS |
| `completeAbraxasVerification` | **Anyone** | Requires `receiptId`, `flowId`, `verifier` |

No web method exposes collection CRUD. Only backend code uses `wix-data` on `AbraxasVerificationNonces`.

### Abuse controls

- Flow TTL: 10 minutes (`FLOW_TTL_MS`)
- Claim TTL during validation: 2 minutes
- Max receipt-fetch attempts per flow: 3 (transient failures release to `pending`; never grant verification on transient failure)
- Max outstanding pending flows: 100 (soft cap)
- Strict `gtf_` flow ID, 64-hex verifier, and `dr_` receipt ID formats
- Bounded input lengths; generic error codes (no PII in responses)
- **Cleanup guidance:** schedule a backend job to delete `consumed` / expired records older than 24h (see **Scheduled purge** below)

## Wix runtime files (`src/backend`)

Copy these **10** backend modules into Wix **Backend** (`src/backend`). Do **not** copy test-only files (`memoryNonceStore.js`, `*.test.js`).

| File | Purpose |
|------|---------|
| `constants.js` | Integration constants, TTLs, collection name |
| `sha256Adapter.js` | Auto-wired SHA-256 for PKCE challenges (`node:crypto`) |
| `pkceProof.js` | Flow/verifier validation + timing-safe compare |
| `nonceLifecycle.js` | Flow state machine + PKCE callback workflow |
| `flowCapacity.js` | Purge-before-count + post-insert rollback |
| `captchaGate.js` | Wix reCAPTCHA authorization wrapper |
| `wixNonceStore.js` | `wix-data` adapter (Admin-only collection) |
| `abraxasReceiptValidator.js` | Strict sandbox receipt validation |
| `abraxasVerificationService.js` | CAPTCHA + capacity + PKCE lifecycle |
| `abraxasVerification.web.js` | Wix Velo `webMethod` exports |

Also copy `pages/ageVerificationPopupLogic.js` to `src/public/ageVerificationPopupLogic.js`, paste `pages/AgeVerificationPopup.js` into the Age Verification popup page code panel, and copy `pages/AgeVerificationResult.js` into the `/age-verification-result` page code panel. See **Wix page deployment** below.

**SHA-256:** `sha256Adapter.js` uses `node:crypto` `createHash("sha256")` — the same runtime API already used by `pkceProof.js`. No manual `configureAbraxasHashFn` call is required for production; hashing is wired automatically into start and completion flows.

## Wix page deployment (`src/public` + popup page)

| Repository file | Wix destination |
|-----------------|-----------------|
| `pages/ageVerificationPopupLogic.js` | `src/public/ageVerificationPopupLogic.js` |
| `pages/AgeVerificationPopup.js` | Age Verification popup page code panel |
| `pages/AgeVerificationResult.js` | `/age-verification-result` page code panel |

`AgeVerificationPopup.js` must import the logic module with the Wix Public-module path:

```javascript
import { createPopupController, ABRAXAS_LABEL } from "public/ageVerificationPopupLogic";
```

Required popup element IDs (exact): `#yesButton`, `#noButton`, `#abraxasButton`, `#abraxasCaptcha`, `#abraxasStatusText`.

## Scheduled purge (`purgeStale`) — operator requirement

`flowCapacity.js` calls `store.purgeStale()` before every capacity check. `wixNonceStore.purgeStale` removes:

- flows past `expiresAt` (expired pending/validating), and
- `consumed` flows with `consumedAt` older than 24 hours (`CONSUMED_FLOW_RETENTION_MS`).

Each purge pass is capped at 100 rows per category per call. Under sustained traffic, **relying only on start-time purge is insufficient** — stale rows can accumulate between starts.

**Operator action (approval required before deploy):** schedule a Wix backend job (e.g. daily) that imports `createWixNonceStore` and calls `purgeStale()`. This reference does **not** ship or deploy that scheduled job. Do not enable without explicit operator sign-off.

Monitor `rate_limited` and captcha error rates; elevated rates may indicate missing scheduled cleanup.

## CMS collection: AbraxasVerificationNonces

| Permission | Site visitors | Site members | Admin |
|------------|---------------|--------------|-------|
| Read | ✗ | ✗ | ✓ |
| Create | ✗ | ✗ | ✓ |
| Update | ✗ | ✗ | ✓ |
| Delete | ✗ | ✗ | ✓ |

Stored fields: `flowId`, `verifierChallenge`, `state`, `createdAt`, `expiresAt`, `claimExpiresAt`, `claimToken`, `validationAttempts`, `consumedAt`, `correlationId`.

**Never store or log:** raw verifier, receipt JSON, DOB, document data, callback query strings, API keys, or credentials.

## Flow state machine

| From | Event | To | Notes |
|------|-------|-----|-------|
| `pending` | PKCE proof + atomic claim | `validating` | Sets `claimExpiresAt` (2 min) |
| `validating` | Receipt validates | `consumed` | Mark consumed **before** returning `verified: true` |
| `validating` | Receipt invalid (sandbox rules) | `consumed` | Fail closed — no verification granted |
| `validating` | Transient receipt-fetch failure | `pending` | Bounded retry (`MAX_VALIDATION_ATTEMPTS`); never returns `verified: true` |
| `validating` | Transient failures exhausted | `consumed` | No verification granted |
| `pending` / `validating` | Duplicate concurrent callback | — | At most one claim succeeds |
| `consumed` | Any callback | — | Rejected (`flow_already_consumed`) |
| any | Wrong/missing verifier | — | Rejected (`verifier_mismatch` / `missing_verifier`) |
| any | Past `expiresAt` | — | Rejected (`flow_expired`) |

## Security rules

1. Generate **32-byte** random verifier + opaque `gtf_` flow ID in Wix backend only.
2. Store **SHA-256(verifier)** challenge + lifecycle fields in `wix-data`.
3. Append **flow ID** (not verifier) to `return_url` as `?gtv=…` before encoding into Partner Flow entry URL.
4. Return raw verifier to frontend over TLS web method → `sessionStorage` before navigation.
5. On callback: retrieve verifier from `sessionStorage`, call `completeAbraxasVerification(receiptId, flowId, verifier)`.
6. Never log query params, receipt JSON, verifier, challenge, or credentials.
7. Never trust `status=approved` query param or `localStorage` as authoritative Abraxas result.

## Abraxas code alignment

Receipt validation mirrors `lib/partner/verifyPartnerFlowReceipt.ts` with `mode: "sandbox"`.

Age eligibility is enforced when `product_eligibility=over_21` is **explicitly published** in policy `required_claims` (migration 076 draft → operator publish v2). Active v1 has no DB age gate. Copy/paste operator SQL from GitHub raw files — never use `\i` in Supabase SQL Editor. See `docs/GOOD_TROUBLE_WIX_SANDBOX.md` operator section.
