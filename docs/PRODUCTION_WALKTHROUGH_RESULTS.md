# Institutional Acceptance Test (IAT) — Results

**Document type:** Institutional Acceptance Test sign-off  
**Question answered:** _Would a regulated partner sign off on this protocol?_  
**Not:** A QA checklist asking "does it work?"

**Execution guide:** `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`  
**Trust Model:** `docs/TRUST_MODEL_V1.md`

---

## Run metadata

| Field | Value |
|-------|-------|
| **Deployment URL** | _e.g. https://abraxas-app.vercel.app_ |
| **Git commit** | _SHA on `main`_ |
| **Vercel deployment ID** | _from Vercel dashboard_ |
| **Date (UTC)** | _YYYY-MM-DD_ |
| **Tester** | _name / role_ |
| **Witness (optional)** | _advisor, design partner, security reviewer_ |
| **Environment** | production |
| **Migrations verified** | 049, 050, 051 |

**Pre-check (automated):**

```bash
npm test                              # regression suite
npm run audit:production              # live HTTP probes
npm run biometric:validate-policy     # GT policy scenarios
```

---

## Scenario results

Record one block per scenario. **Capture evidence — do not assert readiness without it.**

### Scenario A — New user → regulated purchase

| Field | Value |
|-------|-------|
| **Scenario** | New user → `regulated_purchase` → Passport → Trust Decision → signed receipt |
| **Expected result** | Approved Trust Decision + signed receipt; holder enters partner flow |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | _verification_request / evaluate correlation_ |
| **Decision ID** | _decision_id_ |
| **Receipt ID** | _dr_*_ |
| **Duration** | _e.g. 1.8s (evaluate → receipt)_ |
| **Evidence** | _Screenshot + network HAR + log excerpt_ |
| **Notes** | _Any deviations from spec_ |

**Protocol steps exercised:** Authorization → zkLogin → Passport creation → Consent → Policy evaluation → Trust Decision → Signed Receipt

---

### Scenario B — Returning user → credential-first

| Field | Value |
|-------|-------|
| **Scenario** | Returning user with valid credential → single evaluate → immediate enter |
| **Expected result** | `next: enter`; no Passport re-verification; one API call |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | |
| **Duration** | _e.g. 0.4s_ |
| **Evidence** | _Screenshot + network tab (single evaluate)_ |
| **Notes** | |

---

### Scenario C — Expired / revoked credential

| Field | Value |
|-------|-------|
| **Scenario** | Expired or revoked credential → re-routes to Passport |
| **Expected result** | Evaluate → `next: passport`; new credential after re-verification |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | _new receipt after re-verify_ |
| **Duration** | |
| **Evidence** | _Before/after credential status + flow screenshots_ |
| **Notes** | _Expired vs revoked sub-case_ |

---

### Scenario D — Failure recovery

| Field | Value |
|-------|-------|
| **Scenario** | Mid-capture interrupt, admin reject, redirect failure, expired session receipt |
| **Expected result** | Recoverable UX; no silent failure; idempotent retry where specified |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | |
| **Duration** | |
| **Evidence** | _Screenshots + refresh/retry logs_ |
| **Notes** | _Which sub-case(s) exercised_ |

---

## Supplementary protocol evidence

_Use when a regulated reviewer needs step-level proof beyond the four scenarios._

### Authorization & session

| Field | Value |
|-------|-------|
| **Scenario** | Partner authorization + zkLogin session binding |
| **Expected result** | Permission resolved; session requires verified JWT; no address-only mint |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | _N/A_ |
| **Duration** | |
| **Evidence** | |
| **Notes** | |

### Consent ceremony

| Field | Value |
|-------|-------|
| **Scenario** | Consent atomicity + idempotent retry |
| **Expected result** | Session required for preview; no duplicate claims on double-submit |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | _N/A_ |
| **Receipt ID** | _consent receipt_ |
| **Duration** | |
| **Evidence** | |
| **Notes** | |

### Decision retrieval & tenancy

| Field | Value |
|-------|-------|
| **Scenario** | Partner-scoped decision read; cross-partner blocked |
| **Expected result** | `GET /api/v1/verify/decisions/{id}` scoped; IDOR returns 403/404 |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | |
| **Duration** | |
| **Evidence** | |
| **Notes** | |

### Invalid / denied flow

| Field | Value |
|-------|-------|
| **Scenario** | Policy denial or invalid partner key |
| **Expected result** | Clear denial; no receipt issued; 401 on bad API key |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | _none expected_ |
| **Duration** | |
| **Evidence** | |
| **Notes** | |

### Observability

| Field | Value |
|-------|-------|
| **Scenario** | Audit events + logs sufficient to diagnose failure |
| **Expected result** | Evaluate, policy eval, receipt issuance visible in logs/audit |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | |
| **Decision ID** | |
| **Receipt ID** | |
| **Duration** | |
| **Evidence** | _Log excerpts (PII redacted)_ |
| **Notes** | _Known gaps documented_ |

---

## Defect log

| ID | Severity | Scenario | Description | Fix PR | Retest |
|----|----------|----------|-------------|--------|--------|
| | Critical / High / Medium / Low | | | | |

**Bug fix rule:** Fix only validated defects. Rerun affected scenario(s) before updating the summary below.

---

## Evidence index

| # | Type | Path / link | Scenario |
|---|------|-------------|----------|
| 1 | Screenshot | | |
| 2 | Network HAR | | |
| 3 | API response | | |
| 4 | Log excerpt | | |

---

## Institutional Acceptance Summary

**Release gate — single document for advisors, security reviewers, and design partners.**

Sign-off is based on **measurable thresholds**, not subjective approval.

### IAT release thresholds

| Metric | Target | Actual | Met? |
|--------|--------|--------|------|
| Critical defects | 0 | | |
| High defects | 0 | | |
| Regression suite | 100% passing | | |
| Security regressions | 0 | | |
| Data integrity issues | 0 | | |
| Reproducible failures | 0 | | |
| IAT scenarios (A–D exercised) | 100% pass | | |

### Scenario results

| Scenario | Result |
|----------|--------|
| **Scenario A** — New user → regulated purchase | _PASS / FAIL_ |
| **Scenario B** — Returning user → credential-first | _PASS / FAIL_ |
| **Scenario C** — Expired / revoked credential | _PASS / FAIL_ |
| **Scenario D** — Failure recovery | _PASS / FAIL_ |

| Defect class | Count |
|--------------|-------|
| Critical | 0 |
| High | 0 |
| Medium | _X_ |
| Low | _X_ |

### Recommendation

_Select one. All IAT release thresholds must be met to select "Ready to tag":_

- [ ] **Do not release** — any threshold not met
- [ ] **Ready to tag v1.0.0-beta.0** — all thresholds met; complete `PROTOCOL_COMPATIBILITY.md` + `RELEASE_DECISION.md` → tag
- [ ] **Ready to enter external security review** — P1 complete; review against Trust Model v1

---

## Signatories

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering | | | |
| Product | | | |
| Witness (optional) | | | |

---

## On pass — next gates

1. Create `docs/PROTOCOL_COMPATIBILITY.md` (public contract freeze)
2. Complete `docs/RELEASE_DECISION.md` (release sign-off)
3. Tag repository: **`v1.0.0-beta.0`** (canonical baseline — must include compatibility doc)
4. Begin P1-1: immutable policy versions
