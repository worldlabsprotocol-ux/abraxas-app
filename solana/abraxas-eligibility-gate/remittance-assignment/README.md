# Token-2022 remittance stablecoin (educational reference)

**Course assignment · Andreia Canadas · due 25 Nov 2026**

Isolated crate under `solana/abraxas-eligibility-gate/remittance-assignment/`. Does **not** modify Abraxas entitlement mints, BUILD #983, or production configuration.

## Combined privacy remittance mint (single reissue)

One mint carries **all** required extensions:

| Extension | Role |
|-----------|------|
| `TransferFeeConfig` | Public transfer fees (epoch-aware) |
| `MetadataPointer` | Self-referential metadata |
| `DefaultAccountState` | New accounts **Frozen** |
| `MintCloseAuthority` | Mint close authority |
| `PermanentDelegate` | Regulatory-style public-balance authority |
| `ConfidentialTransferMint` | Manual confidential approval |
| `ConfidentialTransferFeeConfig` | Confidential transfer fee encryption |

Initialization order matches SPL Token-2022 requirements (`ExtensionType::try_calculate_account_len`, extension inits before `InitializeMint2`).

## Confidential transfer with fee (combined mint)

Public `TransferFeeConfig` and confidential transfer coexist. With `enable_zk_transfer_with_fee` active (as on mainnet-class clusters), the educational implementation:

1. Generates a `TransferWithFeeData` proof client-side.
2. Pre-verifies it into a **ZK proof context state account** (`VerifyTransferWithFee`).
3. Executes `inner_transfer_with_fee` with `ProofLocation::ContextStateAccount`.

This avoids oversized single-transaction proof payloads while using real instructions—no mocked ciphertext updates.

## Run tests

```bash
npm run test:remittance-assignment
```

Or:

```bash
cd solana/abraxas-eligibility-gate
cargo test -p token2022-remittance-assignment -- --nocapture
```

**Expected:** **10 passed**, **1 ignored** (optional CPI Guard stub).

Tests load `solana_zk_token_proof_program` and activate `enable_zk_transfer_with_fee` in ProgramTest genesis.

## Privacy vs seizure finding

`PermanentDelegate` can move **public** balances via `TransferChecked`. After deposit into confidential balance, public amount is zero and delegate transfer **fails** (`InsufficientFunds` / error `0x1` in tests). PermanentDelegate does **not** decrypt or move encrypted confidential balances; recovery would require separate architecture (owner keys, compliance tooling, or non-private balances)—not an implied on-chain seizure primitive.

## Optional

`remittance_cpi_guard_optional` remains **ignored** until after mandatory work.

## Abraxas separation

No entitlement consumer, proof continuity, or Launchpad integration.