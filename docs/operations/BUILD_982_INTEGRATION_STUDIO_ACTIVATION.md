# BUILD #982 — Token-2022 Integration Studio activation

## Goal

Connect receipt-backed Token-2022 entitlement capabilities (#975–#981) to the Integration Studio partner journey with honest environment labeling and independent verification handoff.

## Studio path

| Field | Value |
|-------|-------|
| Path id | `token_2022_receipt_entitlement` |
| Execution mode | `token_2022_entitlement_reference` |
| API | `POST /api/launchpad/applications/:id/token2022-entitlement-journey` |

## Five-step workspace

1. **Choose what to protect** — trusted scope from Launchpad application (server-bound).
2. **Verify the proof** — existing harness / unified trust execution.
3. **Receive the entitlement** — live mint only when environment allows; otherwise ProgramTest reference.
4. **Use the entitlement** — consumption reference or future connected adapter.
5. **Verify independently** — three tiers + `partner-verify` CLI handoff.

## Environments

| Kind | Mint/consume in browser | Notes |
|------|-------------------------|-------|
| `production_unavailable` | No | Fail-closed on production |
| `local_program_test_reference` | No | BUILD #981 artifacts |
| `connected_sandbox` | No (adapter not exposed in #982) | Programs on RPC detected; honesty preserved |

## Reused components

- `IntegrationStudioRequestWorkbench` harness + wallet gates
- `blockchainNative/studioConfig` RPC detection
- `examples/independent-solana-entitlement-partner/*`
- `cargo run --bin partner-verify` structural tier

## Commands

```bash
npm run test -- lib/partner/integrationStudio/token2022Entitlement
npm run test:build-981
cd solana/abraxas-eligibility-gate && cargo test partner_acceptance -- --nocapture
```

## Limitations

- No new on-chain mint/consume browser adapter in #982 when cluster programs are missing.
- Structural verification in hosted studio may require server-side `cargo` (optional `run_structural_verify`).
- Public-chain acceptance is not claimed from local ProgramTest artifacts alone.