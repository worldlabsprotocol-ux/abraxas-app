# Capstone Assignment 2 — Tokenization (Verified Entitlement Mint)

Local/sandbox reference only. No production minting, no public-chain deployment.

## Tokenization overview

This slice demonstrates **Token-2022 entitlement issuance** gated by **proof-continuity** on Solana: a wallet receives exactly one non-fungible-style entitlement token (0 decimals, amount 1) only when an on-chain receipt commitment is **active**, **unexpired**, **scope-aligned** with the registry, and **bound to the authorized holder wallet** from the harness execution path.

## Core use cases

1. **Authorized entitlement mint** — After `execute_harness_run` commits an issuer-signed receipt, the holder calls `mint_verified_entitlement` and receives one Token-2022 token in an associated token account.
2. **Duplicate suppression** — A second mint for the same receipt PDA is rejected (`entitlement_already_minted`).
3. **Proof state enforcement** — Revoked or expired commitments cannot mint; wrong registry/mint/wallet cannot mint.

## Program: `abraxas_proof_continuity` (local)

| Instruction | Purpose |
|-------------|---------|
| `initialize_entitlement_mint` | Registry admin creates PDA-owned Token-2022 mint (decimals 0). |
| `mint_verified_entitlement` | CPI `MintTo` (Token-2022) for amount `1` after commitment checks. |

### Accounts — `mint_verified_entitlement`

| Account | Role |
|---------|------|
| `payer` | Pays ATA / issuance ledger rent. |
| `holder` | Signer; must match sandbox + `commitment.authorized_holder`. |
| `registry` | Scope binding (partner/policy/application hashes). |
| `sandbox` | Holder binding PDA. |
| `commitment` | Receipt status, expiry, authorized holder. |
| `entitlement_mint_config` | Links registry → Token-2022 mint. |
| `mint` | Token-2022 mint (PDA). |
| `recipient_token_account` | ATA (Token-2022 program). |
| `issuance_ledger` | PDA per receipt; marks one-time issuance. |
| `mint_authority` | PDA signer for CPI mint. |
| `token_program` | Token-2022 (`TokenzQd…`). |
| `associated_token_program` | ATA creation. |
| `system_program` | Rent. |

### CPI

- `token_interface::mint_to` via **Token-2022** program with mint authority PDA  
  seeds: `entitlement_mint_authority` + `registry`.

## Requirements → tests

| Requirement | Integration test (`tokenization_entitlement.rs`) |
|-------------|---------------------------------------------------|
| Authorized mint + balance 1 | `authorized_proof_mints_one_entitlement_token` |
| Duplicate rejected | `duplicate_entitlement_mint_rejected` |
| Wrong wallet rejected | `wrong_wallet_entitlement_mint_rejected` |
| Wrong policy/registry rejected | `wrong_policy_registry_entitlement_mint_rejected` |
| Revoked proof rejected | `revoked_proof_entitlement_mint_rejected` |
| Expired proof rejected | `expired_proof_entitlement_mint_rejected` |
| Unauthorized direct mint rejected | `unauthorized_direct_token_mint_rejected` |

Run: `npm run test:capstone-tokenization`

## Process log (engineering)

- Reused proof-continuity execution + status model from BUILD #975 / #976 / #977 merge on `main`.
- Added `authorized_holder` on `ReceiptCommitment` at harness execution so mint cannot target another wallet.
- Token-2022 mint + ATA wired with `anchor-spl` `token_2022` feature; mint authority remains program PDA (not holder).
- Issuance ledger enforces one mint per `receipt_id_hash` even when transactions use fresh blockhashes.

## AI red-team notes

- Mint does **not** re-open issuer Ed25519 verification; it reads **current** on-chain commitment status so revoked/expired proofs stay unmintable.
- No financial value: single indivisible entitlement unit, no swap/trade paths.

## Tested commit

Tested commit (PR branch): `786557be` — refresh after merge to `main`.