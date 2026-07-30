# Production Walkthrough Results

**Purpose:** Institutional acceptance test — prove the protocol behaves exactly as specified.  
**Checklist:** `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`  
**Trust Model:** `docs/TRUST_MODEL_V1.md`

---

## Run metadata

| Field | Value |
|-------|-------|
| **Deployment URL** | _e.g. https://abraxas-app.vercel.app_ |
| **Git commit / deploy ID** | _Vercel deployment SHA_ |
| **Date (UTC)** | _YYYY-MM-DD_ |
| **Tester** | _name_ |
| **Environment** | production |
| **Migrations verified** | 049, 050, 051 |

---

## Summary verdict

| Area | Result | Evidence section |
|------|--------|------------------|
| Authorization request | ⏳ | §1 |
| zkLogin / session | ⏳ | §2 |
| Passport creation (new user) | ⏳ | §3 |
| Consent ceremony | ⏳ | §4 |
| Policy evaluation | ⏳ | §5 |
| Trust Decision | ⏳ | §6 |
| Signed Receipt | ⏳ | §7 |
| Decision retrieval | ⏳ | §8 |
| Expiry behavior | ⏳ | §9 |
| Invalid / denied flow | ⏳ | §10 |
| Retry / idempotency | ⏳ | §11 |
| Audit events | ⏳ | §12 |
| Logs / observability | ⏳ | §13 |
| Failure cases | ⏳ | §14 |
| Path A — New user | ⏳ | §3, §5–§7 |
| Path B — Returning user | ⏳ | §8 |
| Path C — Expired / revoked | ⏳ | §9 |
| Path D — Redirect recovery | ⏳ | §11 |
| **Production blockers** | _None / Listed_ | §Blockers |

**Verdict:** _Not ready / Walkthrough passed — proceed to API freeze + P1_

---

## §1 — Authorization request

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | `POST /api/v1/verify/authorize` or partner evaluate with `permission` | 200, `decision_id` or `next` step | | |
| | Permission resolved | `regulated_purchase` → GT policy | | |
| | Partner API key (if required) | Accepted / rejected correctly | | |

**Request ID / correlation:**  
**Screenshot / network capture:**  
**Anomalies:**

---

## §2 — zkLogin / session

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Google OAuth sign-in | Redirect completes | | |
| | `GET /api/auth/zklogin/me` | 200, address bound | | |
| | Browser session cookie | `HttpOnly`, set | | |
| | Session without valid JWT | Rejected (no mint from address alone) | | |

**Wallet address:**  
**oauth_sub (redacted):**  
**Anomalies:**

---

## §3 — Passport creation (new user)

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Redirect to `/passport?verify_request=...` | URL contains request ID | | |
| | Document capture | 200, stored | | |
| | Biometric capture | Assessment queued | | |
| | Admin approve | `jti` issued | | |
| | Credential row | `abraxas_credentials` created | | |

**verify_request ID:**  
**credential jti:**  
**Anomalies:**

---

## §4 — Consent ceremony

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | `GET /api/v1/verification-requests/{id}` | 200 **with session only** | | |
| | Consent submit | Atomic; no duplicate claims on retry | | |
| | Consent receipt | Issued once | | |
| | Race / double-submit | Second attempt idempotent or rejected cleanly | | |

**verification_request ID:**  
**consent_receipt ID:**  
**Anomalies:**

---

## §5 — Policy evaluation

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | `POST /api/v1/partner-flow/evaluate` | Unified eval path | | |
| | Policy + version pinned | `policy_id`, `policy_version` in response | | |
| | Sandbox vs production | `decision_context` correct | | |
| | Denied case (if tested) | Clear `reason_codes` | | |

**policy_id:**  
**policy_version:**  
**evaluate response (snippet):**  
**Anomalies:**

---

## §6 — Trust Decision

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Decision created | `decision_id` returned | | |
| | `GET /api/v1/verify/decisions/{id}` | Partner-scoped read | | |
| | Decision payload | `approved` / `denied`, claim refs only | | |
| | Cross-partner read | 403 / 404 (IDOR blocked) | | |

**decision_id:**  
**Trust Decision JSON (snippet):**  
**Anomalies:**

---

## §7 — Signed Receipt

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Receipt issued | `receipt_id` (`dr_*`) | | |
| | `GET /api/receipts/{id}/public` | `signature_valid: true` | | |
| | Canonical payload | `policy_version`, `schema_version` present | | |
| | Callback URL | No PII — only `receipt_id`, `status`, `credential_id` | | |

**receipt_id:**  
**signature_valid:**  
**Anomalies:**

---

## §8 — Decision retrieval

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Partner `getDecision` / status route | Same decision, scoped | | |
| | Returning user (Path B) | Single evaluate → immediate enter | | |
| | Unauthenticated decision fetch | Blocked where required | | |

**Anomalies:**

---

## §9 — Expiry behavior

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Expired credential | Re-routes to Passport | | |
| | Expired session receipt | Refresh or re-eval per policy | | |
| | `valid_until` in receipt | Honored at settlement | | |

**Anomalies:**

---

## §10 — Invalid / denied flow

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Under-age / policy deny | Clear denial, no receipt | | |
| | Revoked credential | Re-verification required | | |
| | Invalid partner key | 401 | | |

**Anomalies:**

---

## §11 — Retry / idempotency

| Timestamp (UTC) | Step | Expected | Actual | Pass? |
|-----------------|------|----------|--------|-------|
| | Duplicate `partner-flow/complete` | Same receipt, no duplicate row | | |
| | Consent retry | Idempotent | | |
| | `POST /api/v1/partner-flow/refresh` | New receipt if expired | | |

**Anomalies:**

---

## §12 — Audit events

| Timestamp (UTC) | Event type | Source | Recorded? |
|-----------------|------------|--------|-----------|
| | | | |
| | | | |

**Query / table used:**  
**Gaps:**

---

## §13 — Logs / observability

| Signal | Present? | Sufficient to diagnose failure? | Notes |
|--------|----------|-----------------------------------|-------|
| Partner evaluate | | | |
| Policy evaluation | | | |
| Receipt issuance | | | |
| Biometric analysis | | | |
| Error paths | | | |

**Log excerpts (redact PII):**

---

## §14 — Failure cases

| Scenario | Expected behavior | Actual | Pass? |
|----------|-------------------|--------|-------|
| Mid-capture browser close | Resume or clean restart | | |
| Admin reject | User message, resubmit path | | |
| Redirect failure | Recovery UI | | |

**Anomalies:**

---

## Blockers

_List production-blocking issues. Fix only validated defects; rerun affected sections before sign-off._

| ID | Severity | Description | Fix PR |
|----|----------|-------------|--------|
| | | | |

---

## Evidence index

| # | Type | Path / link | Covers |
|---|------|-------------|--------|
| 1 | Screenshot | | |
| 2 | Network HAR | | |
| 3 | API response | | |

---

## Sign-off

| Role | Name | Date | Walkthrough passed? |
|------|------|------|---------------------|
| Engineering | | | |
| Product | | | |

**On pass:** Create `docs/PROTOCOL_COMPATIBILITY.md` (API freeze) → begin P1-1 immutable policy versions.
