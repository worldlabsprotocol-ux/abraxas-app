# Build 877 — Unified workspace continuity

## Problem

Developer Workspace and Integration Studio were separate visual destinations (`/developers/ephemeral-sandbox` vs `/developers/integration-studio`), causing a second onboarding feel after wallet verification.

## Root cause

Guided handoff URLs routed to Integration Studio with a new page header and lifecycle chrome, even though Launchpad session, sandbox create APIs, and verification engines were already shared.

## Fix (smallest coherent integration)

| Change | Detail |
| --- | --- |
| Handoff target | `buildIntegrationStudioHandoffUrl` → `/developers/ephemeral-sandbox?integration=1&…#sandbox` |
| Embedded studio | `EmbeddedIntegrationStudioPanel` reuses `IntegrationStudioClient` + workspace shell |
| Stage nav | `IntegrationStudioWorkspace` uses `workspaceBasePath` from embed context |
| Deep links | `/developers/integration-studio` unchanged for advanced developers |

## Reused (no new protocol/auth)

- `IntegrationStudioClient`, Launchpad APIs, partner handoff, portable verify
- Build **870** enforce semantics; wallet demo ≠ partner authorization (copy + boundaries)

## Tests

```bash
npm run test:build-877-unified-workspace-continuity
npx playwright test tests/staging/unified-workspace-continuity.spec.ts
```

## Scorecard

Product experience **5/10 → unchanged** until first-time users complete the journey unaided with deployed evidence.

## Remaining

- Full Playwright wallet → sandbox → request path on staging (requires wallet auth)
- Mobile screenshot pass on embedded layout
