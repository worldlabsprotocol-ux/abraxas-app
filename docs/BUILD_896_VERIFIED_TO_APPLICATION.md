# Build 896 — From verified sandbox to working application

## Reconciliation

| Build | On `main`? | Branch |
| --- | --- | --- |
| 894 (memory) | Yes (`a7fed3c3`) | merged |
| 895 (trust assurance + emblem + wallet continuity) | **No** | `cursor/build-895-deployed-trust-assurance-5ffe` |
| 896 (this work) | **No** | `cursor/build-896-verified-to-application-5ffe` (based on 895) |

896 stacks on 895; merge 895 first or merge the stacked PR as one delivery.

## Product change

After harness **allow** success on the Request stage (homepage workspace embed):

1. Primary panel: **Connect to my application** (starter kit download for platform from homepage discovery intent).
2. **What your application received** — receipt id + callback (no fake “connected”).
3. Optional **Run independent enforcement check** — `GET /api/developers/integration-studio/independent-enforcement` (reference process; not external adoption).
4. Production review / receipt workbench moved under **Advanced** (hidden on embedded homepage workspace).

## Reused infrastructure

- Launchpad harness: `POST /api/launchpad/applications/:id/test`
- Starter kit: `POST /api/launchpad/applications/:id/starter-kit`
- Portable verification material: `buildPortableVerificationBundle` + `@abraxas/independent-verifier`
- Homepage intent: `readHomeBuilderDiscoveryIntent()` → platform → starter kit platform map

## Tests

```bash
npm run validate:typescript
./node_modules/.bin/vitest run lib/home/homeBuilderPlatformAdapter.test.ts lib/developers/independentEnforcementSummary.test.ts
```

## Limitations

- Harness success proves Abraxas sandbox path; **external app connection** requires the developer to run generated server code on their stack.
- Independent enforcement API uses the hosted reference verifier path — not a third-party customer deployment.
