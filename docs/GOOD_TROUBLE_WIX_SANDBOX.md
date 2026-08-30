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

Active v1 evaluates **stored `required_claims` only** — four claims, no `product_eligibility`. `minimum_age: 21` is metadata until v2 is published. IDV may still **issue** `product_eligibility=over_21` from authoritative document DOB internally; no DOB, age, or document images are exposed to Wix, callbacks, or public receipts.

Enforcement in policy evaluation begins only after operator publish of migration **076** draft v2. See operator steps below.

## Migration 075 compatibility shim

Merged `075_good_trouble_retail_age_eligibility_claim.sql` used an in-place active `UPDATE` that fails post-055 immutability (`P0001: cannot mutate rules_json on good-trouble-retail-v1.1`). The compatibility shim is safe because:

- Production 075 **failed** before any policy mutation (operator-confirmed P0001).
- `075` is **not** in `DEMO_REQUIRED_MIGRATION_ORDER` (demo ledger stops at `065`); no environment has ledgered the prior hash unless manually added outside manifest.
- CI fresh sequential path passes: `scripts/ci/run-migration-076-sql-parity.sh` (049→051→055→075 shim→076).

Post-055: 075 detects `trg_partner_policies_immutability` and defers to 076.

## Operator rollout — migration 076 (Production)

**Separate explicit Production approval required.** The Supabase SQL Editor does **not** support psql `\i` — always copy raw SQL from GitHub.

### Preflight (read-only)

**Query A — NEW SQL tab:**

```sql
SELECT to_regclass('supabase_migrations.schema_migrations') AS migration_ledger_relation;
```

`NULL` → skip Query B. Non-null → run Query B in the **same** tab.

**Query B — SAME SQL tab (only if Query A is non-null):**

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '%075%' OR version LIKE '%076%' OR name LIKE '%075%' OR name LIKE '%076%'
ORDER BY version;
```

Production’s earlier 075 attempt failed with P0001 and performed **no policy mutation** — but ledger rows must be confirmed via Query B, not inferred.

**Policy state — NEW SQL tab:**

```sql
SELECT id, version, status,
       jsonb_array_length(COALESCE(rules_json->'required_claims', '[]'::jsonb)) AS required_claim_count,
       EXISTS (
         SELECT 1 FROM jsonb_array_elements(COALESCE(rules_json->'required_claims', '[]'::jsonb)) e
         WHERE e->>'claim_type' = 'product_eligibility'
       ) AS has_product_eligibility
FROM public.partner_policies
WHERE id = 'good-trouble-retail-v1'
ORDER BY version;

SELECT partner_id, assigned_policy_id
FROM public.partners
WHERE partner_id = 'good-trouble-cannabis';
```

### a. Apply 076 draft — NEW SQL tab

1. Open `supabase/migrations/076_good_trouble_retail_product_eligibility_draft.sql` on GitHub → **Raw** → copy all.
2. Supabase SQL Editor → **New SQL tab** → paste → run (after approval).

### b. Verify draft — SAME SQL tab or NEW SQL tab

Re-run the policy state query above. Expect v1 `active` unchanged (4 claims); v2 `draft` with one `product_eligibility` claim.

### c. Publish v2 — separate approval, NEW SQL tab

```sql
SELECT public.publish_partner_policy_draft('good-trouble-retail-v1', 2);
```

### Rollback 076 (draft only, pre-publish) — NEW SQL tab

Copy raw SQL from `supabase/rollbacks/076_good_trouble_retail_product_eligibility_draft_rollback.sql` on GitHub. **New SQL tab** → paste → run (separate rollback approval). Never mutates active/deprecated rows.

075 rollback on post-055 Production is a no-op; use 076 rollback for the draft.

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
- `lib/policy/evaluatePolicy.ts` — stored `required_claims` only; `product_eligibility` when explicitly published in policy version
- `lib/partner/verifyPartnerFlowReceipt.ts` — strict sandbox/production modes
- `examples/good-trouble-wix/` — Wix Velo reference
