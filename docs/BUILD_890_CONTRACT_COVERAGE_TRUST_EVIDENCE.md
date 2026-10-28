# Build 890 — Complete Contract Coverage and Deployed Trust Evidence

## Delivery

| Field | Value |
| --- | --- |
| Build | 890 |
| Branch | `cursor/build-890-contract-coverage-trust-evidence-5ffe` |
| Base main (889 merged) | `88606c9d` |

## Track A — Execution contract registry (blocking CI)

Registered boundaries (`lib/partner/executionContracts/registry.ts`):

| Contract ID | Client builder | Server validator / route tests |
| --- | --- | --- |
| `launchpad_starter_kit` | `launchpadClientRequest.ts` | `starterKitLaunchpadRoute.test.ts` |
| `launchpad_test_harness` | `testScenarioClientRequest.ts` | harness route (existing) |
| `partner_handoff_create` | `handoffClientRequest.ts` | `partnerHandoffRoute.test.ts` |
| `wallet_action_challenge` | `walletActionChallengeClientRequest.ts` | `walletActionChallengeRoute.test.ts` |
| `sandbox_receipt_validate` | `sandboxValidateClientRequest.ts` | `sandboxValidateRoute.test.ts` |
| `institutional_mandate_enforcement` | (library entrypoint) | `build889InstitutionalReliability.adversarial.test.ts` |
| `portable_receipt_verification` | (external verifier) | `portable-relying-party.test.ts` + `externalPartner.test.ts` |

Blocking guard: `npm run check:execution-contracts` (GitHub workflow job **Execution contract guard (blocking)**).

GET-bound receipt retrieval (`/api/v1/receipts/{id}`) remains path-parameter validated; independent verification is covered by portable relying-party suites.

## Track B — Authoritative journey continuity

- `buildServerAuthoritativeJourneySnapshot` now requires validated receipt, non-expired workspace, and policy still offered in `EPHEMERAL_SANDBOX_TEST_POLICIES`.
- Exposes `studio_pack_id`, `policy_locked`, and `policy_lock_reasons` on `GET /api/auth/wallet/sandbox/workspace`.
- Embedded Integration Studio uses `serverPolicyLocked` from server snapshot (not URL params or wallet connect alone).

## Tracks C–E — Evidence

- Orchestrator: `npm run build890:deployed-trust-evidence` → `/opt/cursor/artifacts/build-890/trust-evidence-report.json`
- Playwright (Preview): `tests/staging/build-890-founder-journey-contract.spec.ts`
- Production wallet approval: **manual checkpoint** (not mocked)

## Commands

```bash
npm run validate:typescript
npm run check:execution-contracts
npm run build890:deployed-trust-evidence
```

## Remaining blockers

- Full Production founder wallet journey after human approval
- Live institutional mandate issuer (external institution-supplied evidence)
- Destructive Production security drills (explicit approval required)
