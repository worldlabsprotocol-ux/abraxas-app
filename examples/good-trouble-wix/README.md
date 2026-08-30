# Good Trouble Canna — Wix Abraxas Sandbox Reference

Bounded reference for integrating Abraxas Passport as an **optional** age-verification path on [Good Trouble Canna](https://www.goodtroublecanna.com/). The traditional self-attestation path remains unchanged.

**No API key** is required for the browser redirect or `GET /api/receipts/{receipt_id}/public`.

**Wix membership is not required.** Anonymous visitors use a PKCE-style proof-of-possession flow (verifier in `sessionStorage`, challenge server-side only).

Account bootstrap, email sharing, newsletters, and partner SSO remain **in development** and are **not implemented** in this reference.

## Paths

| Path | Purpose |
|------|---------|
| `backend/constants.js` | Integration constants (`sandbox`, partner/policy ids, TTLs) |
| `backend/pkceProof.js` | Flow/verifier validation + timing-safe challenge compare |
| `backend/nonceLifecycle.js` | Flow state machine + PKCE callback workflow |
| `backend/memoryNonceStore.js` | In-memory store for tests |
| `backend/wixNonceStore.js` | wix-data adapter (Admin-only collection) |
| `backend/abraxasReceiptValidator.js` | Strict sandbox receipt validation |
| `backend/abraxasVerification.web.js` | Wix Velo web-method wrapper |
| `backend/abraxasVerification.test.js` | Reference module tests |
| `pages/AgeVerificationPopup.js` | Popup page code (`#yesButton`, `#abraxasButton`, `#abraxasStatusText`) |
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

The traditional **“Yes, I’m 21 or older”** (`#yesButton`) self-attestation remains independent.

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
- **Cleanup guidance:** schedule a backend job to delete `consumed` / expired records older than 24h

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
