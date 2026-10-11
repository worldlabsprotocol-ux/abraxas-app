# Build #521 — Demo activation + real E2E proof

## Deployment truth (2026-10-11 probe)

| Signal | Observed |
|--------|----------|
| **Public Demo URL** | https://demo.abraxasworld.xyz |
| **Vercel deployment id** (from HTML `dpl_`) | `dpl_AQzmxAzck7aqBGqnc6reL9X6zpyE` (re-run `npm run truth:build521-deployment`) |
| **#520 `/developers/live-partner-journey`** | **404** on Demo alias → **#520 not promoted** |
| **Draft PR previews** | SSO-protected; **do not** update `demo.abraxasworld.xyz` automatically |

### Authorized promotion path

1. Merge stacked PRs through **#633** (or founder-chosen release branch) into the **Demo** Vercel environment’s tracked branch.
2. Vercel → **Project** → **Domains** → confirm `demo.abraxasworld.xyz` targets the **Demo** environment production deployment (not a random preview).
3. Re-run `npm run truth:build521-deployment` — expect **200** on `/developers/live-partner-journey` and `/api/demo/activation-readiness`.

## Demo database (read-only Supabase MCP)

| Check | Result |
|-------|--------|
| Project | `ocntwbxarpjeixdnzide` (Demo) — **production `bztwutzprwsdrtqdpymf` not touched** |
| Latest applied migration name | `087_stocklana_pilot` only |
| Migrations **134–138** | **Not applied** |
| `holder_accounts` / `holder_wallet_accounts` | **Absent** |
| `cielo-verified-guest-v1` policy | **Present** |
| `cielo-verified-guest-solana-v1` policy | **Absent** (needs **136**) |

### Single founder action (schema)

With established backup/recovery gates, apply Solana incremental migrations **134 → 138** on Demo:

`npm run demo:solana-incremental-migrate -- --apply --confirm=ocntwbxarpjeixdnzide`

(requires `DEMO_SUPABASE_DATABASE_URL` for Demo only)

Then redeploy Demo with `ABRAXAS_SOLANA_NATIVE=true` and `NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE=true`.

## Authentic Cielo E2E

**Phantom path:** **BLOCKED** until schema + Solana policy above.

**Legacy Google + Sui path** may work on current Demo for `cielo-verified-guest-v1` only — not the Solana-native success criterion for Build #521.

Manual Phantom script (after schema + deploy): `docs/BUILD_520_MANUAL_PHANTOM_E2E.md`

## Commands

- `npm run truth:build521-deployment` — HTTP deployment truth JSON → `/opt/cursor/artifacts/build521-deployment-truth.json`
- `npm run readiness:build520-demo` — public route smoke
- GET `/api/demo/activation-readiness` — server-side schema/policy booleans (Demo env + service role)
