# External Node partner — adoption runbook (Build 873 / 876)

Use this after Integration Studio provisions a sandbox application.

**Pilot focus (876):** enforce a **policy-bound, independently verifiable trust decision** in your app — not wallet-connect alone. See [WALLET_VS_TRUST_DECISION.md](./WALLET_VS_TRUST_DECISION.md) and [PILOT_ACTIVATION_KIT.md](../../docs/integration/external-developer/PILOT_ACTIVATION_KIT.md).

## Manual setup steps (10)

1. Copy this folder into your repo (or work in-place in the Abraxas monorepo).
2. Set Launchpad callback URL to `http://127.0.0.1:3847/callback` (or your public HTTPS URL).
3. Copy the one-time `abx_test_…` key into `.env` (never commit).
4. Fill `ABRAXAS_APPLICATION_ID`, `ABRAXAS_PARTNER_ID`, `ABRAXAS_POLICY_ID` from Studio.
5. Copy trust anchor: `cp ../portable-relying-party/trust-config.demo.template.json ./trust-anchor.demo.json`
6. `npm install && npm start`
7. Create verification request from the local UI (server calls `POST /api/v1/partner-handoff`).
8. Complete holder flow in the hosted Abraxas UI when the policy requires wallet control.
9. Callback receives pointer; server fetches portable bundle and runs independent verify.
10. Application maps **permit · deny · indeterminate** — indeterminate never authorizes live actions.

## Acceptance (no privileged access)

From repo root:

```bash
npm run test:build-873-integration-adoption
```

## Production

Complete Launchpad production review, rotate keys, and pin production trust anchor out-of-band before relying on live eligibility.
