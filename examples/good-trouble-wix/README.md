# Good Trouble Canna — Wix Abraxas Sandbox Reference

Bounded reference for integrating Abraxas Passport as an **optional** age-verification path on [Good Trouble Canna](https://www.goodtroublecanna.com/). The traditional self-attestation path remains unchanged.

**No API key** is required for the browser redirect or `GET /api/receipts/{receipt_id}/public`.

## Paths

| Path | Purpose |
|------|---------|
| `backend/constants.js` | Integration constants (`sandbox`, partner/policy ids) |
| `backend/sessionBinding.js` | Trusted Wix Members backend session binding |
| `backend/nonceLifecycle.js` | Nonce state machine + callback workflow |
| `backend/memoryNonceStore.js` | In-memory store for tests |
| `backend/wixNonceStore.js` | wix-data adapter (backend-only collection) |
| `backend/abraxasReceiptValidator.js` | Strict sandbox receipt validation |
| `backend/abraxasVerification.web.js` | Wix Velo web-method wrapper |
| `backend/abraxasVerification.test.js` | Reference module tests |
| `../docs/GOOD_TROUBLE_WIX_SANDBOX.md` | Operator checklist + UX copy |

## Integration constants

| Constant | Value |
|----------|-------|
| `mode` | `sandbox` (strict) |
| `partner_id` | `good-trouble-cannabis` |
| `policy_id` | `good-trouble-retail-v1` |
| Entry | `https://abraxasworld.xyz/partner/verify` |
| Callback (query-free allowlist entry) | `https://www.goodtroublecanna.com/age-verification-result` |
| Nonce query param | `gtv` (not one of Abraxas frozen callback params) |

## Wix trust / session model

| Session type | Backend binding | Abraxas path |
|--------------|-----------------|--------------|
| **Logged-in Wix member** | `member:{currentMember.id}` from `wix-members-backend` | Supported |
| **Anonymous visitor** | No trustworthy server-side identity in Wix Velo | **Blocked** — `anonymous_session_unsupported` |

**Never** accept a frontend-supplied `visitorId`, query parameter, or `localStorage` value as the session binding. The optional Abraxas path requires Wix Members login before starting verification.

The traditional **“Yes, I’m 21 or older”** self-attestation button remains independent and unchanged.

## Nonce collection permissions

`AbraxasVerificationNonces` must be **backend-only**:

| Role | Read | Create | Update | Delete |
|------|------|--------|--------|--------|
| Site visitors | ✗ | ✗ | ✗ | ✗ |
| Site members | ✗ | ✗ | ✗ | ✗ |
| Backend web methods | ✓ | ✓ | ✓ | ✓ |

Stored fields only: `nonceHash`, `sessionBinding`, `state`, `createdAt`, `expiresAt`, `claimExpiresAt`, `claimToken`, `validationAttempts`, `consumedAt`, `correlationId`.

**Never store or log:** raw nonce (except short-lived encoded `return_url`), receipt JSON, DOB, document data, callback query strings, API keys, or credentials.

## Nonce state machine

| From | Event | To | Notes |
|------|-------|-----|-------|
| `pending` | Atomic claim (matching session, not expired) | `validating` | Sets `claimExpiresAt` (2 min) |
| `validating` | Receipt validates | `consumed` | Mark consumed **before** returning `verified: true` |
| `validating` | Receipt invalid (sandbox rules) | `consumed` | Fail closed — no verification granted |
| `validating` | Transient receipt-fetch failure | `pending` | Bounded retry (`MAX_VALIDATION_ATTEMPTS`) |
| `validating` | Transient failures exhausted | `consumed` | No verification granted |
| `pending` / `validating` | Duplicate concurrent callback | — | At most one claim succeeds |
| `consumed` | Any callback | — | Rejected (`nonce_already_consumed`) |
| any | Session mismatch | — | Rejected (`session_mismatch`) |
| any | Past `expiresAt` | — | Rejected (`nonce_expired`) |

## Security rules

1. Generate a **32-byte** random nonce in Wix backend only.
2. Store **SHA-256 hash** + trusted `sessionBinding` + lifecycle fields in `wix-data`.
3. Append raw nonce to `return_url` as `?gtv=…` before encoding into Partner Flow entry URL.
4. On callback: atomically claim nonce, fetch and validate receipt server-side, then consume.
5. Never log query params, receipt JSON, nonce, or credentials.
6. Never trust browser-only validation or `localStorage` as the authoritative Abraxas result.

## Abraxas code alignment

Receipt validation mirrors `lib/partner/verifyPartnerFlowReceipt.ts` with `mode: "sandbox"`.

Age eligibility is enforced server-side via `product_eligibility=over_21` claim — see migration `075_good_trouble_retail_age_eligibility_claim.sql` (not applied by this reference).
