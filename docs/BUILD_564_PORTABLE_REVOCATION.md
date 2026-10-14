# Build #564 — Portable revocation authority (final security)

## Cryptographic artifact

| Field | Purpose |
|-------|---------|
| `media_type` | `application/vnd.abraxas.portable-revocation-snapshot+json` |
| `payload.schema_version` | `1.0.0` |
| `issuer_id` | Feed namespace (must match **locally trusted** bind for receipt signing key) |
| `signing_key_id` | Snapshot signature key (must be in trusted snapshot key list) |
| `snapshot_sequence` | Monotonic feed version |
| `issued_at` / `expires_at` | Snapshot validity window |
| `max_freshness_seconds` | Stale bound from issuance (capped) |
| `max_status_entry_age_seconds` | Per-entry `updated_at` staleness bound |
| `previous_snapshot_hash` | Chain link to prior canonical payload |
| `status_entries[].status_id` | `SHA-256(issuer_id + "\n" + receipt_id)` — receipt-scoped pseudonym |
| `payload_hash` + `signature` | Ed25519 (receipt verification key registry) |

Implementation: `lib/protocol/portableRevocation/`.

## Issuer authority binding

Relying parties configure **`PortableRevocationIssuerTrustPolicy`**: each `receipt_signing_key_id` maps to an authorized `revocation_issuer_id` and allowed `snapshot_signing_key_ids`.

The verifier **does not** trust `issuer_id` from the holder or an unbound snapshot. Mismatch → `issuer_authority_mismatch` / fail-closed.

## RP checkpoint + bootstrap (no Abraxas HTTP)

| Mechanism | Behavior |
|-----------|----------|
| **`PortableRevocationCheckpointStore.compareAndAdvanceCheckpoint`** | Atomic compare-and-advance (no separate read/write authorization path) |
| **`FilesystemPortableRevocationCheckpointStore`** | Durable RP-local storage with exclusive lock files + atomic rename writes; fail-closed if storage/lock unavailable |
| **`InMemoryPortableRevocationCheckpointStore`** | Isolated tests only |
| **Monotonic progression** | Lower sequence or same-sequence hash conflict rejected under CAS |
| **Bootstrap / gap** | Cannot bypass an existing higher checkpoint (`bootstrap_bypass_rejected`) |
| **Missing checkpoint + no bootstrap** | `checkpoint_unavailable` → **BLOCKED** |
| **Corrupt / inaccessible storage** | `checkpoint_storage_unavailable` → **BLOCKED** |

## Freshness hardening

Validates: malformed timestamps, future-dated snapshots (clock skew bound), invalid freshness caps, expiry before issuance, non-positive sequences, duplicate `status_id`, future/stale status entries.

## Privacy / correlation

- No legal names, wallets, biometrics, or documents in feeds.
- `status_id` is deterministic from `(authorized issuer_id, receipt_id)` — partners who know both can correlate; feeds alone do not identify holders.
- Optional chain anchors may distribute snapshot hashes; per-holder identifiers must not appear on-chain.

## Strict proof-first integration

`verifyHolderPresentationAtRelyingParty` requires:

1. Holder presentation (Build #563 binding + custody)
2. Registry keys
3. `portableRevocationSnapshot` + `rp.portableRevocation` (trust + checkpoint + bootstrap)
4. RP replay store

Unsigned `revocationSource` hints never authorize.

## Evidence classification

| Claim | Status |
|-------|--------|
| Issuer bind + checkpoint + bootstrap + freshness | **Proven** (synthetic tests) |
| Proof-first presentation security (#563) | **Retained** (wrapper adversarial + consumption safety) |
| Live revocation publisher SLA | **Not certified** |

Run: `npm run test:portable-revocation-564`
