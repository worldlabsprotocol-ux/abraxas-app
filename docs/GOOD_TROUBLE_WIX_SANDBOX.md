# Good Trouble Canna — Wix Abraxas Sandbox

Planning reference for optional Abraxas Passport age verification on Wix. **Do not treat as live until operator configuration is confirmed.**

Account bootstrap, email sharing, newsletters, and partner SSO remain **in development** and are **not implemented** in this reference.

## Experience

| Path | Behavior |
|------|----------|
| **Primary** | “Yes, I’m 21 or older” (`#yesButton`) — existing Wix self-attestation only |
| **Secondary** | “Verify with Abraxas Passport” (`#abraxasButton`) — PKCE flow, no Wix membership required |

Supporting copy (`#abraxasStatusText`):

> Optional verification for faster future setup. Your ID photos and date of birth are not shared with Good Trouble.

## Abraxas constants

```
partner_id=good-trouble-cannabis
policy_id=good-trouble-retail-v1
entry=https://abraxasworld.xyz/partner/verify
callback=https://www.goodtroublecanna.com/age-verification-result
```

Allowlist stores the callback **without** query string. Runtime `return_url` may include `?gtv={flowId}`; Abraxas preserves it on redirect. The **verifier never appears in any URL**.

## PKCE proof-of-possession (anonymous-compatible)

```mermaid
sequenceDiagram
  participant V as Visitor browser
  participant B as Wix backend
  participant A as Abraxas

  V->>B: createAbraxasVerificationStart(captchaToken)
  B->>B: wix-captcha-backend.authorize(token)
  B->>B: purge stale + capacity check
  B->>B: flowId + verifier + SHA-256 challenge (pending)
  B->>V: verifyUrl + flowId + verifier (TLS)
  V->>V: sessionStorage[abraxas_gt_verifier_{flowId}] = verifier
  V->>A: Navigate to /partner/verify?return_url=...%3Fgtv%3DflowId
  A->>V: .../age-verification-result?gtv=flowId&receipt_id=...
  V->>V: Read verifier from sessionStorage
  V->>B: completeAbraxasVerification(receiptId, flowId, verifier)
  B->>B: PKCE verify → claim pending→validating
  B->>A: GET /api/receipts/{id}/public (no API key)
  B->>B: Strict sandbox validate → consumed
  B->>V: verified boolean
  V->>V: Delete verifier; set bounded pilot verified flag
```

| Threat | Mitigation |
|--------|------------|
| Copied callback URL | Fails — verifier not in URL; different tab/browser has no sessionStorage entry |
| Global pending-flow exhaustion | Mitigated — purge stale rows before count; CAPTCHA required per start; post-insert rollback; `#yesButton` unaffected |

## Anti-automation and capacity (sandbox)

Each `createAbraxasVerificationStart` call requires a **Wix reCAPTCHA token** (`#abraxasCaptcha`) verified server-side via `wix-captcha-backend.authorize()`. This prevents unauthenticated scripts from exhausting the shared pending-flow cap without solving CAPTCHAs.

| Control | Behavior |
|---------|----------|
| Pending cap | 100 site-wide **non-expired pending** flows (after purge) |
| Purge before count | Expired flows + consumed flows older than 24h removed before capacity check |
| Post-insert rollback | If concurrent starts exceed cap, the just-inserted row is deleted |
| Error surface | Generic `{ error: "rate_limited" }` — no counts leaked |
| Traditional path | `#yesButton` self-attestation is independent — never blocked by Abraxas capacity |

**Operator monitoring:** schedule a daily backend job calling `purgeStale` (or equivalent CMS cleanup) and alert on elevated `rate_limited` / `captcha_invalid` rates. No automated cleanup ships in this reference.

## Pilot session flag trust boundary

`good_trouble_age_verified_pilot` (`PILOT_VERIFIED_SESSION_FLAG`) is written to **sessionStorage only** after `completeAbraxasVerification` returns `verified: true`.

| Property | Value |
|----------|-------|
| Authoritative proof | Consumed backend flow + validated sandbox receipt |
| Backend acceptance | **Never** — no Wix/Abraxas web method reads this flag |
| Purchase / regulated commerce | **Not authorized** by this flag alone |
| Account / email / newsletter | **Not implemented** |
| Traditional `#yesButton` | Separate self-attestation — not relabeled as Abraxas verification |

## Age-boundary legal policy note

UTC calendar math (including leap-day Feb 29 → eligible on March 1 in tests) is a **technical implementation choice**. Good Trouble must confirm operating-jurisdiction age-boundary semantics with counsel before treating Abraxas as a legal cannabis eligibility gate. Tests prove code behavior only — not legal compliance.

## Wix page files and element IDs

| Page | Slug / usage | Element IDs |
|------|--------------|-------------|
| Age Verification popup | Lightbox or page | `#yesButton`, `#abraxasButton`, `#abraxasCaptcha`, `#abraxasStatusText` |
| Age Verification Result | `/age-verification-result` | `#abraxasStatusText`, `#restartAbraxasButton` (optional) |

Copy `examples/good-trouble-wix/pages/*.js` into the corresponding Wix page code panels.

## Age enforcement (code)

Policy evaluation requires `product_eligibility` with outcome `over_21`, derived server-side from authoritative IDV document DOB. No DOB, age, or document images are exposed to Wix, callbacks, or public receipts.

Migration: `supabase/migrations/075_good_trouble_retail_age_eligibility_claim.sql` — **not applied** by this batch.

Rollback: `supabase/rollbacks/075_good_trouble_retail_age_eligibility_claim_rollback.sql` — removes only the DB rule; `minimum_age` code expansion continues enforcing until code is rolled back separately.

## Receipt validation (Wix backend)

Use strict **sandbox** mode:

- `signature_valid === true`
- `decision_result === "approved"`
- `status === "active"`
- `partner_id` / `policy_id` exact match
- `schema_version === "1.0.0"`
- `artifact_type === "eligibility_decision_receipt"`
- valid future `expires_at`
- all `evaluated_claim_refs[].status === "active"`
- `production_usable === false` exactly
- `decision_context === "sandbox_only"`
- `invalidation_reasons === ["production_not_usable:false"]` only

Reference: `examples/good-trouble-wix/backend/abraxasReceiptValidator.js`

## Web method permissions

| Method | Wix permission | Notes |
|--------|----------------|-------|
| `createAbraxasVerificationStart` | **Anyone** | Requires CAPTCHA token; `webMethod(Permissions.Anyone, …)` in `.web.js` |
| `completeAbraxasVerification` | **Anyone** | PKCE verifier required |

Configure `wix-crypto` SHA-256 via `configureAbraxasHashFn` before go-live.

## CMS collection permissions

`AbraxasVerificationNonces` — **Admin only** for Read, Create, Update, Delete. Backend web methods only.

## Operator checklist (read-only — run before go-live)

Confirm via admin APIs or onboarding console **without exposing secrets**:

| Check | How |
|-------|-----|
| Partner `good-trouble-cannabis` exists | `GET /api/admin/partners/onboarding?partner_id=good-trouble-cannabis` |
| Policy `good-trouble-retail-v1` assigned and active | Same response: `assigned_policy_id`, `active_policy.status` |
| Sandbox allowed | `allowed_environments` includes `sandbox` |
| Wix callback allowlisted | `allowed_return_urls` contains `https://www.goodtroublecanna.com/age-verification-result` (no query) |
| No duplicate `goodtroublecanna` partner | List/search partners — expect absent or unused |
| Sandbox API key (boolean only) | `GET /api/admin/partner-keys?partner_id=good-trouble-cannabis` — count active `abx_test_` prefixes; **not required** for public-receipt path |
| Preflight | `GET /api/admin/partner-flow/provisioning-preflight?partner_id=...&policy_id=...&return_url=...` |
| `configureAbraxasHashFn` wired | Wix backend init with `wix-crypto` sha256 |
| `#abraxasButton` disabled until config passes | Operator enables after checklist green |

**Not required for this integration:** `abx_test_…` key for redirect or public receipt GET.

## First-time Abraxas steps (honest)

1. Google sign-in (zkLogin — Abraxas derives wallet address)
2. Wallet binding (signed control proof — required by policy)
3. Identity verification (ID + selfie when policy requires)
4. Partner consent ceremony
5. Return to Wix with signed receipt

Returning users with an active credential may complete in seconds.

## API key necessity

| Operation | Key required? |
|-----------|----------------|
| Partner Flow redirect | No |
| Public receipt GET | No |
| Credential JWT verify (`POST /api/credentials/verify`) | Yes — `abx_test_…` / `abx_live_…` |
| Webhooks | Yes — `webhooks:read` scope |

## Related code

- `lib/idv/ageEligibility.ts` — DOB parsing and eligibility (internal only)
- `lib/policy/evaluatePolicy.ts` — `minimum_age` → `product_eligibility` requirement
- `lib/partner/verifyPartnerFlowReceipt.ts` — strict sandbox/production modes
- `examples/good-trouble-wix/` — Wix Velo reference
