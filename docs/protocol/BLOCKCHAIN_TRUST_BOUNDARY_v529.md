# Blockchain-enforced trust boundary (Build #529)

## Reused on-chain components (no competing registry)

- **Solana eligibility gate** — `LOCAL_SOLANA_GATE_PROGRAM_ID` / devnet reference PDAs (`lib/partner/chainAttestation/solanaGate.ts`)
- **Receipt commitment memos** — `abx-rcpt` digest inclusion (batch-friendly, not one tx per eligibility check)
- **Chain attestation v2** — hash-only Solana messages (`lib/partner/chainAttestation/contract.ts`)

## Authoritative on-chain

- Policy commitment hash in attestation / gate verification path
- Authorized signer registry (gate rejects `unknown_signer`)
- Receipt commitment digest confirmation status
- Program upgrade authority (governance observation)

## Authoritative off-chain

- Qualified evidence artifacts and consent records
- Partner API tenant binding
- Durable replay nonce reservation (until replicated via independent store)

## Assurance tiers

| Tier | Behavior |
|------|----------|
| `off_chain` | Ed25519 + validity only |
| `chain_observed` | Chain proof when available; off-chain fallback |
| `chain_required` | Fail-closed / pending — **never permit** on chain outage or missing finalized commitment |

## Outages and reorgs

- Chain outage → `unavailable` or `pending`, not permit
- Reorgs → require finalized confirmation (see `solanaCommitment` confirmation_status)
- Emergency → documented upgrade authority; no automatic mainnet enablement in this build
