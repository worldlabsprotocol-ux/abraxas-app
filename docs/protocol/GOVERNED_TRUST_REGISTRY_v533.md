# Governed Solana Trust Registry (Build #533)

## Architecture

New Anchor program **`abraxas-trust-registry`** in the existing `solana/abraxas-eligibility-gate` workspace (does not duplicate eligibility gate partner configs or receipt Ed25519 semantics).

- **Program ID (local/reference):** `878ysq3VvDKT5HNWWDFP5SvVJPqa5R4PktCbfiSksPJT`
- **Reused:** receipt commitment digest domain (`abraxas:receipt_commitment:v1`), #530/#532 independent verifier pipeline

## On-chain accounts

| Account | Seeds | Purpose |
|---------|-------|---------|
| `TrustRegistry` | `trust_registry`, `registry_domain` | Governance authority, issuer/revoker/publisher tables |
| `PolicyRecord` | `trust_policy`, registry, `policy_commitment` | Policy version commitment registry |
| `CommitmentState` | `trust_commitment`, registry, `commitment_digest` | ACTIVE / REVOKED / SUPERSEDED with monotonic `sequence` |

## Instructions

Governance (admin signer): `initialize_registry`, `register_policy`, `set_policy_active`, `add_issuer`, `suspend_issuer`, `revoke_issuer`, `add_revoker`, `revoke_revoker`, `add_commitment_publisher`

Operational: `publish_commitment` (publisher), `revoke_commitment`, `supersede_commitment` (authorized revoker)

Unauthorized revokers fail with **`UnauthorizedAuthority`** at program level.

## Privacy & cost

- On-chain fields are **32-byte commitments/digests only** — no PII, no stable holder identifiers.
- Rent: ~few KB per registry/policy/commitment account; compute bounded to Anchor account updates (no CPI to token programs).

## Independent verification

- `verifyProgramEnforcedTrustState()` reads `CommitmentState` via RPC.
- For `program_enforced_assurance`: **memo-only revocation is rejected**; authoritative state must come from program accounts.

## Devnet deployment

**Not performed automatically.** See `solana/abraxas-eligibility-gate/DEVNET_TRUST_REGISTRY_533.md`.

## Limitation vs Build #532 memos

`abx-rvkt` memos remain observable evidence for non-program policies. Program-enforced policies require registry account state.
