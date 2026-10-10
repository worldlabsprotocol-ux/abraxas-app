# Build #509 — Solana receipt commitments (devnet)

## Design choice: Memo program (devnet)

Newly issued Solana-native eligibility receipts can anchor provenance with a **Solana Memo program** transaction signed by a dedicated server committer key. The on-chain payload is a compact JSON memo:

- `p`: `abx-rcpt`
- `v`: `2` (current; v1 with optional `rid` still verifiable for legacy devnet txs)
- `d`: domain-separated SHA-256 digest (see below)

**Why Memo (not a custom program yet):** smallest operational surface for demo/devnet, no program deploy cycle, independent verifiers can read memo + match digest to signed receipt `payload_hash`. A dedicated program can replace memos later without changing the digest scheme.

**Privacy:** No holder identifiers, wallet addresses tied to identity, DOB, document/biometric hashes, evidence payloads, or receipt ids (v2) are written on-chain. Correlation risk is digest (high entropy) + committer pubkey + tx metadata.

### Domain-separated digest

```
commitment_digest = SHA256("abraxas:receipt_commitment:v1:" + payload_hash)
```

`payload_hash` is the existing canonical decision receipt hash (already pseudonymous / partner-safe fields only).

## Lifecycle (off-chain table)

`decision_receipt_solana_commitments` tracks:

`PENDING` → `SUBMITTED` → `CONFIRMED` | `FAILED` | `RETRYABLE` | `SUPERSEDED`

Idempotency key: `rcpt:{receipt_id}`. Failed submissions never surface as “Solana proof confirmed” in holder UI.

## Environment (Demo / devnet only)

| Variable | Purpose |
|----------|---------|
| `ABRAXAS_SOLANA_RECEIPT_COMMITMENTS` | `enabled` to enqueue + enforce |
| `ABRAXAS_SOLANA_RECEIPT_COMMITMENT_RPC_URL` | Devnet RPC (HTTPS) |
| `ABRAXAS_SOLANA_RECEIPT_COMMITMENT_PRIVATE_KEY` | Server Ed25519 secret (hex 32 or 64 bytes) — **never browser** |
| `ABRAXAS_SOLANA_RECEIPT_COMMITMENT_CONFIRMATION` | `confirmed` (default) or `finalized` |

Committer key must **not** match receipt signing keys (`ABRAXAS_*_RECEIPT*`).

Fund the committer pubkey on **devnet only** (airdrop). Never use mainnet or production custody here.

## Migration order (Demo Supabase)

Apply through **137** (Build #507 IDV), then:

1. `138_decision_receipt_solana_commitments.sql`

## Feature flags (cumulative Solana stack)

- `ABRAXAS_SOLANA_NATIVE` / `NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE` — Phantom-first product (#506–#508)
- `ABRAXAS_SOLANA_RECEIPT_COMMITMENTS=enabled` — this build

## Partner verification

Signed receipt validity and Solana confirmation are **distinct**:

- Signature + validity + supersession/revocation checks unchanged.
- When commitments are enabled for Solana-native policies (`*-solana-v1`), partner verification fails closed until commitment status is `CONFIRMED` with a stored transaction signature (optional `requireSolanaCommitment` on strict validators).

Public receipt field: `solana_provenance.proof_confirmed === true` only after independent confirmation policy is met.

## Rollback

1. Set `ABRAXAS_SOLANA_RECEIPT_COMMITMENTS` unset or `false` (stops enqueue + fail-closed on-chain gate).
2. Redeploy prior app revision if needed.
3. DB table is additive; no need to drop for rollback.

## Manual acceptance checklist

- [ ] Phantom sign-in (Solana native flags on)
- [ ] Passport + IDV evidence path
- [ ] Reviewer approval (if manual_review)
- [ ] Policy approval → signed receipt issued
- [ ] Commitment row → devnet tx confirmed (explorer link in receipt technical details)
- [ ] Partner verification accepts confirmed receipt; rejects tampered/missing chain proof
- [ ] Return to partner continuation URL

## Live devnet evidence

Operators must capture a real `transaction_signature` from devnet and confirm via Solana Explorer. This build does not fabricate signatures in CI.
