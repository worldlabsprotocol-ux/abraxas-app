# Progressive Proof Foundation — Test Evidence

**Date:** 2026-09-16  
**Branch:** `cursor/progressive-proof-foundation-d541`

## Regression suite (passing)

| Suite | Tests | Status |
|-------|-------|--------|
| `lib/progressiveProof/evaluate.test.ts` | 6 | PASS |
| `lib/progressiveProof/handoffReady.test.ts` | 4 | PASS |
| `lib/progressiveProof/providers.test.ts` | 3 | PASS |
| `lib/progressiveProof/progressiveProofFlows.test.ts` | 4 | PASS |
| `lib/passport/partnerFlowHandoff.progressive.test.ts` | 3 | PASS |
| `lib/passport/passportCustomerStatus.test.ts` | 3 | PASS |
| `lib/sui/zklogin/signInCopy.test.ts` | 4 | PASS |

## Key assertions verified

- Google zkLogin never satisfies regulated claims
- Missing proof maps to `proof_needed`, never `eligible`
- Good Trouble browse (L0) eligible without full IDV credential
- Good Trouble retail rejects sign-in-only holders
- Stocklana-like fixture: wallet + liveness required; chain-agnostic partner surface

## DEMO validation

No schema migrations in this PR. Validate on DEMO preview after merge to integration branch:

1. Sign in with Google — no document prompt at account creation
2. Good Trouble browse — DOB self-attest → browse receipt
3. Good Trouble retail — passport evidence required before handoff
