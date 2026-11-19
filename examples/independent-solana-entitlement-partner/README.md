# Independent Solana entitlement partner (BUILD #981)

**Local / ProgramTest only.** This example shows how a **separate Solana partner** can authorize a scoped action using Abraxas proof-continuity and the **independent entitlement consumer**—without the Abraxas web app, database, or hosted verifier at decision time.

## What Abraxas proves

A holder completes an **issuer-signed receipt commitment** under a registry policy. A **non-transferable Token-2022** entitlement may be minted as a usable right, but **token possession does not mean the receipt is still valid**. The partner consumer re-checks on-chain receipt state and records **single-use consumption**.

## What the entitlement represents

A **count of 1** on a registry-bound mint, tied to a specific `receipt_id_hash` and holder wallet, plus an issuance ledger in the proof-continuity program.

## Why the token alone is insufficient

Revocation, expiry, wrong policy scope, or foreign registry all fail consumption while the token balance may remain **1**.

## How the partner sets trusted policy

The partner admin initializes a **`TrustedRelyingPartyConfig` PDA** (`relying_party_config` + partner admin) with:

- trusted proof registry admin
- partner / policy / application hashes

`consume_verified_entitlement` accepts only `receipt_id_hash` in instruction data; scope comes from stored config (#980).

## How to run the example

```bash
npm run test:build-981
```

This runs `partner_acceptance` ProgramTests, writes journey artifacts under `artifacts/`, and exercises the full matrix (most cases cite existing `tokenization_entitlement` tests).

Independent CLI (reads on-chain-derived artifacts, not hosted UI):

```bash
cd solana/abraxas-eligibility-gate
cargo test -p abraxas-eligibility-gate-integration-tests --test partner_acceptance
cargo run --bin partner-verify authorized
cargo run --bin partner-verify revoked
```

## How to verify success

1. `partner-verify authorized` prints an **untrusted execution report**, then **independently re-verifies** embedded account snapshots (PDAs, program owners, `verify_receipt_backed_entitlement`). Exit 0 only when evidence proves authorization.
2. The JSON field `independent_verification_ok` is a test-runner note only — editing it does not change CLI proof.
3. `partner-verify revoked` must pass independent checks with entitlement **not** authorizing and no consumption PDA.

## How to reproduce revoked-proof rejection

```bash
npm run test:build-981
cargo run --bin partner-verify revoked
```

## Programs (local)

| Role | Program ID |
|------|------------|
| Proof continuity | `FtDugarhArqNTeuGzvQhFV9wQAxTFn8bifhPrCH4dhd1` |
| Entitlement consumer | `CQykNfMtvoV4NV6fR3cJDB5dp5ZS7oeKh8whVwpZZc8T` |

## Scope boundary

Sandbox / ProgramTest only. Not a production deployment or customer integration claim.