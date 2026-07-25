# Mainnet cutover runbook

Seven boolean gates before open, self-serve, audit-complete mainnet. Track live progress at `/mainnet` and `GET /api/mainnet/readiness`.

## Current state (check live)

```bash
curl -s https://abraxas-app.vercel.app/api/mainnet/readiness | jq '.done, .total, .milestones[] | select(.done==false) | .label'
curl -s https://abraxas-app.vercel.app/api/sui/passport/sponsor | jq '.issuer_fully_configured, .fix_hints'
```

**Known production issue:** Vercel may have `SUI_NETWORK=mainnet` before the Move package is published, and sponsor env vars may be malformed. Until gate #3 clears, either fix credentials **or** set `SUI_NETWORK=devnet` to restore on-chain Passport provision.

---

## Gate 1 — Core verification live ✅

Already met. Passport, Veriff, credentials, verify API in production.

---

## Gate 2 — Sui Passport Move audit

1. Complete third-party review of `sui/abraxas_passport`.
2. Set `AUDIT_TRACKER` entry `sui-passport` → `status: "complete"` in `lib/securityProgram.ts`.
3. Publish report link at `/security`.

**Blocks:** gate #3 publish script.

---

## Gate 3 — Sui Passport on mainnet

After gate #2:

```bash
npm run sui:build
# Fund mainnet sponsor wallet with SUI
CONFIRM_MAINNET=1 npm run sui:deploy:mainnet
npm run sui:mint-cap -- mainnet
```

4. Commit `lib/sui/deployment.mainnet.json` with real `packageId`.
5. In Vercel, set:
   - `SUI_NETWORK=mainnet`
   - `NEXT_PUBLIC_SUI_NETWORK=mainnet`
   - `SUI_SPONSOR_SECRET_KEY` (full `suiprivkey1…`)
   - `SUI_ISSUANCE_CAP_OBJECT_ID` (66 chars, `0x` + 64 hex)
6. Redeploy.
7. Verify:
   - `GET /api/sui/passport/sponsor` → `issuer_ready: true`, `cap_owner_matches_sponsor: true`
   - `GET /api/sui/mainnet/readiness` → `mainnet_gate_3_live: true`
   - Veriff approve → `POST /api/sui/passport/provision` succeeds

---

## Gate 4 — Credential API security review

1. Complete formal review of issuance + verify + revocation paths.
2. Set `credential-api` audit → `complete` in `lib/securityProgram.ts`.
3. Publish at `/security`.

---

## Gate 5 — First unaffiliated relying party

1. Onboard outside org (not `abraxas-*` internal partner IDs).
2. Issue `abx_live_` production API key.
3. Partner clears real `POST /api/credentials/verify` with `decision: approved`.
4. Gate flips via `getExternalRpGateStatus()` telemetry.

---

## Gate 6 — Asset monitoring v1

Production checklist:

- `ASSET_MONITORING_AUTO_APPLY=true`
- `asset_lot_inventory` rows present
- Drift feeds wired (`/trust-framework#trust-over-time`)

Already met in production when telemetry is configured.

---

## Gate 7 — Self-serve integrate + bounty

Code requirements (shipped):

- `POST /api/integrations/apply` saves application + issues proof + emails ops
- `INTEGRATION_SELF_SERVE` not `false`
- `SECURITY_BOUNTY_SUBMISSIONS` not `false`
- `RESEND_API_KEY` + `ADMIN_EMAIL` in Vercel

Pre-registration bounty counts toward gate #7. Set `BUG_BOUNTY_PHASE=live` in env after audits #2 and #4 complete for full reward launch.

---

## Sponsor wallet setup

See `docs/SPONSOR_WALLET_SETUP.md`. Quick validation:

```bash
curl -s /api/sui/passport/sponsor
```

Fix every item in `fix_hints` until `issuer_fully_configured` is true.

---

## When all seven gates are green

- `GET /api/mainnet/readiness` → `isFullyReady: true`
- Update public copy still saying "devnet" (`lib/protocolSui.ts`, Passport UI, institutional page)
- Announce mainnet Passport + open integrate
