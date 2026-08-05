# External Security Review — Readiness Package (beta)

**Status:** Readiness package only — **no independent security review has been performed** as part of this repository or this pull request.

**Baseline:** `origin/main` after merge of PR #114 (Partner Flow observability / audit evidence).  
**Target environment for live probes:** `https://abraxasworld.xyz` (production beta).  
**Artifact type:** Documentation and reproducible verification commands only — **no runtime code changes**.

---

## Purpose

This package helps an **external** security reviewer understand Abraxas Verify trust boundaries, locate controls in code, run reproducible checks, and report findings with consistent severity. It is a handoff index, not a penetration-test report or certification.

---

## Package contents

| Document | Audience | Contents |
|----------|----------|----------|
| [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md) | Reviewers | Architecture, trust boundaries, auth, receipts, partner flow, audit, Supabase |
| [THREAT_MODEL_EVIDENCE_MATRIX.md](./THREAT_MODEL_EVIDENCE_MATRIX.md) | Reviewers | STRIDE threats mapped to code paths and tests |
| [REPRO_COMMANDS.md](./REPRO_COMMANDS.md) | Reviewers / operators | Static checks, targeted tests, preflight, trace audit |
| [BETA_LIMITATIONS_AND_SCOPE.md](./BETA_LIMITATIONS_AND_SCOPE.md) | Reviewers / product | Known beta gaps and explicit out-of-scope areas |
| [REVIEWER_CHECKLIST.md](./REVIEWER_CHECKLIST.md) | Reviewers | Pre-review checklist, severity rubric, reporting template |

---

## Related in-repo references

| Document | Path |
|----------|------|
| STRIDE threat model (design review) | `docs/SECURITY_THREAT_MODEL.md` |
| Trust Model v1 | `docs/TRUST_MODEL_V1.md` |
| Claim contract matrix | `docs/CLAIM_MATRIX.md` |
| Partner Flow integration | `docs/PARTNER_FLOW_INTEGRATION.md` |
| Integration preflight operator doc | `docs/INTEGRATION_PREFLIGHT.md` |
| zkLogin operator setup | `docs/ZKLOGIN_BACKEND_SETUP.md` |
| Production walkthrough (IAT) | `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |

---

## Review completion criteria (external)

This gate is satisfied only when:

1. An **independent** reviewer delivers a written report (signed memo or PDF).
2. Critical/High findings are resolved or accepted with documented disposition in `docs/RELEASE_DECISION.md`.
3. The report reference and reviewed commit SHA are recorded by the operator.

Until then: treat external review as **not completed**.
