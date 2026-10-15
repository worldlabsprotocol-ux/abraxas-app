# Build #571 design partner acceptance package

Institutional design partners reproduce authorization verification **without** Abraxas database credentials, holder identity documents, or Abraxas-hosted verifier trust.

## What Abraxas verifies (issuer and protocol)

- Holder completed authorized identity verification under an immutable partner policy (human review when required).
- An Abraxas authorized credential issuer signed a reusable Passport credential bound to a canonical holder subject and approved verification JTI.
- Holder registered an Ed25519 possession public key; presentations require a fresh challenge signature.
- Institutional consent matches partner, policy version, and disclosure hash before authorization commits.
- Decision receipts are signed with institution configured receipt verification keys; portable revocation snapshots are validated against **partner supplied** bootstrap trust (not keys taken from the artifact alone).

## What the holder controls

- Wallet or Google zkLogin session used to authenticate to Passport.
- Possession private key (browser IndexedDB after server accepted the public key).
- Per institution consent approval in the Passport UI.

## What the institution receives

- A signed authorization receipt and presentation bundle suitable for offline verification (export path from the institutional flow).
- Cryptographic evidence only: issuer signed credential material, possession proof, policy reference, receipt signature, revocation snapshot references. **No** raw ID images or biometrics in these artifacts.

## How the institution independently verifies

1. Install the Build #569 operational verifier CLI (repository scripts, no Supabase env).
2. Configure **institution A** and **institution B** separately:
   - Partner id and immutable policy id/version used in the authorization.
   - Credential issuer registry JSON (public keys and issuer ids).
   - Portable revocation issuer trust and bootstrap trust JSON (sequence and payload hash pins).
   - Receipt verification registry (public keys only).
   - Durable receipt consumption directory and checkpoint directory (filesystem, per institution).
3. Run verification against the exported receipt for each institution.
4. Confirm success for the matching partner/policy and rejection for cross institution reuse, forged issuer, forged possession, revoked credential, stale snapshot, missing trust, expired authorization, and receipt replay after verifier restart.

## Required integration configuration (names only)

| Variable / artifact | Purpose |
| --- | --- |
| `ABRAXAS_INSTITUTION_*` partner and policy records | Immutable eligibility enforced server side |
| Issuer registry env (public entries) | Credential signature verification |
| Receipt verification registry | Receipt signature verification |
| Portable revocation bootstrap trusts | Snapshot authenticity |
| Consumption + checkpoint dirs | Replay resistance |

Secrets (credential signing private keys, receipt signing private keys, founder evidence HMAC) remain on Abraxas operator infrastructure only.

## Expected results

| Scenario | Expected |
| --- | --- |
| Institution A receipt verified with A trust | Success |
| Same receipt with B trust | Reject (wrong institution / policy) |
| Forged issuer or possession | Reject |
| Revoked credential or stale snapshot | Reject |
| Replay after consumption recorded | Reject |

## Privacy and disclosure boundaries

- Passport shows institution, purpose, and disclosure hash aligned with server policy; this is **not** zero knowledge or unlinkable disclosure unless a future release implements those properties explicitly.
- Verifier validation uses signed artifacts only; it does not query Abraxas identity tables.

## Experimental / not production

- Staging sovereign PostgreSQL and disposable integration databases are release control environments, not a second product surface.
- Founder execution evidence (`ABRAXAS_STAGING_EXECUTION_EVIDENCE_*`) is required before the readiness audit reports `activation_ready: true`.
