# Build #856 — Sovereign Hosted Handoff + Evaluate Continuation

Base: `main` after PR #857 (application-bound Launchpad journey).

## Objective

After holder wallet authorization, the **same** scoped trust request continues into authoritative evaluation and a durable outcome without a second partner manual execute step.

## Routes

| Step | Route |
|------|-------|
| Partner hosted handoff (sovereign PG) | `POST /api/launchpad/applications/[id]/hosted-handoff` + `holder_wallet_address` |
| Holder continue preview | `GET /api/v1/hosted-handoff/continue-context?verify_request=wstc_…` |
| Holder authorize + evaluate | `POST /api/v1/partner-flow/trust-execution/authorize` (default `continue_evaluation: true`) |
| Partner status / idempotent execute | Launchpad `sovereign-trust-execution` GET / execute POST (unchanged) |

Legacy Partner Flow `evaluate` / `complete` unchanged.

## CI

```bash
ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF=1 ./node_modules/.bin/vitest run \
  lib/partner/trustExecution/sovereignHostedTrustHandoff.integration.test.ts \
  lib/partner/trustExecution/partnerTrustExecutionUnifiedJourney.integration.test.ts \
  lib/partner/trustExecution/partnerTrustExecutionHttp.integration.test.ts
```

## Operational gates

- Live authoritative path still requires seeded sovereign evidence graph (unchanged from #854).
- Production hosted handoff on sovereign PG remains sandbox-only until production activation policy is satisfied.
