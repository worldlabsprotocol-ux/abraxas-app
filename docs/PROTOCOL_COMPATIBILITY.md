# Protocol Compatibility — v1.0.0-beta.0 freeze

**Status:** **Live (code)** — manifest and contract tests on `main`; production IAT sign-off pending  
**Baseline tag:** `v1.0.0-beta.0` (not yet created)  
**Compatibility version:** `1.0.0` (`PARTNER_FLOW_COMPATIBILITY_VERSION`)  
**Canonical tests:** `lib/protocol/compatibility.test.ts`, `lib/protocol/partnerFlowCompatibilityManifest.test.ts`  
**Machine-readable manifest:** `GET https://abraxasworld.xyz/api/protocol/compatibility` (generated from code)

---

## Single source of truth

| Artifact | Location |
|----------|----------|
| Frozen field constants | `lib/protocol/compatibility.ts` |
| Versioned Partner Flow manifest | `lib/protocol/partnerFlowCompatibilityManifest.ts` |
| Public JSON (synced at runtime) | `GET /api/protocol/compatibility` |
| OpenAPI (browser Partner Flow) | `public/openapi/partner-flow.openapi.yaml` |
| Human integrator guide | `/docs/partner-flow`, `/docs/partner-flow-api` |

**Rule:** Do not edit `public/openapi/partner-flow.openapi.yaml` or callback field lists without updating the manifest module and bumping `PARTNER_FLOW_COMPATIBILITY_VERSION` when the external contract changes.

---

## Frozen contract versions

| Surface | Version | Location |
|---------|---------|----------|
| Partner Flow compatibility | `1.0.0` | `PARTNER_FLOW_COMPATIBILITY_VERSION` |
| Decision receipt schema | `1.0.0` | `decision_receipts.schema_version` |
| Trust Decision API JSON | `1.0.0` | `GET /api/v1/verify/decisions/{id}` |
| Partner callback query params | v1 (fixed set) | `PARTNER_CALLBACK_PARAMS` |
| Partner-flow browser API | v1 (additive) | `POST /api/v1/partner-flow/*` |
| OpenAPI document | `1.0.0` | `partner-flow.openapi.yaml` `info.version` |

---

## Frozen Partner Flow surface (external)

### Canonical production origin

`https://abraxasworld.xyz` (`SITE_URL`)

### Browser paths

| Path | Role |
|------|------|
| `GET /partner/verify` | Browser redirect entry |
| `GET /passport` | ID capture / consent handoff (`next=passport`) |
| `POST /api/v1/partner-flow/evaluate` | Policy evaluation (browser session) |
| `POST /api/v1/partner-flow/complete` | Issue session receipt after approval |
| `POST /api/v1/partner-flow/refresh` | Re-issue expired session receipt |
| `GET /api/receipts/{receiptId}/public` | Public signed receipt (partner backend) |

### Partner callback (holder redirect)

**Query parameters (frozen, no PII):** `status`, `decision_id`, `receipt_id`, `receipt_expires_at`, `credential_id`, `policy_id`, `partner_id`

**Forbidden in callback URL:** legal name, DOB, document numbers, images, wallet address, email, credential JWT.

Partners **must** verify via `GET /api/receipts/{receiptId}/public` — never trust callback parameters alone.

### Public receipt view (frozen fields)

`receipt_id`, `schema_version`, `policy_id`, `policy_version`, `partner_id`, `subject_pseudonym_id`, `decision_result`, `reason_codes`, `evaluated_claim_refs`, `issuer_refs`, `decision_context`, `production_usable`, `evaluated_at`, `expires_at`, `status`, `payload_hash`, `signature`, `signing_key_id`, `signature_valid`, `anchor_reference`, `artifact_type`

**Validation (fail closed):** `signature_valid === true`, `decision_result === "approved"`, `status === "active"`, valid unexpired `expires_at`, `production_usable === true` (unless explicit sandbox opt-in), `partner_id` / `policy_id` match expected integration.

### Partner-flow `next` values

`authenticate`, `passport`, `enter`, `denied`, `pending_review`

### Stable error codes (audit-safe)

`flow_trace_id_mismatch`, `idempotency_conflict`, `audit_persistence_failed`, `generic_error`

HTTP conditions documented in manifest `stable_error_codes.http_conditions` and `/docs/partner-flow`.

---

## Intentional exclusions (not public guarantees)

- Internal admin APIs (`/api/admin/*`)
- OAuth / zkLogin session internals
- Server-to-server `POST /api/v1/verification-requests` (partner API key)
- Partner-authenticated receipt views
- Abraxas Connect (`/api/v1/authorize/*`)
- Credential/registry verify (`/api/credentials/verify`)
- Sandbox-only policy behavior unless `production_usable` is explicitly opted in

---

## Backward compatibility policy

- **Additive changes only** until next major protocol version.
- New JSON fields may be added; existing fields will not change semantics without a major bump.
- **Breaking change process:**
  1. Bump `PARTNER_FLOW_COMPATIBILITY_VERSION` in `lib/protocol/partnerFlowCompatibilityManifest.ts`
  2. Update this document with migration notes
  3. Run `lib/protocol/partnerFlowCompatibilityManifest.test.ts` and `lib/protocol/compatibility.test.ts`
  4. Tag major release (e.g. `v2.0.0`) for semantic breaking changes
- Partners must not depend on undocumented fields.

---

## Compatibility regression tests

```bash
npm test -- lib/protocol/compatibility.test.ts
npm test -- lib/protocol/partnerFlowCompatibilityManifest.test.ts
npm test -- lib/partner/partnerFlowOpenApi.test.ts
npm run gate:verify-receipt-fixture
```

---

## Evidence required to mark this gate complete

- [x] Manifest module and contract tests committed at release SHA
- [x] Public manifest endpoint `GET /api/protocol/compatibility`
- [ ] Production IAT receipt shows `signature_valid: true` for live `dr_*`
- [ ] `RELEASE_DECISION.md` references this document as complete
