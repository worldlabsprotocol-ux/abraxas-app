# Arc Proof Gated Settlement

## Overview

Abraxas authorizes private eligibility. Arc Testnet executes USDC settlement after authorization succeeds.

This integration does not move identity data, wallet truth, private claims, or raw receipts onchain.

## Architecture

```
Partner Launchpad application
  → policy version
  → hosted verification
  → minimal eligibility receipt
  → Arc settlement configuration
  → action bound settlement authorization (EIP-712)
  → Arc Testnet transaction
  → Launchpad activity event
```

### Core modules

| Module | Path |
|--------|------|
| SettlementAdapter | `lib/settlement/SettlementAdapter.ts` |
| ArcSettlementAdapter | `lib/settlement/ArcSettlementAdapter.ts` |
| SettlementAuthorizationService | `lib/settlement/SettlementAuthorizationService.ts` |
| SettlementReceiptService | `lib/settlement/SettlementReceiptService.ts` |
| ProofGatedSettlement contract | `arc/contracts/contracts/ProofGatedSettlement.sol` |

## Arc Testnet configuration

| Parameter | Value |
|-----------|-------|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC ERC20 | `0x3600000000000000000000000000000000000000` |

Arc is a public testnet. This integration does not claim mainnet support.

## Receipt commitment

Onchain references use a domain separated commitment:

```
keccak256("abraxas:settlement:receipt:v1" || receipt_payload_hash)
```

**Proves:** Abraxas signed a specific eligibility receipt payload hash.

**Does not prove:** Identity attributes, legal name, birth date, or anonymity from hashing alone.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ABRAXAS_SETTLEMENT_SIGNER_PRIVATE_KEY` | Yes for signing | secp256k1 private key for EIP-712 settlement authorizations |
| `ABRAXAS_SETTLEMENT_SIGNER_ADDRESS` | Recommended | Authorized signer address registered on contract |
| `ARC_TESTNET_SETTLEMENT_CONTRACT_ADDRESS` | Yes for settlement | Deployed ProofGatedSettlement address |
| `ARC_TESTNET_RPC_URL` | Optional | Defaults to official Arc Testnet RPC |
| `ARC_DEPLOYER_PRIVATE_KEY` | Deploy only | Contract deployer key |
| `ABRAXAS_SETTLEMENT_FEE_ENABLED` | Optional | Must be `true` to activate fees |
| `ABRAXAS_SETTLEMENT_FEE_BPS` | Optional | Visible fee basis points |

Settlement signing is domain separated from `ABRAXAS_SIGNING_KEY` (Ed25519 receipt keys).

## Database migration

Apply after Launchpad migrations 084 and 085:

```
086_arc_proof_gated_settlement.sql
```

Do not apply to staging or production until operator review.

## Arc Testnet deployment

```bash
cd arc/contracts
npm install
npm run compile
ARC_DEPLOYER_PRIVATE_KEY=0x... ABRAXAS_SETTLEMENT_SIGNER_ADDRESS=0x... npx hardhat run scripts/deploy-testnet.js --network arcTestnet
```

Record the deployed address in `ARC_TESTNET_SETTLEMENT_CONTRACT_ADDRESS`.

## Staging sequence

1. Merge Partner Launchpad PR #290
2. Apply migrations 084, 085, then 086 to staging
3. Deploy ProofGatedSettlement to Arc Testnet
4. Set settlement env vars on staging
5. Enable Arc settlement on a sandbox Launchpad application
6. Walk through `/developers/arc-demo?app=<slug>`
7. Verify Launchpad activity shows settlement without personal data

## Rollback

1. Disable Arc settlement on Launchpad applications (`enabled = false`)
2. Pause contract via `pauseSettlement()`
3. Remove settlement env vars from runtime
4. Roll back migration 086 using rollback SQL in migration file

## Crosschain extension (CCTP)

The `SettlementAdapter` interface supports future Circle CCTP bridging from Solana to Arc via Arc App Kit.

Not implemented in this PR. When added:

- Use official Circle packages with pinned versions
- Keep App Kit keys server side
- Distinguish bridge authorization from eligibility authorization
- Never show success before destination transaction confirms

## Agentic use case

See `lib/settlement/agentContract.ts`. Abraxas authorizes actions; agents custody their own keys.

## Depends on

Partner Launchpad PR #290 (`cursor/self-service-partner-launchpad`).
