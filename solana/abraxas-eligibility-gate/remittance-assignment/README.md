# Token-2022 remittance stablecoin (educational reference)

**Course assignment · Andreia Canadas · due 25 Nov 2026**

This crate is an **isolated** reference implementation inside Abraxas. It does **not** modify receipt-backed entitlement mints, Integration Studio #983 flows, or production configuration.

## Objective

Demonstrate a fee-bearing remittance-style Token-2022 mint with:

- Transfer fees (epoch-aware)
- Metadata pointer (self)
- Default account state **Frozen** + simulated KYC thaw
- Mint close authority
- A **second mint** with PermanentDelegate + confidential-transfer mint configuration

## Run tests

```bash
cd solana/abraxas-eligibility-gate
cargo test -p token2022-remittance-assignment -- --nocapture
```

Ignored tests document optional / environment-dependent work:

- `confidential_transfer_lifecycle_not_run_in_default_ci` — needs zk-elgamal proof program
- `cpi_guard_delegated_transfer_optional` — optional challenge

## Privacy vs seizure finding

`PermanentDelegate` can move **public** balances via ordinary `TransferChecked` when authorized, but **confidential** balances require the confidential-transfer instruction family and owner-approved account state. Regulatory “seizure” of encrypted balances is **not** implied by PermanentDelegate alone.

## Abraxas separation

No imports from proof-continuity, entitlement consumer, or Launchpad routes. Entitlement tokens remain non-transferable with different authority rules.