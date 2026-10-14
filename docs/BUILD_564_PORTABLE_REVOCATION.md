# Build #564 — Portable revocation authority

## Cryptographic artifact

| Field | Purpose |
|-------|---------|
| `media_type` | `application/vnd.abraxas.portable-revocation-snapshot+json` |
| `payload.schema_version` | `1.0.0` |
| `issuer_id` | Authorized issuer namespace (not holder PII) |
| `signing_key_id` | Receipt verification key registry slot |
| `snapshot_sequence` | Monotonic feed version |
| `issued_at` / `expires_at` | Snapshot validity window |
| `max_freshness_seconds` | Stale-state bound from issuance |
| `previous_snapshot_hash` | Rollback detection (SHA-256 of prior canonical payload) |
| `status_entries[].status_id` | `SHA-256(issuer_id + "\n" + receipt_id)` — no wallet/name in feed |
| `payload_hash` + `signature` | Ed25519 over payload hash (same registry keys as decision receipts) |

Implementation: `lib/protocol/portableRevocation/`.

## Privacy / correlation

- Public revocation material contains **no** legal names, biometrics, documents, or wallet addresses.
- `status_id` is a deterministic handle: partners who already hold `receipt_id` and know `issuer_id` can locate status; the feed alone does not reveal holder identity.
- Optional blockchain commitments may anchor snapshot hashes for distribution integrity **without** placing per-holder identifiers on-chain.

## Independent relying-party integration

Strict proof-first path (`verifyHolderPresentationAtRelyingParty`):

1. Holder presentation (signed decision receipt + policy-scoped wrapper).
2. Partner-packaged verification keys (`ABRAXAS_RECEIPT_VERIFICATION_KEY_REGISTRY`).
3. **Authenticated** portable revocation snapshot (`portableRevocationSnapshot`).
4. Partner replay / consumption policy (`ExternalRelyingPartyHarness`).

Unsigned `revocationSource: { available: true, status: "active" }` is **rejected** — authorization requires verified snapshot material.

## Fail-closed behavior

| Condition | RP outcome |
|-----------|------------|
| Missing snapshot | `blocked` |
| Forged / bad signature | `blocked` |
| Unknown / retired key | `blocked` |
| Expired or stale snapshot | `blocked` |
| Sequence rollback / bad chain hash | `blocked` |
| Receipt revoked in snapshot | `denied` |
| Receipt absent from snapshot | `blocked` |

## Chain-neutral scope

Ed25519 + JSON canonicalization — no Solana/EVM requirement for verification. Optional chain anchors are distribution aids, not authorization oracles.

## Evidence classification

| Claim | Status in this build |
|-------|----------------------|
| Cryptographic authenticity of portable snapshots | **Proven** (synthetic tests + registry) |
| Proof-first RP integration without Abraxas HTTP | **Proven** (Build #563 + #564 tests) |
| Live operational revocation publishing SLA | **Not certified** (no production feed deployment) |
| Global unlinkability against colluding partners | **Not claimed** (receipt_id correlation remains) |

Run: `npm run test:portable-revocation-564`
