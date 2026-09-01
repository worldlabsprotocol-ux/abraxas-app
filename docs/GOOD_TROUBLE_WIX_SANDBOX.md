# Good Trouble Canna — Wix Abraxas Sandbox

Planning reference for optional Abraxas Passport age verification on Wix. **Do not treat as live until operator configuration is confirmed.**

Account bootstrap, email sharing, newsletters, and partner SSO remain **in development** and are **not implemented** in this reference.

## Experience

| Path | Behavior |
|------|----------|
| **Primary** | “Yes, I’m 21 or older” (`#yesButton`) — quick age self-attestation; no CAPTCHA required |
| **Exit** | “No, I’m not” (`#noButton`) — always enabled |
| **Secondary** | “Verify with Abraxas Passport” (`#abraxasButton`) — reusable, policy-backed verification gate; one click starts the backend flow |

Abraxas Passport is the verification gate for the stronger route. Unlike a basic CAPTCHA, which only attempts to distinguish a person from automation, Abraxas validates the required policy and returns a privacy-preserving receipt. Good Trouble does not receive the visitor’s ID photos or date of birth.

Abraxas is not represented as a general-purpose CAPTCHA. Backend capacity and lifecycle controls continue to protect flow creation, while a validated Abraxas receipt protects the verified outcome. Automated flow creation does not grant verification; verification requires a valid, bound Abraxas receipt.

Supporting copy (`#abraxasStatusText`):

> Use Abraxas Passport for reusable, privacy-preserving verification.

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

  V->>B: createAbraxasVerificationStart()
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
| Global pending-flow exhaustion | Mitigated — purge stale rows before count; post-insert rollback; `#yesButton` unaffected |

## Endpoint abuse resistance (sandbox)

`createAbraxasVerificationStart` accepts **no client parameters**. The server applies a CAPTCHA bypass for this pilot route; `skipCaptcha` is never exposed to the browser. Abraxas Passport is the visible verification gate — not a CAPTCHA substitute.

| Control | Behavior |
|---------|----------|
| Pending cap | 100 site-wide **non-expired pending** flows (after purge) |
| Purge before count | Expired flows + consumed flows older than 24h removed before capacity check |
| Post-insert rollback | If concurrent starts exceed cap, the just-inserted row is deleted |
| Flow TTL | 10 minutes |
| Flow ID entropy | Opaque `gtf_{64hex}` |
| PKCE binding | Verifier in `sessionStorage`; SHA-256 challenge server-side only |
| Single-use consumption | Flow marked `consumed` before returning `verified: true` |
| Receipt validation | Strict sandbox rules; bounded retries; receipt expiration |
| Partner / policy | `good-trouble-cannabis` / `good-trouble-retail-v1` enforced at validation |
| Error surface | Generic `{ error: "rate_limited" }` or safe codes — no counts or provider details leaked |
| Traditional path | `#yesButton` self-attestation is independent — never blocked by Abraxas capacity |

**No additional request-throttling control** beyond global pending-flow capacity exists in this reference. There is no IP fingerprinting, device fingerprinting, cookie-based throttling, PII collection, or new database schema for anonymous flow starts.

**Security claim (honest):** Automated flow creation does not grant verification; verification requires a valid, bound Abraxas receipt.

**Operator monitoring:** schedule a daily backend job calling `purgeStale` (see **Scheduled purge** below) and alert on elevated `rate_limited` rates. No automated cleanup ships in this reference — operator approval required before deploying a scheduled job.

### Scheduled purge (`purgeStale`) — operator requirement

`flowCapacity.js` invokes `store.purgeStale()` before every capacity check. `wixNonceStore.purgeStale` deletes:

| Category | Condition |
|----------|-----------|
| Expired flows | `expiresAt <= now` |
| Stale consumed | `state = consumed` and `consumedAt` older than 24h |

Each invocation removes at most 100 rows per query (expired + stale consumed). Start-time purge alone does not guarantee CMS hygiene under low traffic or between bursts.

**Required before Production at scale:** operator schedules a Wix backend job (e.g. daily) that calls `createWixNonceStore().purgeStale()`. This repository does **not** create, deploy, or enable that job — explicit operator approval required.

Example job skeleton (do not deploy without approval):

```javascript
// backend/jobs/purgeAbraxasNonces.web.js — NOT deployed by this reference
import { createWixNonceStore } from "backend/wixNonceStore";

export async function purgeAbraxasNonces() {
  const store = createWixNonceStore();
  return store.purgeStale();
}
```

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
| Age Verification popup | Lightbox or page | `#yesButton`, `#noButton`, `#abraxasButton`, `#abraxasStatusText` |
| Age Verification Result | `/age-verification-result` | `#abraxasStatusText`, `#restartAbraxasButton` (optional) |

Copy `examples/good-trouble-wix/pages/AgeVerificationResult.js` into the `/age-verification-result` page code panel.

### Wix page deployment (`src/public` + popup page)

| Repository file | Wix destination |
|-----------------|-----------------|
| `pages/ageVerificationPopupLogic.js` | `src/public/ageVerificationPopupLogic.js` |
| `pages/AgeVerificationPopup.js` | Age Verification popup page code panel |
| `pages/AgeVerificationResult.js` | `/age-verification-result` page code panel |

`AgeVerificationPopup.js` imports the logic module with:

```javascript
import { createPopupController, createPopupInitializationGuard } from "public/ageVerificationPopupLogic";
```

Required popup element IDs (exact): `#yesButton`, `#noButton`, `#abraxasButton`, `#abraxasStatusText`. The legacy `#abraxasCaptcha` element may be removed from the popup — it is no longer used.

### Popup state machine (Abraxas path)

| State | UI behavior |
|-------|-------------|
| `ready` | `#abraxasButton` enabled; label “Verify with Abraxas Passport” |
| `starting_backend` | Button disabled; status “Starting secure verification with Abraxas Passport…” |
| `preview_backend_passed` | Editor Preview only — no external navigation |
| `redirecting` | Test Site / published Site — `wixLocationFrontend.to(verifyUrl)` |
| `recoverable_error` | Safe generic retry message; button re-enabled |

Navigation uses `wix-location-frontend` — **not** `window.location.href`. `#abraxasButton` link in Wix Editor must remain **None** (code-owned).

### Wix Studio responsive / full-viewport contract (manual canvas)

The homepage flash cannot be eliminated by code because the age gate is a Wix popup over the homepage. Minimize it with an opaque, full-viewport popup surface. **These settings must be applied in Wix Studio** — repository JavaScript cannot set popup width, overlay opacity, or element X/Y anchors.

| Setting | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Popup width | 100% | 100% | 100% |
| Popup minimum height | 100vh | 100vh | 100vh |
| Overlay / background | Opaque (not transparent) | Opaque | Opaque |
| Content wrapper alignment | Centered horizontally + vertically | Centered | Centered |
| Content wrapper width | `min(92vw, 760px)` | `min(92vw, 760px)` | `min(92vw, 760px)` |
| Element X/Y position | 0 — no negative offsets | 0 | 0 |
| Child section width | Fluid — **no** fixed `1280px` | Fluid | Fluid |
| Heading text | Responsive size; wrap enabled | Same | Same |
| Buttons container | Wrap / stack on narrow widths | Stack preferred | Stack |
| Text boxes (`#abraxasStatusText`) | Auto height | Auto height | Auto height |
| Overflow | Vertical visible; horizontal hidden | Same | Same |

**Test widths in Studio:** 1280, 1024, 768, 430, 390.

**Cannot be done in repository JS (Studio only):** popup dimensions, overlay opacity, element anchor X/Y, section fixed widths, heading typography, button layout grid, text box sizing.

### Backend runtime chain audit

| Step | Module | Confirmed |
|------|--------|-----------|
| Popup click | `AgeVerificationPopup.js` | Calls `createAbraxasVerificationStart()` — no client args |
| Web method | `abraxasVerification.web.js` | Server-owned `skipCaptcha: true`; `Permissions.Anyone` |
| Service | `abraxasVerificationService.js` | Capacity + `sha256Adapter` default + PKCE lifecycle |
| SHA-256 | `sha256Adapter.js` | Auto-imported; not optional at runtime |
| Flow build | `nonceLifecycle.js` | `partner_id=good-trouble-cannabis`, `policy_id=good-trouble-retail-v1`, sandbox |
| CMS store | `wixNonceStore.js` | Collection `AbraxasVerificationNonces`; fields match `flowRecord` |

Return URL remains exactly `https://www.goodtroublecanna.com/age-verification-result`. No production policy/key/partner mutation in this reference.

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
| `createAbraxasVerificationStart` | **Anyone** | No client parameters; server-owned bypass; `webMethod(Permissions.Anyone, …)` in `.web.js` |
| `completeAbraxasVerification` | **Anyone** | PKCE verifier required |

SHA-256 for PKCE challenges is **auto-wired** via `sha256Adapter.js` (`node:crypto` `createHash`). No manual init call is required. Optional `configureAbraxasHashFn` remains for tests/diagnostics only.

## Wix runtime files (`src/backend`)

Copy these **10** backend modules (see `examples/good-trouble-wix/README.md` for full table):

`constants.js`, `sha256Adapter.js`, `pkceProof.js`, `nonceLifecycle.js`, `flowCapacity.js`, `captchaGate.js`, `wixNonceStore.js`, `abraxasReceiptValidator.js`, `abraxasVerificationService.js`, `abraxasVerification.web.js`

Plus: `pages/ageVerificationPopupLogic.js` → `src/public/ageVerificationPopupLogic.js`; `pages/AgeVerificationPopup.js` → popup page panel; `pages/AgeVerificationResult.js` → callback page panel.

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
| `sha256Adapter.js` copied to Wix backend | Auto-wired `node:crypto` SHA-256 — no manual hash init |
| Scheduled `purgeStale` job approved | Operator schedules daily cleanup (not deployed by this reference) |
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
