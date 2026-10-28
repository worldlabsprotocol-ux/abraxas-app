# Build 889 — Contract Integrity, Continuous Authority, Production Reliability

Base: `main` after merge of PR #888 (`6f0e4b93`).

## Permanent prevention standard

A change touching an execution contract is not complete until:

1. **Canonical client builder** sends only documented keys (`buildLaunchpadStarterKitRequestBody`, `buildLaunchpadTestScenarioRequestBody`).
2. **Server preparation** strips extension keys (`binding_id`) before fail-closed generator validation — never silently drop security fields.
3. **Route integration tests** exercise the real handler path (auth, tenant, binding resolution).
4. **CI blocking guard** — `npm run check:execution-contracts`.

## Track 1 — Contract integrity

| Surface | Client builder | Server validator | Regression |
| --- | --- | --- | --- |
| Launchpad starter kit | `launchpadClientRequest.ts` | `prepareLaunchpadStarterKitBody` + `validateStarterKitInput` | `starterKitLaunchpadRoute.test.ts` |
| Launchpad test harness | `testScenarioClientRequest.ts` | `runLaunchpadTestScenario` route body | `executionContracts.test.ts` |

## Track 2 — Journey continuity

- `GET /api/auth/wallet/sandbox/workspace` returns `authoritative_journey` (session-bound policy lock hint).
- Embedded Integration Studio hides policy re-selection when `policyLockedByWorkspace` (validated wallet proof + authoritative policy).

URLs remain navigation hints only; authority stays on session and server records.

## Track 3 — Institutional authority

- `build889InstitutionalReliability.adversarial.test.ts` consolidates proofs: unauthorized issuer, unrelated transaction reuse, missing receipt when required.

Builds on merged 885/886 enforcement — no parallel engines.

## Track 5 — Founder journey regression (staging)

- `tests/staging/build-889-founder-journey-contract.spec.ts` — Start building, free sandbox copy, starter-kit `unknown_field` API behavior.
- Manual checkpoint: real Phantom wallet on Production when staging wallet gate is not operational.

## Commands

```bash
npm run validate:typescript
npm run check:execution-contracts
./node_modules/.bin/vitest run lib/developers/serverAuthoritativeJourney.test.ts
```

## Evidence classification

| Kind | Examples in this build |
| --- | --- |
| Implementation | Client builders, journey snapshot, policy lock UI |
| Simulation | Vitest route mocks, adversarial mandate fixtures |
| Deployed tests | Playwright staging spec (requires `LAUNCHPAD_STAGING_URL`) |
| External acceptance | Founder Phantom walkthrough (manual) |
