# Independent On-Chain Trust Verification (Build #530)

Build #530 extends [Build #529](./BLOCKCHAIN_TRUST_BOUNDARY_v529.md) with a **storage-independent verifier** that relying parties can run server-side using only:

- Signed trust decision bundle (envelope + receipt payload + Ed25519 signature)
- Public receipt verification-key document (same material as `GET /api/receipts/verification-keys`)
- Immutable policy commitment hash
- Optional Merkle inclusion proof
- Optional commitment hints (non-authoritative without live RPC)
- Chain identity + finality requirements for Solana observation

## Verifier contract

- Schema: `abraxas_independent_trust_verifier_v530`
- Entry: `verifyIndependentTrustDecision()` in `lib/protocol/trust/independent/`

## Phases

1. **Local cryptographic** — signature, policy commitment, issuer registry, audience, expiry, revocation, Merkle proof, and `evaluateChainAssurance` (including DB-vs-chain override).
2. **Chain observation** — read-only Solana RPC via `verifyOnChainReceiptCommitment` (reused from `lib/decisionReceipts/solanaCommitment/verify.ts`). Dual-RPC disagreement fails closed.

Missing live-chain evidence for `chain_required` policies is **`blocked`**, never **`pass`**.

## Example

```bash
npx tsx scripts/examples/independent-relying-party-verify-530.ts
npm run evidence:independent-on-chain-trust-530
npm run test:protocol-530
```

## Not in scope

- Mainnet deploy or issuance
- Supabase or Abraxas private API access for verification
- Duplicate receipt formats or parallel verifier registries
