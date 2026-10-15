# Build #567: Sovereign Passport credential issuance

## Architecture audit (reused components)

| Layer | Reused module | Role in #567 |
| --- | --- | --- |
| Sovereign IDV commit | `lib/persistence/sovereignCredentialIssuance.ts` | Final approval gate, claims persistence, issuance hook |
| Identity issuance | `lib/idv/issueIdentityCredential.ts` | Existing JWT + claims path unchanged |
| Reusable credential crypto | `lib/passport/reusableCredential/*` (Build #566) | Signing, verification, partner authorization |
| Issuer trust | `credentialIssuerRegistry.ts` | No caller-supplied keys |
| Revocation | `credentialRevocationStrict.ts` + portable revocation (#564) | Offline RP verification |
| Holder session | `resolveAuthenticatedHolderSession` | Export/list/present gates |

## Issuance pathway

1. Holder completes finalized sovereign verification (`identity_verifications` approved + `abraxas_credentials` + active claims).
2. Holder registers an Ed25519 possession public key (`passport_holder_possession_keys`).
3. On sovereign commit (or possession key registration backfill), `tryIssuePassportReusableCredentialOnClient` runs inside the same transaction when possible.
4. Issuance fails closed when approval, eligibility claims, issuer registry, signing key, or possession key cannot be established.

## Durable state (migration `140_passport_reusable_credential_state.sql`)

- `passport_reusable_credentials`: signed credential JSON by `credential_id`, unique per identity JWT `jti`.
- `passport_holder_possession_keys`: holder-controlled presentation keys.
- `passport_possession_challenges` + `consume_passport_possession_challenge`: durable RP replay protection.
- `passport_reusable_credential_issuance_audit`: idempotency and rejection evidence.

Enable with `ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE=1`, postgres_direct, and `ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY`.

## Privacy

Credentials carry authenticated `product_eligibility` outcomes and evidence hashes only. No document payloads or signing secrets in exports. Partner pseudonyms remain partner-scoped via existing receipt and presentation layers.

## Investor milestone

Approved sovereign verification can now produce a holder-controlled, issuer-signed reusable Passport credential that two independent relying parties can evaluate under separate policies without repeating identity verification or querying Abraxas as an online identity database.
