# Build #549 — Live institutional partner certification

Extends Build **#546** (verifier), **#547** (durable filesystem certification), **#548** (distributed PostgreSQL replay).

## What this build proves

| Layer | Evidence |
|-------|----------|
| Local adversarial | `test:build-546-adversarial` |
| Durable replay | `test:build-547-live-partner`, `test:build-548-distributed-replay` |
| Live staging | HTTP probes when `LAUNCHPAD_STAGING_URL` + bypass resolve |
| Holder → receipt → RP | **Blocked** until operator supplies `PARTNER_FLOW_RP_*`, studio credentials, holder session |

## Required operator prerequisites (live)

- `PARTNER_FLOW_RP_PARTNER_ID`, `PARTNER_FLOW_RP_POLICY_ID`, `PARTNER_FLOW_RP_RETURN_URL`
- `LAUNCHPAD_STUDIO_API_KEY`, `LAUNCHPAD_STUDIO_APPLICATION_ID`
- `BUILD_547_SYNTHETIC_RECEIPT_ID` (authorized staging receipt)
- `BUILD_548_PG_URL` or `INSTITUTIONAL_REPLAY_TEST_DATABASE_URL`
- Protected preview: `VERCEL_PROTECTION_BYPASS`, `LAUNCHPAD_EXPECTED_SUPABASE_REF`

Do **not** point certification at production hosts or production Supabase.

## Commands

```bash
npm run test:build-549-live-institutional
npm run certify:build-549
```

Report: `reports/build-549-live-institutional-certification.json`

Exit codes: `0` live pass, `1` fail, `2` live blocked (expected until operator prerequisites met).
