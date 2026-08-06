# Release Readiness — Beta Gate Reconciliation

**Last updated:** 2026-08-06  
**Canonical production origin:** `https://abraxasworld.xyz`  
**Runnable check:** `npm run release:readiness` (read-only — never mutates Supabase or production)

This document reconciles release-gate evidence across walkthrough results, beta gate matrix, release decision, security review package, and partner onboarding docs. **It is not a release sign-off.**

---

## Status buckets (honest separation)

| Bucket | Meaning | Current state |
|--------|---------|---------------|
| **Implemented and deployed** | Merged code, contract tests, integration preflight, production signing probes | **Mostly PASS** — protocol + Partner Flow + P1-2/P1-3 code on `main`; operator must confirm deploy SHA |
| **IAT evidence recorded** | Sanitized automated companion run + partial doc entries | **Partial** — automated companion recorded 2026-08-06; Scenario A–D human results **unsigned** |
| **Human evidence still required** | Browser IAT, migrations, deploy SHA, audit trace on real flows | **Required** — see `docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md` |
| **Independent security review pending** | Written third-party report + disposition | **Blocked** — readiness package only (`docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md`) |
| **Second relying-party pilot pending** | Non–Good Trouble partner provisioned + live pilot | **Pending** — runbook: `docs/SECOND_PARTNER_PILOT_RUNBOOK.md` |
| **Beta tag pending** | `v1.0.0-beta.0` after all gates | **Pending** — do not tag |

**Explicitly not complete:** full IAT · independent security review · `v1.0.0-beta.0` tag · second partner pilot.

---

## Evidence sources (reconciled)

| Document | Role | Reconciled status |
|----------|------|-------------------|
| `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` | IAT results + automated companion entry | Automated companion PASS (20/0/0/1 HUMAN_REQUIRED); Scenarios A–D **not executed** |
| `docs/BETA_GATE_EVIDENCE.md` | Gate matrix + commands | Code gates live; IAT + security + tag pending |
| `docs/RELEASE_DECISION.md` | Release sign-off draft | **Draft** — IAT and tag unchecked |
| `docs/EXTERNAL_SECURITY_REVIEW_PACKAGE.md` | Reviewer handoff | **No review performed** |
| `docs/PARTNER_ONBOARDING_CHECKLIST.md` | Operator provisioning | Current — use with second-partner runbook |
| `docs/PARTNER_FLOW_REFERENCE_INTEGRATION.md` | Generic RP integration + conformance | Current — conformance does not provision partners |

---

## `npm run release:readiness`

Read-only aggregation. Exit code **1** only on **FAIL** (e.g. regression or preflight failure). **PENDING**, **HUMAN_REQUIRED**, and **BLOCKED** do not fail the command.

```bash
# Static + walkthrough parse (no live HTTP)
npm run release:readiness

# Include live production probes (signing + optional IAT companion)
RELEASE_READINESS_BASE_URL=https://abraxasworld.xyz npm run release:readiness

# Include automated IAT companion (read-only HTTP; slower)
RELEASE_READINESS_BASE_URL=https://abraxasworld.xyz RELEASE_READINESS_RUN_IAT=1 npm run release:readiness
```

**Guardrails enforced by the runner:**

- Never mutates Supabase or production
- Never claims full IAT pass unless `docs/PRODUCTION_WALKTHROUGH_RESULTS.md` contains Scenario A `decision_id`, `receipt_id` (`dr_*`), `signature_valid: true` proof, callback proof, matching `flow_trace_id`, and Scenarios A–D marked PASS
- Never claims security review complete unless `reports/external-security-review/independent-review.md` exists (or `SECURITY_REVIEW_ARTIFACT_PATH`)

---

## Operator actions before beta tag

1. Merge and deploy target release SHA; record in walkthrough + release decision
2. Confirm Supabase migrations (049–055 as applicable) applied
3. Execute human IAT Scenarios A–D on production; fill evidence tables with IDs only (no PII)
4. Run `npm run audit:partner-flow-trace -- ft_vr_<verification_request_id>` after Scenario A
5. Complete second-partner pilot per `docs/SECOND_PARTNER_PILOT_RUNBOOK.md`
6. Commission independent security review; store report at `reports/external-security-review/independent-review.md`
7. Sign `docs/RELEASE_DECISION.md` — then and only then consider `v1.0.0-beta.0`

---

## Related commands

| Command | Purpose |
|---------|---------|
| `npm run gate:preflight` | Beta gate pre-IAT checks |
| `IAT_BASE_URL=https://abraxasworld.xyz npm run iat:automated` | Read-only automated IAT companion |
| `npm run integration:preflight` | Integration contract preflight |
| `npm run partner:conformance` | Partner Flow Conformance Kit (after provisioning) |
| `npm run audit:partner-flow-trace -- ft_vr_<id>` | Audit trace correlation (read-only Supabase query) |
