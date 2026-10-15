# Design partner acceptance: Passport institutional authorization

## What Abraxas verifies

Abraxas performs authorized identity verification, human review when configured, and issuer signed reusable credential issuance. Abraxas registers holder possession public keys and orchestrates institutional consent and partner scoped authorization receipts.

## What the holder controls

The holder chooses when to register a device possession key, when to approve each institutional request, and when to sign a fresh challenge. Private possession keys remain in the browser unless the holder opts in to IndexedDB persistence on that device.

## What the institution receives

After holder approval, the institution receives cryptographic evidence:

- Issuer signed reusable credential reference bound to eligibility claims.
- Policy scoped presentation and signed decision receipt for that partner and policy.
- Authenticated portable revocation snapshot covering credential and receipt status.
- Possession proof bound to the issued challenge.

No identity document images or Abraxas database identifiers are required at the relying party.

## How the institution independently verifies

1. Provision institution JSON with partner id, policy id, and public trust env (issuer registry, receipt registry, portable revocation issuer trust, bootstrap trusts).
2. Receive a presentation bundle from the holder through your secure channel.
3. Run the operational verifier CLI with durable consumption and checkpoint directories.
4. Treat exit code zero and `"ok": true` as authorization under your policy.

See `passport-independent-verifier/README.md`.

## Required integration configuration

- Public credential issuer registry entries you trust.
- Public receipt verification registry entries you trust.
- `ABRAXAS_PORTABLE_REVOCATION_ISSUER_TRUST` bindings you provision.
- `ABRAXAS_PORTABLE_REVOCATION_BOOTSTRAP_TRUSTS` from authenticated publisher material you control.
- Filesystem or object store paths for receipt consumption and revocation checkpoints.

## Expected results

Success: authorization granted for the configured partner and policy, receipt not previously consumed, revocation snapshot monotonic for your checkpoint.

Rejection examples: wrong partner or policy, unknown issuer, forged signature, revoked credential, stale snapshot rollback, missing trust configuration, receipt replay.

## Privacy and disclosure boundaries

Institutions receive eligibility outcomes and signed receipts scoped to their policy. This is not unlinkable selective disclosure unless your deployment implements and verifies those properties separately.

## Experimental or environment limited

- Browser IndexedDB possession persistence is convenience, not hardware security.
- Sandbox labeled demo environments may use test issuers.
- Google zkLogin and external IDV require founder controlled staging configuration.
