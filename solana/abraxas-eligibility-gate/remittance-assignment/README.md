# Token-2022 remittance stablecoin (educational reference)

**Course assignment · Andreia Canadas · due 25 Nov 2026**

This crate is an **isolated** reference implementation inside Abraxas. It does **not** modify receipt-backed entitlement mints, Integration Studio #983 flows, or production configuration.

## Objective

Demonstrate a fee-bearing remittance-style Token-2022 mint with:

- Transfer fees (epoch-aware via `calculate_epoch_fee` + `transfer_checked_with_fee`)
- Metadata pointer (self)
- Default account state **Frozen** + simulated KYC thaw (distinct from approval)
- Mint close authority
- A **second mint** with PermanentDelegate + confidential-transfer mint configuration
- Full confidential lifecycle in ProgramTest (configure → manual approval → deposit → apply pending → ZK transfer → withdraw)

## Run tests

From repo root:

```bash
npm run test:remittance-assignment
```

Or from the Solana workspace:

```bash
cd solana/abraxas-eligibility-gate
cargo test -p token2022-remittance-assignment -- --nocapture
```

**Expected:** 8 passing integration tests, 1 ignored optional CPI Guard stub.

Confidential tests load `solana_zk_token_proof_program` and enable `enable_zk_transfer_with_fee` in the ProgramTest genesis.

## Known limitation (documented honestly)

When **both** public `TransferFeeConfig` and `ConfidentialTransferFeeConfig` are enabled, confidential transfers on clusters with `enable_zk_transfer_with_fee` require **split proof context state** instructions. This educational crate exercises:

- Public remittance fees on mint #1 (full tests)
- Confidential lifecycle on mint #2 **without** public transfer-fee extension (ZK `Transfer` + `VerifyTransfer`)

Combining all three in one mint is left as follow-up; see `ENGINEERING_REPORT.md`.

## Privacy vs seizure finding

`PermanentDelegate` can move **public** balances via ordinary `TransferChecked` when authorized, but **confidential** balances require the confidential-transfer instruction family and owner-approved account state. After funds are deposited into confidential balance, a PermanentDelegate **cannot** recover them via public `TransferChecked` (see `confidential_transfer_lifecycle_with_fee_on_privacy_mint`).

## Abraxas separation

No imports from proof-continuity, entitlement consumer, or Launchpad routes. Entitlement tokens remain non-transferable with different authority rules.