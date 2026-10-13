# Build #551 — Chain-neutral IDV completion

## Canonical invariant

**Credential and identity evidence are owned by the Abraxas holder subject (`abx_hs_*` or legacy normalized Sui address), never by an unbound wallet address.**

- Browser sessions expose `subjectId` (chain-neutral id or legacy Sui).
- `identity_verifications` rows use `holder_subject_id` for chain-neutral holders; `wallet_address` remains the unique upsert anchor (`abx_hs_*` for neutral subjects).
- Wallet CAIP-10 bindings are verified independently; linking legacy OAuth/Sui identity requires explicit grants + legacy link rows.
- Partner Flow and credential lookup use `identityVerificationOrFilter(subjectId)`.

## EIP-1271

EVM verify path: EOA via `personal_sign`, contract wallets via EIP-1271 `isValidSignature` on **platform-configured RPC only** (`ABRAXAS_PASSPORT_EVM_RPC_URL` / `ABRAXAS_EVM_RPC_URL_<chainId>`).

## Migration 136

See `docs/BUILD_551_MIGRATION_136_REVIEW.md`. **Not applied** to shared environments without explicit authorization.
