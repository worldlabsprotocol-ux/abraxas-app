# Continuous On-Chain Authorization & Revocation (Build #532)

## Lifecycle (authorization states)

`ISSUED → ACTIVE → EXPIRED | REVOKED | SUPERSEDED`

Verification-only outcomes (not authorization states): **`PENDING_FINALITY`**, **`STATUS_UNAVAILABLE`**.

Mapped verifier results: **`PERMIT`**, **`DENY`**, **`PENDING`**, **`UNAVAILABLE`**.

## Authority model

| Transition | Authority |
|------------|-----------|
| ISSUED → ACTIVE | Confirmed receipt commitment (+ signature validity) |
| ACTIVE → EXPIRED | `expires_at` / policy deprecation |
| ACTIVE → REVOKED | Operator control plane, holder revocation, **`abx-rvkt` memo** |
| ACTIVE → SUPERSEDED | Supersession reissue, **`abx-rvkt` supersede memo** |

**Invariant:** A historically finalized commitment does **not** imply current `ACTIVE` authorization. Newer invalidation evidence with higher slot/sequence overrides older commitment observations.

## On-chain revocation (`abx-rvkt`)

- Protocol: `abx-rvkt` v1 memos (`lib/decisionReceipts/solanaCommitment/revocationMemo.ts`)
- Privacy: **commitment digest + policy commitment hash only** — no receipt ids (v2-style) or holder identifiers
- Verification: read-only RPC (`verifyOnChainRevocationMemo.ts`)

### Limitation (explicit)

Memo publication is **observable evidence**, not a consensus-enforced revocation program. A memo alone does not prevent a malicious actor from ignoring revocation; governance-controlled committers and dual-RPC observation establish **independent verifiability**, not on-chain enforcement without a program upgrade. No mainnet deploy in this build.

## Continuous verifier

- Entry: `verifyContinuousTrustAuthorization()` — extends Build #530 inputs with revocation observations, cache policy, RPC availability
- Cache: bounded TTL (`verificationCache.ts`); high-assurance **`chain_required`** rejects stale PERMIT during RPC outage (**fail closed**)

## Commands

```bash
npm run test:protocol-532
npm run example:continuous-relying-party-532
npm run evidence:continuous-authorization-532
```
