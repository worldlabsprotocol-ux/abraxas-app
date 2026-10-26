# Build #855 — Unified Sovereign Partner Execution Journey

Base: `main` @ merge commit for PR #854 (`a4f27d34`).

## Objective

Connect wallet-scoped trust execution (#854) to the existing Partner Launchpad and hosted holder surfaces as **one journey**, without parallel execution logic or new lifecycle stores.

## Routes reused (#854)

| Step | Route | Role |
|------|-------|------|
| Partner issues challenge | `POST /api/v1/partner-flow/trust-execution/challenge` | Partner API key + application header |
| Holder reads challenge | `GET /api/v1/partner-flow/trust-execution/challenge/[id]` | Ephemeral wallet session |
| Holder authorizes | `POST /api/v1/partner-flow/trust-execution/authorize` | Wallet signature + atomic consume |
| Partner executes | `POST /api/v1/partner-flow/trust-execution/execute` | Signed receipt + portable verify bundle |

Legacy Partner Flow (`/api/v1/partner-flow/evaluate`, `/complete`, hosted verify) remains unchanged for existing integrations.

## Launchpad bridge (#855)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/launchpad/applications/[id]/sovereign-trust-execution` | Partner Launchpad session — start (`holder_wallet_address`) or execute (`execute: true`, `challenge_id`) |
| GET | same + `?challenge_id=` | Journey status for partner console |

Holder URL: `/partner/trust-execution?challenge_id=…` (wallet control + scoped signature).

## Engines (unchanged)

- **Evidence:** authoritative sovereign graph via `loadSovereignEvidenceIntegrityGraphForTrustExecution`
- **Proof:** `finalizeTrustExecutionOutcome` + receipt signing
- **Authority:** issuer registry + SIAS material in verification bundle
- **Continuity:** signed status statement; relying party verifies with `@abraxas/independent-verifier`

## CI

```bash
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run \
  lib/partner/trustExecution/partnerTrustExecutionUnifiedJourney.integration.test.ts \
  lib/partner/trustExecution/partnerTrustExecutionHttp.integration.test.ts
```

## Activation gates (unchanged from #854)

- Sovereign PostgreSQL operational on target environment
- Migration `008`+ applied
- Pre-authorized issuer keys, policies, and authoritative evidence bindings for live path
- Hosted handoff on sovereign PG still gated separately (`501` until live handoff PR)

## Protocol Advancement Report

| | |
|--|--|
| **Engine advanced** | Proof + Continuity surfaced as one partner-visible journey with independent verifier proof in Launchpad execute step |
| **Reused** | #854 challenge store, atomic consume, authoritative/fixture execution split, durable outcomes |
| **Trust boundary** | Tenant-scoped journey status; holder URL does not expose partner API secrets |
| **Security demonstrated** | Execute-before-authorize rejected; cross-tenant journey load rejected; execute retry returns same receipt |
| **Next dependency** | Wire sovereign hosted handoff + evaluate continuation to auto-call execute after holder authorize (optional automation) |
