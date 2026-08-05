# Release Decision — v1.0.0-beta.0

**Purpose:** One-page record of why this version exists and what remains intentionally deferred.  
**Audience:** Future engineers, advisors, security reviewers, design partners  
**Status:** _Draft — complete when tagging v1.0.0-beta.0_

---

## Why this release exists

> v1.0.0-beta.0 establishes the first stable protocol baseline. It freezes the public contract after successful institutional acceptance testing and P0 hardening. This release is intended for controlled pilots and serves as the reference point for future compatibility. Remaining work focuses on protocol integrity, observability, and operational maturity rather than expanding functionality.

---

## Current readiness

| Layer | Status |
|-------|--------|
| Architecture | Complete (v3 frozen) |
| Engine | Complete |
| P0 hardening | Complete |
| Threat Model v1 | Complete (`docs/TRUST_MODEL_V1.md`) |
| Institutional Acceptance Test | _Pass / Fail_ (`docs/PRODUCTION_WALKTHROUGH_RESULTS.md`) |
| Protocol Compatibility | _Pending / Complete_ (`docs/PROTOCOL_COMPATIBILITY.md`) |
| Regression suite | _Pass / Fail_ (`npm test`) |
| P1 hardening | P1-2 + P1-3 merged (code); P1-1 + P1-4 pending |

---

## v1.0.0-beta.0 snapshot criteria

All must be true before tagging:

- [x] Architecture frozen
- [x] P0 complete
- [ ] Institutional Acceptance Test passed
- [x] Threat Model v1 complete
- [ ] Protocol Compatibility document complete
- [ ] Regression suite passing
- [ ] Tagged `v1.0.0-beta.0`

This tag is the **canonical known-good baseline** — the complete public contract snapshot before P1 changes.

### IAT release thresholds

Sign-off requires **measurable thresholds**, not subjective "looks good." All must meet target:

| Metric | Target | Actual |
|--------|--------|--------|
| Critical defects | 0 | |
| High defects | 0 | |
| Regression suite | 100% passing | |
| Security regressions | 0 | |
| Data integrity issues | 0 | |
| Reproducible failures | 0 | |
| IAT scenarios (A–D exercised) | 100% pass | |

---

## Known limitations (intentionally deferred to P1+)

| Limitation | Target |
|------------|--------|
| Immutable policy versions — code merged; migration 055 operator apply pending | P1-1 (PR pending) |
| Biometric telemetry persistence pending | P1-4 |

**Merged (code on main):** P1-2 validity/idempotency (PR #113), P1-3 partner-flow audit traceability (PR #114). Operator migrations 053/054 and IAT evidence still required.

---

## Risk assessment

| Suitability | Assessment |
|-------------|------------|
| **Suitable for** | Controlled pilots with one relying party (Good Trouble reference flow) |
| **Not yet suitable for** | Institutional production deployment |
| **Not yet suitable for** | General availability |

Production readiness score at tag time: **68/100** (post-P0). See `docs/PRODUCTION_READINESS_AUDIT.md`.

---

## Decision

| Field | Value |
|-------|-------|
| **Release status** | `v1.0.0-beta.0` |
| **Approval date** | _YYYY-MM-DD_ |
| **Commit hash** | _SHA on `main`_ |
| **Tag** | `v1.0.0-beta.0` |
| **Deployment URL** | _production URL at tag time_ |

### Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product | | |

---

## What happens next

```
v1.0.0-beta.0 tagged
        ↓
P1-1 Immutable policies → P1-2 Validity → P1-3 Observability → P1-4 Telemetry
        ↓
Ready to enter external security review (against Trust Model v1)
        ↓
v1.0.0-beta
```

**Note:** "Ready to enter external security review" means the review is expected to uncover issues — not that the system is finished.
