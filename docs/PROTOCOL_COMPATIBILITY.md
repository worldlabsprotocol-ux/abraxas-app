# Protocol Compatibility — v1.0.0-beta.0 freeze

**Status:** Draft — complete when tagging `v1.0.0-beta.0`  
**Baseline tag:** `v1.0.0-beta.0` (not yet created)  
**Canonical tests:** `lib/protocol/compatibility.test.ts`

---

## Frozen contract versions

| Surface | Version | Location |
|---------|---------|----------|
| Decision receipt schema | `1.0.0` | `decision_receipts.schema_version` |
| Trust Decision API JSON | `1.0.0` | `GET /api/v1/verify/decisions/{id}` |
| Partner callback query params | v1 (fixed set) | `buildRedirectUrl` |
| Partner-flow browser API | v1 (additive) | `POST /api/v1/partner-flow/*` |

---

## Public contracts

### 1. Signed decision receipt (public view)

**Endpoint:** `GET /api/receipts/{receipt_id}/public`

**Stable fields:** `receipt_id`, `schema_version`, `policy_id`, `policy_version`, `partner_id`, `subject_pseudonym_id`, `decision_result`, `reason_codes`, `evaluated_claim_refs`, `signature`, `payload_hash`, `signing_key_id`, `signature_valid`, `decision_context`, `production_usable`, `evaluated_at`, `expires_at`, `status`

**Verification:** `signature_valid: true` + `payload_hash` matches canonical payload.

**Operator command:**

```bash
npm run gate:verify-receipt-fixture
# Production: curl https://abraxasworld.xyz/api/receipts/{dr_*}/public
```

### 2. Trust Decision (relying party)

**Endpoint:** `GET /api/v1/verify/decisions/{id}` (partner API key, partner-scoped)

**Stable fields:** `decision_id`, `approved`, `decision`, `permission`, `permission_version`, `trust_level`, `valid_until`, `reason_codes`, `status`, `decided_at`, `policy_id`, `policy_version`, `relying_party_id`, `proof`

**Note (P1-2):** `currently_valid` is **not** exposed on Trust Decision API at beta. Partners must verify receipt via public endpoint or implement P1-2 post-beta.

### 3. Partner callback (holder redirect)

**Query parameters (no PII):** `status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`

### 4. Partner-flow browser API

| Route | Auth | Stable response fields |
|-------|------|------------------------|
| `POST /api/v1/partner-flow/evaluate` | Browser session | `next`, `redirect_url`, `passport_url`, `verification_request_id`, `partner_result`, `reason_codes`, `flow_trace_id` |
| `POST /api/v1/partner-flow/complete` | Browser session | `next`, `redirect_url`, `partner_result`, `flow_trace_id` |
| `POST /api/v1/partner-flow/refresh` | Browser session | `next`, `redirect_url`, `partner_result`, `flow_trace_id` |

**`next` values:** `authenticate`, `passport`, `enter`, `denied`, `pending_review`

---

## Reference policies (beta)

| Policy ID | Partner | Sandbox |
|-----------|---------|---------|
| `good-trouble-retail-v1` | `good-trouble-cannabis` | Yes |
| `cielo-verified-guest-v1` | `cielo` | No |
| `abraxas-rwa-us-v1` | `abraxas` | No |

Full matrix: `docs/CLAIM_MATRIX.md`, `lib/policy/productionPolicyContract.ts`

---

## Backward compatibility policy

- **Additive changes only** until next major protocol version.
- New JSON fields may be added; existing fields will not change semantics without a major bump.
- Breaking changes require: updated `PROTOCOL_COMPATIBILITY.md`, migration note, and major tag (e.g. `v2.0.0`).
- Partners must not depend on undocumented fields.

---

## Compatibility regression tests

```bash
npm test -- lib/protocol/compatibility.test.ts
npm test -- lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts
npm run gate:verify-receipt-fixture
```

---

## Evidence required to mark this gate complete

- [ ] This document reviewed and committed at release SHA
- [ ] `lib/protocol/compatibility.test.ts` passing at release SHA
- [ ] Production IAT receipt shows `signature_valid: true` for live `dr_*`
- [ ] `RELEASE_DECISION.md` references this document as complete
