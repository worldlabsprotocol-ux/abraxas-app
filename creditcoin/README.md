# Abraxas on Creditcoin USC

Abraxas turns a signed partner-verification decision into a privacy-minimized cross-chain eligibility record. A source-chain registry emits a commitment to an Abraxas receipt. `AbraxasEligibilityUSC` verifies the source transaction through Creditcoin's Attestcoin native verifier and records the result on Creditcoin.

## What the proof contains

The source event contains:

- `receiptHash`: commitment to the complete Abraxas receipt
- `subjectHash`: pairwise holder identifier for this relying context
- `policyHash`: exact policy the holder satisfied
- `expiresAt`: time after which the result cannot authorize an action
- `approved`: policy decision

It never contains a name, email address, date of birth, government identifier, document image, or selfie.

## Contracts

| Contract | Network | Purpose |
| --- | --- | --- |
| `SourceEligibilityRegistry.sol` | Supported EVM source chain | Allows an Abraxas issuer to publish one immutable event per receipt |
| `AbraxasEligibilityUSC.sol` | Creditcoin | Verifies the source transaction through the native `0x0FD2` verifier and records the expiring decision |

The destination contract checks all of the following before writing state:

1. The requested source chain matches the configured Creditcoin chain key.
2. Creditcoin's native verifier accepts the Merkle and continuity proofs.
3. The verified transaction called the configured source registry.
4. The source transaction receipt reports success.
5. The expected event came from the configured registry.
6. Creditcoin has not processed the same source transaction before.
7. An older source transaction cannot replace a newer decision for the same subject and policy.

## Local validation

```bash
cd creditcoin
pnpm install
pnpm test
```

The tests cover successful recording, proof rejection, reverted source transactions, forged event emitters, replay attempts, denied decisions, and out-of-order updates.

## Testnet deployment

Copy `.env.example` to `.env` and use a testnet-only wallet.

First query Creditcoin itself for supported source chains and their latest attested heights:

```bash
pnpm chains
```

```bash
cd creditcoin
pnpm deploy:source
```

Record the Sepolia registry address. Set `SOURCE_CHAIN_KEY` to the Sepolia value printed by `pnpm chains`, configure the registry address, and deploy the USC:

```bash
pnpm deploy:usc
```

The production deployment must use the Creditcoin native verifier address:

```text
0x0000000000000000000000000000000000000FD2
```

Deployment scripts print machine-readable JSON containing addresses and transaction hashes. Add those results to `docs/hackathon/DEPLOYMENT_EVIDENCE.md` before claiming a live testnet integration.

Publish a privacy-minimized demonstration result on Sepolia:

```bash
pnpm demo:publish
```

Copy its transaction hash into `SOURCE_TX_HASH`. Set the current official proof-builder endpoint in `CREDITCOIN_PROOF_BUILDER_URL`, then wait for Attestcoin and execute the proof on Creditcoin:

```bash
pnpm demo:verify
```

The verification command waits for the source block to be attested, requests the official proof, calls `verifyAndRecord`, and prints the Creditcoin transaction hash plus the final `isEligible` result.

## End-to-end demo

1. Complete an Abraxas policy and obtain its signed public receipt.
2. Hash the receipt, the pairwise holder identifier, and the policy identifier locally.
3. Publish those commitments with `SourceEligibilityRegistry.publishEligibility` on Sepolia.
4. Generate the transaction proof with the official Attestcoin proof builder.
5. Call `AbraxasEligibilityUSC.verifyAndRecord` on Creditcoin.
6. Query `isEligible(subjectHash, policyHash)` and show the approved, unexpired result.

## Current status

The contracts and automated tests are implemented. Public deployment addresses remain intentionally blank until a funded testnet wallet deploys both contracts and an actual Attestcoin proof completes the end-to-end path.

## Official references

- [Attestcoin/USC architecture](https://docs.creditcoin.org/usc/overview/usc-architecture-overview)
- [USC quickstart and network endpoints](https://docs.creditcoin.org/usc/dapp-builder-infrastructure/quickstart)
- [Official USC builder examples](https://github.com/gluwa/USC-Builder-Examples)
- [Official USC query builder SDK](https://github.com/gluwa/cc-next-query-builder)
