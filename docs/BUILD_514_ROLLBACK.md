# Build #514 — Demo rollback plan

## Principles

- Do not delete holder records, receipts, or historical Sui provenance.
- Do not point Demo at production Supabase (`bztwutzprwsdrtqdpymf`).
- Prefer Vercel **instant rollback** to last READY deployment.

## Vercel application rollback

1. Vercel → `abraxas-app` → Deployments.
2. Select last known-good READY preview/production for Demo domain.
3. **Promote** / assign alias `demo.abraxasworld.xyz` to that deployment.
4. Record previous deployment ID for forward rollback.

## Feature toggles (env-only, no code revert required)

| Flag | Rollback action |
|------|-----------------|
| `ABRAXAS_SOLANA_RECEIPT_COMMITMENTS` | Set to `disabled` to stop new on-chain commitments (existing memos remain verifiable) |
| `ABRAXAS_SOLANA_NATIVE` | Disable only if Solana path regresses; restores legacy path — test partner flows first |
| `ABRAXAS_RUNTIME_ENV` | Must remain `demo` on Demo deploy |

## Database

- Migrations 134–138 are **additive**. Rollback is forward-fix, not DROP TABLE.
- If a migration partially applied, restore from Supabase backup/PITR per operator policy — **never** run destructive scripts without authorization.

## Partner callbacks

- If callback domain changed, restore previous return URL allowlist entries in Demo config.
- Replay tests: single Cielo + Good Trouble request after rollback.

## Receipt verification

- Memo **v1** commitments remain valid alongside **v2**; do not remove verifier support for v1 when rolling back UI.
