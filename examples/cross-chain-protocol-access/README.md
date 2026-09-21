# Cross-chain protocol access (local / sandbox)

This workspace is a **local/sandbox** clone target. It is not a live Arc, EVM, Solana
devnet, Mainnet, USDC, Utila, or partner deployment.

Named action on both chains: `activate_protocol_access`.

```
private proof → fresh consent → audience-bound receipt
        → server re-check → one-time chain authorization
        → partner-owned action
```

A presentation is never sufficient. Browser input cannot select chain, contract,
program, receipt, policy, action, signer, nonce, expiry, or entitlement.

## Layout

- `server/` Universal HTTPS request shapes
- `evm/` Partner-owned Solidity consumer (copy of the Foundry reference)
- `solana/` Partner-owned Anchor consumer notes
- `fixtures/` Hash-only local fixtures

## Commands

```bash
# EVM (local Foundry, no broadcast)
cd contracts/evm-eligibility-verifier
forge test --match-contract AbraxasProtocolAccessTest

# Solana (local ProgramTest, no RPC)
cargo test --manifest-path solana/abraxas-eligibility-gate/Cargo.toml --test protocol_access -- --nocapture

# TypeScript server flow
npx vitest run lib/partner/crossChainProtocolAccess/crossChainProtocolAccess.test.ts
```

## No-funds guarantee

The reference contracts/programs store `valid_until` from the verified attestation
expiry only. Access is inactive once the chain clock reaches that instant. They have
no payable fallback, token accounts, token program calls, wallet creation, transaction
signing, RPC, or deployment action. This is not an indefinite KYC/KYB grant.
