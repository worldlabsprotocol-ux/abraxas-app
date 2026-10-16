# Institutional sandbox live activation (Build #584)

Canonical product: [https://abraxasworld.xyz](https://abraxasworld.xyz)

Build #584 executes the **real deployed** institutional sandbox path. It does not treat local Vitest or simulated provisioning as customer verification.

## Founder minimum setup (safe)

1. Provision or locate an existing **sandbox institutional** Launchpad application (`sandbox_institutional_protocol_access`).
2. On the operator machine only, export:
   - `BUILD584_SANDBOX_BASE_URL=https://abraxasworld.xyz`
   - `BUILD584_PARTNER_API_KEY` — sandbox key (`abx_test_…`) from Launchpad (never commit, log, or paste into tickets).
   - `BUILD584_APPLICATION_ID` — UUID of the institutional sandbox application.
3. For local Launchpad UI testing, set `ABRAXAS_BROWSER_SESSION_SECRET` (≥16 characters) in deployment or `.env.local` and restart the server.
4. Run:
   - `npm run build-584:live-institutional-acceptance`
   - `npm run build-584:authenticated-browser-acceptance`

## What “complete” means

| Stage | Evidence |
|-------|----------|
| Public routes reachable | Canonical probe (HTML 200 on Studio, Launchpad, verify surfaces) |
| Partner authenticated | Real `POST /api/launchpad/auth/session` with sandbox key + cookie |
| Integration configured | Return URLs + partner flow config over session |
| Hosted verification | `/partner/verify` URL issued; **holder consent** completed in browser |
| Independent verify | Supported verifier matrix + live receipt verification (no Supabase trust root) |
| Measured TTFV | Durable integration events on the application id |

Harness-only Launchpad test scenarios record trust-path activity but **do not** satisfy holder authorization or full customer operation tiers.

Browser acceptance requires **GET /api/launchpad/auth/session → authenticated: true** after sign-in (not merely absence of a UI error). The artifact records `api_observations[]` and separate `stages` for partner auth, application access, institutional configuration, holder authorization, and live independent verification. **`walkthrough_complete: true`** only when all stages pass.

The vitest **local cryptographic regression** matrix (`independentVerifierSteps.test.ts`) is synthetic and must not be counted as live receipt verification. Live verification stays blocked until a holder-authorized receipt is retrieved and verified through supported interfaces.

## Blockers seen without credentials

Cloud CI and agent environments without `BUILD584_PARTNER_API_KEY` report **blocked** for:

- `real_authenticated_http_sandbox`
- `authenticated_browser`
- `institutional_sandbox_operation_completed`

This is expected. Do not mark those tiers pass without executed evidence.

## Handoff reference

Start from [institutional-sandbox-activation-583.md](./institutional-sandbox-activation-583.md) for integration steps; use this document for **live deployment acceptance** and founder actions.
