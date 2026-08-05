# External Security Review — Checklist and Reporting Guidance

**Disclaimer:** Completing this checklist does **not** constitute an independent security review. Only a qualified external reviewer's written report satisfies the release gate.

---

## Pre-review checklist (operator)

Before engaging the reviewer, confirm:

- [ ] Reviewer has access to this repository (or an agreed snapshot at a pinned commit SHA).
- [ ] Deployed production SHA is recorded and matches the code under review.
- [ ] `docs/external-security-review/` package is at the reviewed commit.
- [ ] Reviewer has read `README.md` disclaimer (no review claimed).
- [ ] Staging or read-only Supabase credentials provisioned **if** live trace audit / preflight with DB is in scope.
- [ ] Sample non-PII artifacts available: `receipt_id`, `flow_trace_id`, `verification_request_id` (from test/sandbox flows).
- [ ] Migrations 053 and 054 application status documented for target environment.
- [ ] Signing keys (`ABRAXAS_SIGNING_KEY`, `ABRAXAS_BROWSER_SESSION_SECRET`) confirmed configured in production (`/api/trust/status`).

---

## Pre-review checklist (reviewer)

- [ ] Read [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md) and `docs/SECURITY_THREAT_MODEL.md`.
- [ ] Read [BETA_LIMITATIONS_AND_SCOPE.md](./BETA_LIMITATIONS_AND_SCOPE.md) — do not re-report known documented gaps without retest.
- [ ] Run [REPRO_COMMANDS.md](./REPRO_COMMANDS.md) static block (`npm ci`, `lint`, `tsc`, targeted tests).
- [ ] Map findings to [THREAT_MODEL_EVIDENCE_MATRIX.md](./THREAT_MODEL_EVIDENCE_MATRIX.md) rows.
- [ ] Separate **code defects** from **operational / config** issues.
- [ ] Do not include holder PII, API keys, or session cookies in the report.

---

## Review focus areas (minimum)

| # | Area | Key questions |
|---|------|----------------|
| 1 | zkLogin / OAuth | Can an attacker mint a browser session without a valid Google `id_token`? |
| 2 | Browser session | Cookie forgery, fixation, TTL, binding to registered identity? |
| 3 | Receipt signatures | Canonical payload coverage, key rotation, algorithm agility? |
| 4 | Public receipt API | PII leakage, unauthorized claim disclosure, IDOR beyond capability URL model? |
| 5 | Partner API keys | Scope isolation, storage, rotation, timing attacks? |
| 6 | Return URL allowlist | Open redirect, parser differentials, DB tampering impact? |
| 7 | Idempotency | Duplicate receipts, race conditions, conflict handling? |
| 8 | Audit trail | Tampering, omission, PII in metadata, trace correlation correctness? |
| 9 | Service role | Any path exposing `SUPABASE_SERVICE_ROLE_KEY` or bypassing app auth? |
| 10 | Admin / IDV | Privilege escalation, unauthenticated sync, approval bypass? |

---

## Severity rubric

Use this rubric for consistency with `docs/SECURITY_THREAT_MODEL.md` and release gating.

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Unauthenticated remote compromise of signing keys, mass credential issuance, or full database read/write | Service role key in client bundle; unsigned admin approve |
| **High** | Unauthenticated or holder-level bypass of partner trust decisions; widespread PII exposure | Forge session receipt; enumerate all holder PII |
| **Medium** | Authenticated abuse, limited IDOR, missing rate limits with demonstrable impact | Partner A reads Partner B receipt; audit omission on success path only under attack |
| **Low** | Defense-in-depth gaps, hardening, informational misconfig | Missing security headers; verbose error on non-production |
| **Informational** | Documentation, best practice, out-of-scope observations | Suggested logging improvement |

**Partner impact lens:** For each finding, state whether a **relying partner** inheriting Abraxas receipts could be misled or harmed.

---

## Reporting template

Submit findings in this structure (one section per finding):

```markdown
### [SEVERITY] Short title

**ID:** REV-YYYY-NNN (reviewer-assigned)
**Component:** e.g. Partner Flow / browser session / public receipt
**Threat (STRIDE):** e.g. Spoofing
**Affected paths:** file:line or route
**Description:** What is wrong and under what preconditions.
**Reproduction:** Steps or command output (no secrets/PII).
**Impact:** Who can exploit; what they gain.
**Evidence matrix row:** Link to THREAT_MODEL_EVIDENCE_MATRIX.md row if applicable.
**Recommendation:** Concrete fix or mitigation.
**Disposition:** (operator fills) Fixed / Accepted / Deferred — with SHA or ticket.
```

**Report metadata (cover page):**

- Reviewer organization and lead name
- Review date range
- Repository URL and **exact commit SHA** reviewed
- Deployed environment URL and SHA (if live testing performed)
- Scope reference: `docs/external-security-review/BETA_LIMITATIONS_AND_SCOPE.md`
- Statement: "Independent security review" — **only** if actually performed by the submitting party

---

## Finding disposition (operator)

After delivery:

1. Triage each finding in `docs/RELEASE_DECISION.md`.
2. Critical/High: fix or document explicit acceptance with compensating controls before partner GA.
3. Link PRs/commits to finding IDs.
4. Re-run [REPRO_COMMANDS.md](./REPRO_COMMANDS.md) targeted tests for fixed areas.
5. **Do not** mark the external review gate complete without the reviewer's final sign-off or written acceptance of residual risk.

---

## What not to claim

| Do not claim | Instead say |
|--------------|-------------|
| "Abraxas has passed security review" | "Readiness package prepared for external review" |
| "No vulnerabilities found" | (Only the external reviewer may state this, with scope) |
| "Production-ready / certified" | "Beta with documented limitations" |
| "Penetration tested" | Specify actual test type and scope if performed |
