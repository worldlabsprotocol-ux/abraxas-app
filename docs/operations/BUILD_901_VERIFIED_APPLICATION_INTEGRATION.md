# Build 901 — From integration files to verified application

## Root causes

| Issue | Cause |
| --- | --- |
| Incomplete handoff after download | Primary action downloaded a ZIP but UI implied a live connection; no staged next task. |
| Website → Next.js mismatch | `mapHomeBuilderPlatformToStarterKit("website")` silently returned `nextjs`. |
| Callback confusion | Default `/partner/callback` on the app origin is an allowlisted **return URL**, not Abraxas injecting into a private backend. |

## Reused endpoints and assets

- `POST /api/launchpad/applications/:id/starter-kit` (Build 896)
- `GET /api/developers/integration-studio/external-integration-state` (Build 898/899)
- `examples/external-node-partner` (Build 873/900)
- `builderExternalIntegrationAcceptance` / `builderEnforcementCorrelation` (Build 899/900)

## UX standard (founder)

- One headline, one short support line, one primary action per stage.
- Download labeled **Get integration files**; verification labeled **Check the connection**.
- Website requires explicit stack before kit generation.
- **Try example application** surfaces the reference server without auto-starting a local process.

## Regression tests

```bash
./node_modules/.bin/vitest run \
  lib/home/homeBuilderPlatformAdapter.test.ts \
  lib/developers/builderIntegrationJourneyUi.test.ts \
  lib/developers/builderEnforcementCorrelation.test.ts
```

## Live enforcement

After merge, re-run:

```bash
BUILD900_LIVE_ACCEPTANCE=1 LAUNCHPAD_STAGING_URL=https://demo.abraxasworld.xyz \
  npm run build900:live-external-rp-acceptance
```

Product score remains **7/10** until deployed founder acceptance with `homepage_completion_ok: true`.
