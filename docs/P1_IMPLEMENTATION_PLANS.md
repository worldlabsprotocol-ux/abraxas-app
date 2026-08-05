# P1 Implementation Plans

**Status:** P1-1 implemented in code (migration 055 pending operator apply). See `docs/POLICY_VERSION_OPERATOR.md`.  
**Prerequisite for P1-2+:** IAT passed, `PROTOCOL_COMPATIBILITY.md` complete, `RELEASE_DECISION.md` signed.

---

## P1-1 — Immutable policy versions

**Problem:** `partner_policies.rules_json` can be updated in place. Receipts pin `policy_version` but content may drift.

**Approach:**
- New row per version; monotonic `version` integer per `policy_id`
- `UPDATE` of `rules_json` on existing rows forbidden at service layer
- `createVerificationRequest` / `evaluatePartnerFlow` / `issueReceiptForDecision` pin `policy_version` at decision time
- Migration: snapshot current rows as version 1; document baseline

**Regression tests:** Update policy → old decision still evaluates against pinned version; new decisions use new version.

**Exit:** No in-place `UPDATE` of `rules_json`; decisions reproducible against exact policy that produced them.

---

## P1-2 — Trust Decision validity

**Problem:** API may return `approved` when receipt is no longer valid (expired credential, revoked, policy re-eval).

**Approach:**
- Integrate `resolveReceiptValidity` into Trust Decision builder
- Expose `currently_valid: boolean` on `GET /api/v1/verify/decisions/{id}` and status route
- Document partner obligation: check validity at settlement, not just at issue

**Regression tests:** Expired credential → `decision: approved` but `currently_valid: false`.

**Exit:** API semantics match operational reality; partners cannot be misled by stale approvals.

---

## P1-3 — Partner-flow observability

**Problem:** Partner-flow routes lack unified audit trail; `logPartnerUsage` incomplete on evaluate/complete/refresh.

**Approach:**
- `logPartnerUsage` on all `/api/v1/partner-flow/*` routes
- `appendAuditEvent` for evaluate, complete, refresh, denied
- Correlate `partner_id`, `decision_id`, `receipt_id`, `verification_request_id` in metadata

**Regression tests:** Each route emits audit + usage log on success and failure.

**Exit:** Institutions can query partner activity end-to-end.

---

## P1-4 — Biometric telemetry persistence

**Problem:** Biometric analysis logs to stdout; not durable for compliance or debugging.

**Approach:**
- Persist `biometric.analyzed` events to durable store (existing audit table or dedicated telemetry table)
- Retain PII minimization — signals and scores, not raw images
- Admin queue reads from same source

**Regression tests:** Capture → analysis event queryable; no stdout-only dependency.

**Exit:** Telemetry survives deploy restarts; diagnosable in production.

---

## Sequence

```
v1.0.0-beta.0 tagged
    ↓
P1-1 → P1-2 → P1-3 → P1-4
    ↓
Ready to enter external security review
```
