# Sandbox pilot — acceptance checklist

**Schedule note:** Day ranges below are an **engineering friction target** (~two weeks), not a contractual deadline. The evaluation agreement’s **Evaluation period** (legal) is separate — see internal handoff docs.

Copy this table into your partner runbook. Mark **Measured** only with evidence (timestamp, receipt id, log excerpt).

## Integration setup

| # | Criterion | Target | Measured (partner fills) |
|---|-----------|--------|---------------------------|
| 1 | Sandbox app + API key received | Day 1–2 | |
| 2 | Callback URL allowlisted | Day 1–2 | |
| 3 | Trust anchor installed + fingerprint verified | Day 1–2 | |
| 4 | First `createVerificationRequest` success | Day 3–5 | |
| 5 | Holder completed authorization (wallet) | Day 3–5 | |
| 6 | Server callback verify without trusting query params | Day 3–5 | |

## Independent verification

| # | Criterion | Target | Measured |
|---|-----------|--------|----------|
| 7 | Portable bundle fetched once | Day 6–8 | |
| 8 | Offline verify without Abraxas app imports | Day 6–8 | |
| 9 | Correct permit / deny / indeterminate on sample receipts | Day 6–8 | |
| 10 | Stale status rejected after checkpoint advance | Day 9–11 | |
| 11 | Checkpoint survives process restart | Day 9–11 | |
| 12 | Wrong environment/tenant rejected | Day 9–11 | |

## Exit review

| # | Criterion | Target | Measured |
|---|-----------|--------|----------|
| 13 | Joint security review completed | Day 12–14 | |
| 14 | Production readiness gaps documented | Day 12–14 | |

## Repo baseline (Abraxas-measured, not partner pilot)

| Metric | Value | Source |
|--------|-------|--------|
| Steps to verify (artifacts in hand) | 4 verifier inputs + RP scope | BUILD #821 |
| NPM packages for standalone verify | 1 (`@abraxas/independent-verifier`) | BUILD #821 |
| Automated readiness tests | 20 cases | `test:build-828-design-partner-readiness` |
| Time to run independence proof (CI agent) | ~1–2 s | `independenceProof.test.ts` |

**Pilot success definition:** Partner requests a trust decision, receives a real signed sandbox result, authenticates issuer + status independently, and enforces access in their app — without Abraxas engineering implementing their product.
