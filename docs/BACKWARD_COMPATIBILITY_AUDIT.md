# Backward Compatibility Audit

**Date:** 2026-07-29  
**Scope:** Public APIs, credential formats, receipt formats, partner callbacks, database migrations, versioning strategy  
**Method:** Read-only source audit  
**Overall verdict:** **PARTIAL** — cryptographic artifacts are stable; API and policy layers lack formal compatibility guarantees.

---

## Scorecard

| Area | Verdict | Headline |
|------|---------|----------|
| Public APIs | **PARTIAL** | `/api/v1/` for partner routes; core verify unversioned; live policy re-evaluation breaks stored decisions |
| Credential formats | **PARTIAL** | JWT verify tolerates legacy fields; no credential `schema_version` |
| Receipt formats | **PASS** | `schema_version: 1.0.0`, deterministic canonicalization, Ed25519 — old receipts remain valid |
| Partner callbacks | **PASS** | Redirect contract documented, tested, PII-safe |
| Database migrations | **PARTIAL** | Mostly additive; duplicate `050`/`051` numbers; in-place policy UPDATEs |
| Versioning strategy | **FAIL** | No deprecation policy, no API version headers, policy content not immutable |

---

## 1. Public APIs — PARTIAL

**Versioned:** `/api/v1/partner-flow/*`, `/api/v1/verification-requests`, `/api/v1/receipts/*`, `/api/v1/decisions/*`

**Unversioned:** `POST /api/credentials/verify`, `GET /api/receipts/{id}/public`

**High-risk breaking behaviors:**
- `getDecisionStatus()` re-evaluates against **current** policy, not stored version (`lib/verification/requestsService.ts`)
- `policy_version` in verify responses is hardcoded `"2026-07-08"`, not DB value
- Proof issuance failure returns different response shape (no `proof_id`)

**If upgraded without compat plan:** Partners trusting decision status as immutable will see outcomes flip when policy changes.

---

## 2. Credential Formats — PARTIAL

**Stable:** EdDSA JWT, issuer check, legacy `wallet` field fallback in `verifyJwt.ts`

**Missing:** `credentialSubject.schema_version` — evolution relies on implicit optional-field rules

**Breaks old credentials if:**
- Signing key rotated without JWKS overlap
- Required JWT fields added without verifier fallback
- Registry row deleted or credential revoked/expired (by design)

---

## 3. Receipt Formats — PASS

**Stable:** `schema_version: "1.0.0"`, sorted canonical JSON, Ed25519 signatures (`lib/decisionReceipts/canonical.ts`)

**Old receipts remain cryptographically valid.** Live `currently_valid` may be false if claims revoked — signed artifact preserved.

**Breaks if:** Canonical field set or sort rules change without bumping `schema_version`.

---

## 4. Partner Callbacks — PASS

**Frozen redirect params** (appended to `return_url`):
- `receipt_id` (required by `PartnerEnterClient`)
- `status`, `partner_id`, `receipt_expires_at`, `credential_id`, `policy_id`

**Latent risk:** Passport uses `return` param; partner verify uses `return_url` — different names, same purpose.

**Breaks if:** `receipt_id` renamed/removed, or `return`/`return_url` not aliased during transition.

---

## 5. Database Migrations — PARTIAL

**Good:** `IF NOT EXISTS`, additive columns, idempotent repair (`046`)

**Bad:**
- Duplicate migration numbers: `050_good_trouble_biometric_thresholds.sql` + `050_identity_review_workflow.sql`; same for `051`
- In-place `UPDATE partner_policies SET rules_json` — retroactive policy change
- No down migrations or rollback strategy

---

## 6. Versioning Strategy — FAIL

**Exists:** URL `/api/v1/*`, receipt `schema_version`, agent `abraxas.agent.verify.v1`

**Missing:**
- Deprecation policy with sunset dates
- `X-Abraxas-API-Version` headers
- Credential JWT `schema_version`
- Immutable policy version table
- Protocol semver or compatibility changelog
- Contract tests pinning response shapes per version

---

## Protocol Versioning Model (Recommended)

| Layer | Version field | Bump triggers |
|-------|---------------|---------------|
| HTTP API | `/api/v{N}/` + header | Remove/rename response field |
| Credential JWT | `vc.schema_version` | Required claim change |
| Decision receipt | `schema_version` | Canonical field change |
| Auth proof | `schema_version` | Payload field change |
| Policy | `partner_policies.version` (immutable rows) | `rules_json` change |
| Partner callback | `callback_version` query param | Param rename/remove |

**Rules:**
1. Major = breaking verify; minor = additive; patch = docs/fixes
2. 90-day deprecation window for removed API fields
3. Never UPDATE `rules_json` in place — insert new policy version row
4. Multi-key JWKS for signing key rotation

---

## Priority Remediation (compat-focused)

1. Stop in-place policy UPDATEs — immutable policy versions
2. Freeze `getDecisionStatus` — return stored decision; live check as opt-in
3. Fix duplicate migration numbers (`050`/`051`)
4. Publish Partner Callback Contract v1
5. Add credential `schema_version` at next issuance
6. Unify `policy_version` in API responses with DB value
