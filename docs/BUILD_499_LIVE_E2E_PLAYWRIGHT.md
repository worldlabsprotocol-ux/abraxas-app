# Build #499 — Live E2E proof, Playwright & receipt trust

**Depends on:** Build #497 (#610) + Build #498 (#611) merged on `main`.

## Dependency check

PR **#611** is merged — `liveSandboxExecution`, Launchpad `universal_readiness`, and staging harness ship on `main`.

## Staging configuration contract

Preflight: `runStagingLiveE2ePreflight()` / env keys in `lib/partner/universalIntegration/stagingConfigContract.ts`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `PARTNER_FLOW_RP_PARTNER_ID` | yes | Sandbox partner id |
| `PARTNER_FLOW_RP_POLICY_ID` | yes | Pinned policy id |
| `PARTNER_FLOW_RP_RETURN_URL` | yes | HTTPS callback (allowlisted in Launchpad) |
| `PARTNER_FLOW_RP_BASE_URL` | recommended | Staging Abraxas origin (production hosts blocked) |
| `LAUNCHPAD_EXPECTED_SUPABASE_REF` | recommended | Fail-closed guard against production Supabase |
| `EXAMPLE_MERCHANT_LAUNCHPAD_APPLICATION_ID` | optional | UUID for Launchpad correlation |
| `PLAYWRIGHT_STORAGE_STATE` | optional | Saved session (never commit) |
| `VERCEL_PROTECTION_BYPASS` | optional | Staging deployment protection |
| `EXAMPLE_MERCHANT_LIVE_E2E_ARTIFACT` | optional | Output path (default `reports/example-merchant-live-e2e-artifact.json`) |
| `EXAMPLE_MERCHANT_LIVE_CALLBACK_URL` | optional | Full callback URL instead of manual receipt id |
| `PARTNER_LIVE_E2E_AUTOMATION_SOURCE` | optional | `playwright` (default), `manual_checkpoint`, `operator_env` |

Legacy: `EXAMPLE_MERCHANT_LIVE_RECEIPT_ID` still works but callback/artifact correlation is preferred.

## Playwright holder flow

```bash
# Install browsers once
npx playwright install chromium

# Automated (requires holder session + real verification — no MFA bypass)
export PARTNER_FLOW_RP_*=…
export LAUNCHPAD_EXPECTED_SUPABASE_REF=…
npm run partner:live-e2e

# Manual checkpoint (MFA / biometrics / human review)
npm run partner:live-e2e -- --interactive
```

Flow: hosted verify URL → real holder UI → authorized callback with `receipt_id` → redacted artifact → `npm run partner:live-sandbox` trust path via `resolveLiveReceiptCorrelation`.

**Never** commit storage state, credentials, or artifact files containing tokens.

## Live receipt correlation

Order: artifact file → callback URL → legacy receipt id env. Tenant binding checks `partner_id` / `policy_id` against `PARTNER_FLOW_RP_*`.

## Readiness truthfulness

Launchpad health derives `signals.live_e2e_complete` from `partner_integration_events` (`holder_flow_completed` + `receipt_issued`). Phase `sandbox_verified` may include blocker `live_e2e_not_observed` when harness passed but live holder flow was not recorded.

UI shows an amber banner when `sandbox_verified && !live_e2e_complete`.

## Webhook HTTP injection

`lib/partner/webhooks/webhookHttpFailureInjection.test.ts` — local `127.0.0.1` receiver only; signatures, 500, duplicate idempotency, timeout.

## Metering

No billing product added. See `commercialMeteringAudit.ts`; live E2E events use `partner_integration_events` (excluded from harness-only metrics when live signals absent).

## Validation commands

```bash
./node_modules/.bin/vitest run lib/partner/universalIntegration lib/partner/partnerFlowEvaluateRoute.boundary.test.ts lib/partner/webhooks/webhookHttpFailureInjection.test.ts

npm run partner:live-sandbox   # after artifact or callback env set
npm run test:staging:live-e2e  # preflight-only unless staging env set
```

## Build #500 recommendations

1. Wire Launchpad `launchpad_application_id` into Playwright evaluate POST for pinned-policy negatives.
2. Expand evaluate/complete cross-tenant tests with real Launchpad DB fixtures.
3. Staging CI job with protected secrets + artifact upload (redacted).
4. Webhook failure injection against sandbox test receiver route (DB-backed).
5. Metering reconciliation export spec + admin read API.
