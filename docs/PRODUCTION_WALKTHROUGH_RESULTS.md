# Institutional Acceptance Test (IAT) — Results

**Document type:** Institutional Acceptance Test sign-off  
**Question answered:** _Would a regulated partner sign off on this protocol?_  
**Not:** A QA checklist asking "does it work?"

**Execution guide:** `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`  
**Trust Model:** `docs/TRUST_MODEL_V1.md`  
**Automated companion:** `docs/IAT_AUTOMATED_COMPANION.md`

---

## Automated IAT companion (read-only pre-check)

**Recorded run (UTC):** 2026-08-06T01:52:39.653Z  
**Command:**

```bash
IAT_BASE_URL=https://abraxasworld.xyz npm run iat:automated
```

| Field | Value |
|-------|-------|
| **Base URL** | https://abraxasworld.xyz |
| **Exit code** | 0 |
| **PASS** | 20 |
| **FAIL** | 0 |
| **PENDING** | 0 |
| **HUMAN_REQUIRED** | 1 |
| **Full IAT claimed** | **No** |
| **Scenario A** | **Human-required** (browser OAuth, consent, capture, admin approval) |

**Artifacts (local runner output — not committed; no secrets, user IDs, or callback tokens):**

- `reports/iat-automated/iat-automated-2026-08-06T01-52-39-653Z.md` — human-readable summary + Scenario A evidence template (fields unfilled)
- `reports/iat-automated/iat-automated-2026-08-06T01-52-39-653Z.json` — machine-readable check list + empty Scenario A template

**Scope:** Read-only production probes only (compatibility manifest, canonical origin, Good Trouble pilot URLs, public route reachability, signing status, integration preflight aggregate, receipt-validation contract fixtures, stale-host scan, audit-trace command readiness). Does **not** create verification requests, sign in, consent, capture identity, approve users, or mutate Supabase.

**IAT status unchanged:** Scenarios A–D **not executed**. This entry records automated infrastructure evidence only — not IAT sign-off.

---

## Run metadata

| Field | Value |
|-------|-------|
| **Deployment URL** | https://abraxasworld.xyz |
| **Git commit** | `5207736b175026c0ed8a86a89393de4735b73d46` |
| **Vercel deployment ID** | GitHub deployment `5721852531` (Production) |
| **Production promoted at (UTC)** | 2026-08-03T06:26:58Z |
| **Source branch** | `cursor/beta-gate-evidence-d541` (not yet merged to `main`; `main` at `f1cad49`) |
| **Date (UTC)** | 2026-08-03 |
| **Tester** | Cloud agent — automated smoke only; IAT scenarios require human browser |
| **Witness (optional)** | _pending_ |
| **Environment** | production |
| **Migrations verified** | _not verified in this run — operator confirm 049, 050, 051 in Supabase_ |

**Deployment identity verification:**

| Prerequisite | In deployed SHA? | Evidence |
|--------------|------------------|----------|
| PR #101 `residency_country` issuance | **Yes** | `residencyCountryClaim` in `lib/credentials/claimSchema.ts` at `5207736` |
| PR #102 beta-gate / audit-trace | **Yes** | `5207736` = tip of `cursor/beta-gate-evidence-d541`; includes `rejectMismatchedClientFlowTrace` |

**Pre-check (automated — 2026-08-04 UTC):**

```bash
BETA_GATE_BASE_URL=https://abraxasworld.xyz npm run gate:preflight
```

| Status | Count | Items |
|--------|-------|-------|
| **PASS** | 4 | Regression subset (protocol + validity + partner audit + GT wiring); Trust Decision fixture verification; production signing configured (`GET /api/trust/status` → `signing=true`); partner-flow evaluate reachable (HTTP 405) |
| **PENDING** | 3 | Local runner secrets unavailable (`ABRAXAS_SIGNING_KEY`, `ABRAXAS_BROWSER_SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); human IAT (`docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md`); `v1.0.0-beta.0` tag (awaiting IAT pass + `RELEASE_DECISION.md`) |
| **BLOCKED** | 1 | Independent external security review (no report artifact) |
| **FAIL** | 0 | — |

**Overall automated preflight:** PASS (exit code 0).

**Production deployment at preflight:** `bc43284d79cbdeb9c084ace9ddcfa82696480e1f` (promoted 2026-08-04T04:00:46Z) — includes PR #106 Good Trouble checkout entry (`/good-trouble/checkout`).

**IAT identity note:** Use a **new Google account** registered under the current production OAuth client (540…). Legacy DGV test identity (187… client era) is incompatible with the new OAuth client — not a global Scenario A blocker.

---

**Pre-check (automated — 2026-08-03 UTC):**

```bash
BETA_GATE_BASE_URL=https://abraxasworld.xyz npm run gate:preflight
# pass: 4, fail: 0, pending: 3, blocked: 1
# ✓ Regression subset · ✓ Trust Decision fixture · ✓ signing_configured=true · ✓ partner-flow evaluate HTTP 405

AUDIT_BASE_URL=https://abraxasworld.xyz npm run audit:production
# PASS: 15  PARTIAL: 1  FAIL: 0  SKIP: 9
# Report: production-readiness-audit.json (audited_at 2026-08-03T06:34:17Z)
```

| Endpoint | HTTP | Result |
|----------|------|--------|
| `GET /api/trust/status` | 200 | `signing_configured: true`, `veriff_api_configured: false` |
| `GET /api/metrics/public` | 200 | `active_credentials: 0` |
| `POST /api/v1/partner-flow/evaluate` (no session) | 401 | `Sign in required in this browser` |
| `POST /api/v1/partner-flow/complete` (no session) | 401 | auth required |
| `POST /api/v1/partner-flow/refresh` (no session) | 401 | auth required |
| `GET /api/receipts/dr_missing/public` | 404 | expected |
| Passport IDV session | 503 | `idv_provider: manual`, `manual_review_mode` (PARTIAL) |

**IAT status:** Scenarios A–D **not executed** in this run — requires human browser, Google OAuth, document capture, and admin approval.

---

## Release source alignment (pre-IAT)

**Goal:** `main` must contain the same application tree as production deploy `5207736…` before tagging or claiming gate pass.

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Merge **PR #101** (`cursor/residency-country-wiring-d541`) → `main` | Fast-forward to `672432a` (2 commits); `mergeStateStatus: CLEAN` |
| 2 | Merge **PR #102** (`cursor/beta-gate-evidence-d541`) → `main` | Fast-forward to `cafcdcd` (4 additional commits on top of #101); `mergeStateStatus: CLEAN` |
| 3 | **Rebase #102 after #101?** | **Not required** — #102 was branched from #101 tip (`672432a`); simulated merge is fast-forward with no conflicts |
| 4 | Application tree vs production | After step 2, non-doc tree **identical** to deployed `5207736` (docs-only delta: `cafcdcd` smoke evidence in `PRODUCTION_WALKTHROUGH_RESULTS.md`) |
| 5 | Post-merge deploy | Deploy `main` tip; confirm GitHub Production deployment SHA matches merge result before IAT |

**Do not merge only #102 without closing #101** if you want PR-level traceability — but #102 already contains all #101 commits. Merging #102 alone would also land the full production tree.

**Current divergence:** Production = branch deploy `5207736`; `main` = `f1cad49`; PR #101 and #102 remain OPEN.

---

## IAT evidence capture template

Record for **every scenario** (IDs only — no PII):

| Field | Source | Example |
|-------|--------|---------|
| **Deployed SHA** | Vercel / GitHub deployment | `5207736…` |
| **Production timestamp (UTC)** | Deployment promoted_at | `2026-08-03T06:26:58Z` |
| **Verification request ID** | evaluate `verification_request_id` or passport `verify_request` param | UUID |
| **Decision ID** | complete/evaluate response or callback `decision_id` | UUID |
| **Receipt ID** | callback `receipt_id` or `GET /api/receipts/{id}/public` | `dr_*` |
| **Flow trace ID** | evaluate/complete response `flow_trace_id` | `ft_vr_{verification_request_id}` |
| **Credential JTI** | callback `credential_id` (if issued) | from callback only |
| **Outcome** | Pass / Fail | |
| **Evidence ref** | Screenshot #, HAR path, network tab timestamp | Evidence index # |

### Pass / fail criteria (Scenarios A–D)

| Scenario | **PASS** requires | **FAIL** if |
|----------|-------------------|-------------|
| **A** — New user | zkLogin session → evaluate `passport` → consent → capture → admin approve → `residency_country` in issued claims → evaluate/complete `enter` → callback with `decision_id` + `dr_*` → `GET /api/receipts/{id}/public` → `signature_valid: true` → shared `flow_trace_id` across evaluate + complete audit events | Any step blocked; missing claim; denied at policy; invalid signature; silent `/complete` failure |
| **B** — Returning user | Single `POST evaluate` → `next: enter` (no passport); one network evaluate call; receipt issued | Second passport trip; multiple evaluate calls; denied |
| **C** — Expired/revoked | Expired or revoked credential → evaluate `passport`; after re-verify new `jti` + new `dr_*` | Stale credential accepted; no re-route to passport |
| **D** — Failure recovery | Recoverable UX for interrupt/reject/refresh; duplicate `complete` returns same receipt; refresh re-issues when session receipt expired | Silent failure; unhandled error; duplicate receipt on idempotent complete |

### Audit-event query evidence (P1-3)

After Scenario A (or any full flow), run in Supabase SQL editor (replace IDs):

```sql
-- Correlation by server-derived flow trace
SELECT id, action, object_type, object_id, policy_id, created_at,
       metadata->>'flow_trace_id' AS flow_trace_id,
       metadata->>'partner_id' AS partner_id,
       metadata->>'outcome' AS outcome,
       metadata->>'verification_request_id' AS verification_request_id,
       metadata->>'decision_id' AS decision_id,
       metadata->>'receipt_id' AS receipt_id
FROM audit_events
WHERE metadata->>'flow_trace_id' = 'ft_vr_<VERIFICATION_REQUEST_ID>'
ORDER BY created_at;

-- All partner-flow steps in window
SELECT action, metadata->>'flow_trace_id', metadata->>'outcome', created_at
FROM audit_events
WHERE action LIKE 'partner_flow.%'
  AND created_at > now() - interval '2 hours'
ORDER BY created_at;
```

| Audit check | **PASS** | **FAIL** |
|-------------|----------|----------|
| Flow trace correlation | Same `flow_trace_id` on `partner_flow.evaluate` and `partner_flow.complete` for one verification request | Mismatched or missing `flow_trace_id` |
| Evaluate step | `partner_flow.evaluate` row with `outcome` = `passport` or `enter` | No evaluate audit row after successful evaluate |
| Complete step | `partner_flow.complete` with `receipt_id` when entering partner | Missing complete audit after successful flow |
| Client trace rejected | Mismatching client `flow_trace_id` → HTTP 400, attacker trace not in DB | Arbitrary client trace persisted |

Paste query result row count + sample `action`/`flow_trace_id` values into Observability supplementary section (redact `actor_id` if needed).

---

## Scenario results

Record one block per scenario. **Capture evidence — do not assert readiness without it.**

### Scenario A — New user → regulated purchase

| Field | Value |
|-------|-------|
| **Scenario** | New user → `regulated_purchase` → Passport → Trust Decision → signed receipt |
| **Expected result** | Approved Trust Decision + signed receipt; holder enters partner flow |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | _verification_request UUID_ |
| **Decision ID** | _decision_id UUID_ |
| **Receipt ID** | _dr_*_ |
| **Flow trace ID** | _ft_vr_{verification_request_id} — must match evaluate + complete audit_ |
| **Deployed SHA** | _confirm matches post-merge production deploy_ |
| **Duration** | _e.g. 1.8s (evaluate → receipt)_ |
| **Pass?** | _Pass only if all Scenario A criteria met_ |
| **Evidence** | _Screenshot + network HAR + audit query excerpt_ |
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
| **Flow trace ID** | _ft_rc_* or ephemeral if no verification request_ |
| **Pass?** | _Pass only if single evaluate → enter_ |
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
| **Request ID** | _new verification_request after re-route_ |
| **Decision ID** | |
| **Receipt ID** | _new dr_* after re-verify_ |
| **Flow trace ID** | _ft_vr_{new verification_request_id}_ |
| **Pass?** | _Pass only if expired/revoked forces passport + new credential/receipt_ |
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
| **Receipt ID** | _same dr_* on duplicate complete; new dr_* on refresh if expired_ |
| **Flow trace ID** | _per sub-case — record for refresh/complete calls_ |
| **Pass?** | _Pass only if recovery/idempotency criteria met (see pass/fail table)_ |
| **Duration** | |
| **Evidence** | _Screenshots + refresh/retry logs + network tab_ |
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
| **Flow trace ID** | _ft_rc_* or ephemeral if no verification request_ |
| **Pass?** | _Pass only if single evaluate → enter_ |
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
| **Expected result** | `partner_flow.evaluate` + `partner_flow.complete` share `flow_trace_id`; receipt issuance auditable |
| **Actual result** | _Pass / Fail_ |
| **Request ID** | _from audit metadata_ |
| **Decision ID** | _from audit metadata_ |
| **Receipt ID** | _from audit metadata_ |
| **Flow trace ID** | _must equal ft_vr_{verification_request_id}_ |
| **Audit query rows** | _count from SQL above_ |
| **Evidence** | _SQL result excerpt (PII redacted) — action + flow_trace_id columns_ |
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
