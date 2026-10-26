# Build #854 — Live Wallet-Native Partner Trust Execution

## HTTP routes

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | `/api/v1/partner-flow/trust-execution/challenge` | Partner API key (`verify:requests`) + `x-abraxas-application-id` | Issue scoped challenge (server-derived policy/app) |
| GET | `/api/v1/partner-flow/trust-execution/challenge/[challengeId]` | Holder wallet session | Fetch message + status |
| POST | `/api/v1/partner-flow/trust-execution/authorize` | Holder wallet session | Verify signature + atomic consume |
| POST | `/api/v1/partner-flow/trust-execution/execute` | Partner API key | Issue signed receipt + portable verify bundle |

Purpose: `abraxas_wallet_trust_execution_v1`. Action: `partner_flow:evaluate`.

## Durable state

- Table: `wallet_scoped_trust_challenges` (sovereign slice + migration proposal `008` / `154_proposal`)
- RPC: `abraxas_consume_wallet_scoped_trust_challenge_atomic` — one-time consume under concurrency

Store path: `querySovereignStagingPg` only. Unavailable pool → **503 fail closed**.

## Evidence modes

- **Live:** `ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE` unset — requires authoritative evidence (deny/indeterminate without it).
- **CI:** `ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE=1` — labeled controlled test evidence only.

## Independent verification

Execute response includes `portable_verification` (record + `@abraxas/independent-verifier` outcomes). Relying parties should verify locally; Abraxas HTTP success is not the trust verdict.

## CI

```bash
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 npx vitest run lib/partner/trustExecution/partnerTrustExecutionHttp.integration.test.ts
```

## Activation gates

- Sovereign PostgreSQL URL configured (`ABRAXAS_SOVEREIGN_STAGING_PG_URL` / disposable class)
- Migration `008` applied on target operational PG (not Demo/Production in #854)
- Launchpad application rows present for partner scope resolution
- Production evidence pipeline wired (remove test-evidence flag)
