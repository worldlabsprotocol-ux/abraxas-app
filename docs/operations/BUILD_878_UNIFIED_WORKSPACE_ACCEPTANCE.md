# Build 878 — Unified workspace acceptance

Build **877** embeds Integration Studio in Developer Workspace. Build **878** proves **state continuity** and **deployed** behavior — not another onboarding framework.

## Server-authoritative continuity

| Event | Persistence |
| --- | --- |
| Sandbox test verify succeeds | `recordEphemeralSandboxGuidedProgress` (session + workspace bound) |
| Receipt independently validated | `PATCH /api/auth/wallet/sandbox/guided-progress` (session required) |
| Page refresh | `GET /api/auth/wallet/sandbox/workspace` returns `guided_progress` + `guided_result` when receipt still in ephemeral store |

Query parameters (`integration=1`, `pack`, `step`) **deep-link UI only**. They do **not** substitute for wallet session or stored proof.

## Embedded UI rules

- Page header hidden on unified integration query (`EphemeralSandboxPageHeader`)
- One journey bar (`UnifiedWorkspaceJourneyBar`)
- Studio lifecycle nav + stage guide hidden in embed (`IntegrationStudioWorkspace`)
- Inspector rail omitted in embed (advanced health stays on `/developers/integration-studio`)

## Engineering gate

```bash
npm run test:build-877-unified-workspace-continuity
npm run test:build-878-unified-workspace-acceptance
npm run build878:unified-workspace-acceptance
npm run test:build-870-verifier-enforcement
npx playwright test tests/staging/unified-workspace-continuity.spec.ts
```

Artifact: `/opt/cursor/artifacts/build-878/unified-workspace-acceptance.json`

## Completion criterion (product)

A user completes wallet → application integration **in one workspace** with authorized state preserved through refresh and recovery, **on production or staging deployment**, without duplicate onboarding and without security regression.

**Product experience score remains 5/10** until unaided external completion is evidenced.

## Parallel PRs

- [#877](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/877) implementation
- [#874](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/874) security operations
- [#875](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/875) commercial readiness
- [#876](https://github.com/worldlabsprotocol-ux/abraxas-app/pull/876) pilot activation
