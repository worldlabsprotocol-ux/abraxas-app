# Human-operated testnet gate deployment

Local CLI only. This repository does not deploy gates from Vercel, CI, API routes, or the browser.

## Commands

```
npx tsx scripts/abraxas-gate.ts plan solana
npx tsx scripts/abraxas-gate.ts plan evm
npx tsx scripts/abraxas-gate.ts plan institutional-solana-devnet
npx tsx scripts/abraxas-gate.ts validate-plan ./plan.json
npx tsx scripts/abraxas-gate.ts deploy solana-devnet --confirm
npx tsx scripts/abraxas-gate.ts deploy evm-testnet --confirm
npx tsx scripts/abraxas-gate.ts verify ./deployment-manifest.json
npx tsx scripts/abraxas-gate.ts register ./deployment-manifest.json
```

`plan` is a planning envelope only. `validate-plan` checks that envelope without treating it as a registry manifest. `deploy --confirm` never broadcasts; the operator deploys with a local Solana toolchain, then supplies public program/PDA/digest fields. Automated environments refuse deploy.

Institutional gates require V2 attestations. Organization, actor, result-category, subject, and expiry are not deployment-static.

## Approved testnet posture

- Solana: `solana_devnet`
- EVM: `evm_sepolia` chain ID `11155111` (published Sepolia). No guessed Arc chain ID.
- `arc_circle_testnet` is selectable only after the reviewed network registry publishes a chain ID.
- `arc_circle_mainnet`, `evm_mainnet`, and `solana_mainnet` are rejected.

## Registry manifest

Registration re-verifies chain state. A CLI file alone is not trusted. Issuance stays blocked until status is `verified_sandbox`.

Env names (placeholders only): see `lib/partner/testnetGateDeploymentKit/.env.example`.
