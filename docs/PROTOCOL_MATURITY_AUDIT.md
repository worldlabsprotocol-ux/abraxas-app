# Abraxas Protocol Maturity Audit

**Date:** 2026-07-29  
**Scope:** Protocol hardening — not feature development  
**Method:** Source code audit + live production probes + 353 automated tests  
**Production target:** https://abraxas-app.vercel.app  
**Verdict:** **Trust infrastructure foundation is built. Protocol hardening is PARTIAL. Production validation is NOT COMPLETE.**

---

## Executive Summary

A month ago Abraxas was primarily a verification application. Today it is substantially closer to a trust infrastructure layer where Good Trouble is the first relying party.

**Stop investing in:** biometric engine features, Passport capture UX, manual review workflow, credential issuance logic, partner flow architecture, session receipts, credential-first verification. These are foundational and need real-world validation, not more features.

**Start investing in:** production validation, partner onboarding, developer SDK, policy expansion, credential portability, issuer management, verifier analytics, compliance tooling, observability, and Passport lifecycle (present → renew → revoke → history).

**Production readiness score: 63/100** — operational hardening and validation remain (see scoring section).

**Product architecture score: 92/100** — Passport, credentials, partner flow, and session receipts are a sound reusable pattern. Do not conflate the two; see `docs/ENGINEERING_ROADMAP.md`.

---

## 1. Idempotency — PARTIAL (High Priority)

**Question:** Can every mutation endpoint be safely retried without duplicate credentials or receipts?

| Endpoint | Verdict | Mechanism | Risk on retry |
|----------|---------|-----------|---------------|
| `issueDecisionReceipt` | **PASS** | `idempotency_key` + unique constraint on `verification_decision_id`; conflict recovery | Safe — returns same receipt |
| `issueIdentityCredential` | **PARTIAL** | Early return if `credential_jti` exists; upsert on `jti` | Race condition can mint duplicate JWT before check completes |
| `issuePartnerSessionReceipt` | **FAIL** | Always inserts new `verification_decisions` row | Every retry = new receipt (`dr_*`) |
| `POST /api/v1/partner-flow/evaluate` | **FAIL** | Calls `issuePartnerSessionReceipt` on approved path | Double-click issues duplicate session receipts |
| `POST /api/v1/partner-flow/complete` | **FAIL** | Same as above | Duplicate receipts on network retry |
| `POST /api/v1/partner-flow/refresh` | **FAIL** | Intentionally re-issues; no idempotency key | Unintended duplicate on retry |
| `createVerificationRequest` | **FAIL** | Plain insert, no dedup | Multiple pending requests per holder |
| `POST /api/identity/documents/capture` | **PARTIAL** | Blocks if `hasPendingIdentityReview`; new `capture_session_id` each call | After approval, retries create duplicate uploads |
| `POST /api/admin/identity/approve` | **PARTIAL** | `alreadyIssued` on credential; no document-status guard | Duplicate audit log entries |
| `consentAndDecide` | **PARTIAL** | Throws if already decided | Concurrent retries can duplicate consent rows |

**Reference implementation:** `lib/decisionReceipts/service.ts` — pre-read, idempotency key, unique constraints, conflict recovery.

**Priority fixes:**
1. Add idempotency key to partner session receipt (holder + partner + policy + time window)
2. Reuse pending verification request instead of creating duplicates
3. Block capture retries when credential already active
4. Add locking or transaction around `issueIdentityCredential`

---

## 2. State Machine — PARTIAL (High Priority)

**Question:** Can users jump from "pending" directly to "active" without approval?

| Domain | Enforced? | Evidence |
|--------|-----------|----------|
| Claim-level credential status | **PASS** | `credentialStatusRegistry.ts` — `ALLOWED_TRANSITIONS` with guards |
| Identity verification status | **FAIL** | No transition matrix; any status writable via upsert |
| `identity_verifications.credential_status` | **FAIL** | Written freely; separate from claims layer |
| Verification requests | **PARTIAL** | Double-decide blocked; `consented` state never written |
| Partner flow routing | **PASS** | Logical routing in `relyingPartyFlow.ts` (17 tests) |
| Admin approve | **PARTIAL** | No prior-status precondition on document |

**Impossible transitions NOT prevented:**
- `submitted` → `active` credential without review (biometric auto-approve is by design)
- `/api/credentials/issue` backdoor bypasses IDV pipeline (secret-gated in prod)
- `relyingPartyFlow` reads legacy `status` column, not `identity_verification_status`
- Revoke API updates legacy `status` only, leaving `credential_status` stale

**What works:**
- Partner verification request: create → decide with status guards
- Claim revocation: `revoked → active` blocked
- Capture duplicate guard while pending review

---

## 3. Audit Trail — PARTIAL (High Priority)

**Question:** Can you reconstruct what happened six months later?

| Event | In `audit_events`? | Where logged instead |
|-------|---------------------|----------------------|
| Verification request created | **Yes** | `audit_events` |
| Verification decided | **Yes** | `audit_events` |
| Decision receipt issued | **Yes** | `audit_events` |
| Partner session receipt | **Yes** | `audit_events` |
| Credential revoked | **Yes** | `audit_events` |
| Claims upserted/revoked | **Yes** | `audit_events` |
| Passport created | **No** | `sui_passport_objects` upsert only |
| ID uploaded | **No** | `identity_verification_events` |
| Selfie uploaded | **No** | `passport_documents` row |
| Biometrics analyzed | **No** | **stdout only** (`logCaptureAudit`) — lost on serverless |
| Admin approved | **No** | `identity_review_audit_log` (separate table) |
| Credential issued | **No** | Indirect via `claims.upserted` only |
| Identity verified | **No** | `identity_verification_events` (no `from_status`) |

**Fragmentation:** 5 separate audit stores (`audit_events`, `identity_verification_events`, `identity_review_audit_log`, `credential_status_events`, stdout logs). No unified query surface.

**Critical gap:** Biometric events are stdout-only. On Vercel serverless, these are lost on cold starts and log rotation.

---

## 4. Policy Versioning — PARTIAL

**Question:** If Good Trouble changes from 21+ to 25+, do old receipts still say which policy version produced them?

| Capability | Verdict | Evidence |
|------------|---------|----------|
| Receipts store `policy_version` | **PASS** | `decision_receipts.policy_version` in signed canonical payload |
| Decisions store `policy_version` | **PASS** | `verification_decisions.policy_version` at insert time |
| Old policies preserved | **FAIL** | Migrations UPDATE in place; `version` stays at `1` |
| Policy history table | **FAIL** | Does not exist |
| `/api/credentials/verify` uses DB version | **FAIL** | Hardcoded `DEFAULT_POLICY_VERSION = "2026-07-08"` |
| Re-evaluation uses stored version | **FAIL** | `getDecisionStatus()` re-evaluates against **current** policy |

**Risk:** Policy change retroactively invalidates old decisions. Receipts signed with `policy_version: 1` but policy content has changed underneath.

**Fix:** Immutable policy versions (new row per change, increment version). Never re-evaluate stored decisions against current policy.

---

## 5. Rate Limiting — PARTIAL

| Endpoint | Rate limited? | Mechanism |
|----------|---------------|-----------|
| Biometric capture | **PASS** | 5/hour/wallet via DB count → 429 |
| Passport creation (zkLogin) | **FAIL** | No throttle |
| Browser session mint | **FAIL** | No throttle |
| `POST /api/credentials/verify` | **FAIL** | Partner key auth only; public JWT path unauthenticated |
| Partner-flow evaluate/complete/refresh | **FAIL** | Browser session only |
| Receipt refresh | **FAIL** | No throttle |

Only capture is protected. All other mutation endpoints are vulnerable to abuse and accidental loops.

---

## 6. Secrets — PARTIAL

| Check | Verdict | Evidence |
|-------|---------|----------|
| Service role key in client | **PASS** | Zero matches in `"use client"` files |
| Signing key in client | **PASS** | Server-only in `lib/decisionReceipts/signing.ts` |
| `NEXT_PUBLIC_*` secrets | **FAIL** | `NEXT_PUBLIC_ADMIN_PIN` with default `abraxas2026` bundled in client JS |
| Keys logged to console | **PASS** | Only boolean flags, not values |
| Service role scope | **PASS** | API routes and server libs only |

**Pilot risk:** Admin PIN is public in client bundle. Acceptable for sandbox pilot; must be fixed before production.

---

## 7. Observability — PARTIAL

| Question | Answerable today? | Source |
|----------|-------------------|--------|
| Users verified today | **No** | No daily counter |
| Approval rate | **No** | `success_rate_30d` is presentation rate, not IDV approval |
| Rejection reasons | **Partial** | In DB + admin UI; not aggregated in metrics |
| Returning-user % | **No** | Not implemented |
| Average verification latency | **Partial** | `latency_ms` in stdout `biometric.analyzed` only |
| Partner API usage | **Yes** | `partner_api_usage` table + `logPartnerUsage` |
| Partner-flow calls | **No** | `logPartnerUsage` not wired on partner-flow routes |

**Exists:** `GET /api/metrics/public`, admin identity queue, biometric telemetry (stdout), partner usage dashboard.

**Missing:** APM, time-series dashboards, funnel analytics, partner-flow logging, daily IDV counters.

---

## 8. Failure Recovery — PARTIAL

| Failure scenario | Recovery path | Verdict |
|------------------|---------------|---------|
| Browser closes mid-capture | In-memory state lost; must restart | **PARTIAL** |
| Admin rejects | State → declined; generic user message | **PARTIAL** |
| Supabase unavailable | Mixed: 503 on capture, misleading `not_started` on status | **PARTIAL** |
| zkLogin session expires | 7-day cookie; re-sign-in prompt | **PASS** |
| Partner redirect fails | `PartnerFlowReturnHandler` — **silent failure, no UI** | **FAIL** |
| Receipt expired | `PartnerEnterClient` refresh button | **PASS** |
| Evaluate API error | `PartnerVerifyClient` retry button | **PASS** |
| Credential expired/revoked | Routes back to Passport | **PASS** (17 tests) |

**Critical gap:** Post-approval partner redirect is fire-and-forget. User who passes review but whose redirect fails has no in-app recovery.

---

## 9. Public API Documentation — PARTIAL

| Integration style | Documented without source? | Public surface |
|-------------------|---------------------------|----------------|
| Server-side verify (`POST /api/credentials/verify`) | **Yes** | `/docs/relying-party-verify` + `GET /api/docs/relying-party` |
| Redirect partner flow (Good Trouble pattern) | **No** | `docs/PARTNER_FLOW_INTEGRATION.md` — repo only, not in `/docs` nav |
| Partner-flow API schemas | **No** | No published request/response schemas |
| OpenAPI/Swagger | **No** | Does not exist |
| Self-service onboarding | **Partial** | Design-partner apply documented; DB setup in markdown only |

**A second partner integrating tomorrow:**
- Server-side verify path: **Yes, they can.**
- Redirect/OAuth flow (Good Trouble pattern): **No, they need source or internal docs.**

---

## 10. Production Validation — FAIL

Live audit against https://abraxas-app.vercel.app (2026-07-29):

| Result | Count |
|--------|-------|
| PASS | 15 |
| PARTIAL | 1 |
| FAIL | 0 |
| SKIP | 9 |

**Deployed and working:**
- All GT routes live (200)
- Partner flow APIs auth-gated (401 without session)
- Credential verify returns signed proof bundle
- Continue with Abraxas button on production

**Not proven:**
- Zero active credentials on production (`active_credentials=0`)
- Veriff disabled (manual IDV only)
- Full 15-step user journey untested
- Migration 051 not confirmed in production DB
- ONNX not confirmed on production host

---

## Passport Lifecycle Gap

**Today:**
```
Verify → Issue Credential → Done
```

**Target:**
```
Create Passport → Verify Identity → Issue Credential → Present Credential
→ Policy Evaluation → Session Receipt → Renew → Revoke → Reissue → History/Audit
```

| Lifecycle stage | Implemented | Tested | Production proven |
|-----------------|-------------|--------|-------------------|
| Create Passport (zkLogin) | Yes | Partial | No |
| Verify Identity (ID + biometric) | Yes | Yes (353 tests) | Manual mode only |
| Issue Credential | Yes | Yes | No (0 credentials) |
| Present Credential | Partial | Partial | No |
| Policy Evaluation | Yes | Yes | APIs live |
| Session Receipt | Yes | Yes (17 tests) | No live receipt |
| Renew (refresh receipt) | Yes | Partial | API live, untested |
| Revoke | Yes | Partial | No HTTP e2e |
| Reissue (expired → Passport) | Yes | Yes (tests) | No |
| History / Audit | Partial | No | Fragmented stores |

---

## Scoring

### Two dimensions (do not merge)

| Dimension | Score | What it measures |
|-----------|-------|------------------|
| **Product Architecture** | **92/100** | Partner flow design, credential-first verify, session receipts, reusable integration — strong |
| **Production Readiness** | **63/100** | Security, idempotency, audit trail, policy versioning, live validation — incomplete |

### Production readiness breakdown

| Area | Score | Weight | Weighted |
|------|-------|--------|----------|
| Architecture (partner flow, credential-first) | 85 | 15% | 12.8 |
| Security (secrets, auth gates) | 75 | 15% | 11.3 |
| Idempotency | 40 | 10% | 4.0 |
| State machine | 55 | 10% | 5.5 |
| Audit trail | 50 | 10% | 5.0 |
| Policy versioning | 60 | 5% | 3.0 |
| Rate limiting | 30 | 5% | 1.5 |
| Observability | 45 | 10% | 4.5 |
| Failure recovery | 55 | 5% | 2.8 |
| Public API docs | 65 | 5% | 3.3 |
| Production validation | 35 | 10% | 3.5 |
| **Production Readiness Total** | | | **63/100** |

---

## Engineering Phases

**Canonical roadmap:** `docs/ENGINEERING_ROADMAP.md`

### Phase 0 — Critical Security Fixes ✅ (before walkthrough)

Six Critical/High findings from `docs/SECURITY_THREAT_MODEL.md` — holder auth, admin PIN, zkLogin JWKS verification. Deploy before Phase 1.

### Phase 1 — Production Validation

**Before further code changes, prove what exists.**

One real end-to-end walkthrough with evidence at every step:
- Real Google account → zkLogin → Passport → admin approval → credential → GT enter
- Returning user (skip Passport, one evaluate call)
- Expired / revoked credential → back to Passport

Checklist: `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`  
Automated pre-check: `npm run audit:production`

**Bug fix rule:** If walkthrough uncovers bugs, fix only those bugs. Do not start Phase 2 until Path A + B pass.

---

### Phase 1.5 — Freeze

After walkthrough passes: release tag, freeze public APIs, credential/receipt schemas, partner callback contract, and DB schema (except migrations).

---

### Phase 2 — Protocol Hardening (after walkthrough + freeze)

Implement in this order (highest ROI first):

| Priority | Item | Stars | Why |
|----------|------|-------|-----|
| 1 | **Idempotency** | ⭐⭐⭐⭐⭐ | Duplicate receipts/credentials on page refresh breaks trust |
| 2 | **Unified audit trail** | ⭐⭐⭐⭐⭐ | One canonical stream; no stdout; reconstructable |
| 3 | **Policy versioning** | ⭐⭐⭐⭐⭐ | Immutable policy → version → decision → receipt chain |
| 4 | **Redirect recovery** | ⭐⭐⭐⭐☆ | Never leave user wondering if verification succeeded |
| 5 | **Public partner docs** | ⭐⭐⭐⭐☆ | Onboarding weeks → hours |
| 6 | **Rate limiting** | ⭐⭐⭐☆☆ | Important but easier than above |
| 7 | **Backward compatibility** | ⭐⭐⭐⭐⭐ | See `docs/BACKWARD_COMPATIBILITY_AUDIT.md` |

**Explicitly do NOT build yet:**
- More biometric signals
- More AI scoring
- Homepage redesigns
- More Passport UI features
- Additional verification methods

---

### Phase 3 — Partner SDK (partner #2)

- Developer SDK (config-driven)
- Self-service partner onboarding
- OpenAPI spec for all v1 endpoints
- Partner dashboard with verifier analytics

---

### Phase 4 — Passport Lifecycle Product

Present → renew → revoke → reissue → holder-facing history/audit

---

## Known Limitations (Honest)

1. Good Trouble is sandbox pilot — not production partner
2. Veriff disabled on production — manual IDV only
3. Zero credentials issued on production
4. ~~Admin PIN exposed in client bundle~~ — fixed in Phase 0 (server-only `ADMIN_PIN`)
5. Biometric audit events are stdout-only (not durable)
6. Policy updates overwrite in place (no version history)
7. Two integration models documented unevenly
8. No OpenAPI spec
9. No APM / time-series observability
10. Full user journey never walked end to end on production

---

## The One Question

> "Does this make it easier for the second partner to integrate?"

| Work item | Helps partner #2? |
|-----------|-------------------|
| Production walkthrough | Yes — proves the pattern works |
| Idempotency fixes | Yes — partners can retry safely |
| Unified audit trail | Yes — compliance requirement |
| Policy versioning | Yes — partners need immutable decisions |
| Rate limiting | Yes — protects shared infrastructure |
| Partner-flow docs | Yes — directly reduces integration time |
| Developer SDK | Yes — highest leverage for partner #2 |
| More biometric features | No |
| Homepage redesign | No |
| Good Trouble-specific hacks | No |

---

## Re-run Commands

```bash
npm test                                    # 355 automated tests
npm run biometric:validate-policy           # GT policy scenarios
npm run audit:production                    # Live HTTP probes
npx vitest run lib/partner/relyingPartyFlow.test.ts  # Partner flow tests
```

**Reports:**
- `docs/PRODUCTION_READINESS_AUDIT.md` — live HTTP evidence
- `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` — Phase 1 manual validation script
- `docs/VERIFICATION_V1_READINESS_REPORT.md` — biometric engine evidence
- `docs/PARTNER_FLOW_INTEGRATION.md` — partner flow architecture
- `docs/BACKWARD_COMPATIBILITY_AUDIT.md` — API/credential/receipt/migration compat
- `docs/PROTOCOL_MATURITY_AUDIT.md` — this document
