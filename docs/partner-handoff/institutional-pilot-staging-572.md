# Institutional pilot: sovereign Passport staging (Build #572)

This handoff describes the **staging pilot** Abraxas intends design partners to reproduce after founder activation. It does **not** claim a completed external design partner integration unless that partner executed verification on their infrastructure.

## What the institution requests

- A **policy-bound eligibility decision** (for example age 21 product eligibility) scoped to that institution's immutable `partner_id` and `policy_id`.
- A **fresh possession-bound challenge** signed by the holder's device key.
- A **partner-specific signed decision receipt**, not a copy of Institution A's receipt.

## What the holder authorizes

- Separate **consent** for each institution in the Passport UI (who is asking, why, what attributes are disclosed).
- **One** reusable issuer signed credential issued after authorized identity verification (no repeat document upload for Institution B when reuse applies).

## What Abraxas evaluates

- Authorized identity verification and human review when configured.
- Issuer signed reusable credential eligibility and signing.
- Institutional policy enforcement server-side.
- Presentation, possession proof, and receipt signing for each approved request.

Abraxas does **not** pass raw identity documents to institutions.

## What the institution independently verifies

Using institution-controlled trust only (see Build #569):

- Issuer signature on the reusable credential.
- Receipt signature under the institution's trusted verification registry.
- Portable revocation snapshot freshness and monotonic sequence (no rollback).
- Possession proof bound to the issued challenge.
- Partner and policy ids on the receipt match the institution configuration.

The verifier process must **not** query Abraxas identity tables.

## Data the institution never receives

- Government ID images or document numbers from Abraxas identity storage.
- Abraxas internal holder database primary keys (institutions receive cryptographic handles and receipts only).
- Another institution's signed receipt or consumption state.

## Receipt expiry and invalidity

- Decision receipts carry schema-defined validity windows; institutions should reject expired receipts per their policy.
- Revocation snapshots include freshness bounds; stale snapshots fail strict verification.
- Credential revocation in the portable snapshot invalidates reuse.

## Replay and revocation

- Each institution maintains a **durable receipt consumption store**; duplicate receipt ids must fail.
- Each institution maintains a **revocation checkpoint**; snapshot sequence rollback must fail.
- Cross-institution receipt reuse must fail (different partner binding on the receipt).

## Reproduce verifier success

1. Obtain a presentation bundle from the holder through your secure channel after staging consent.
2. Configure `institution.json` with your `partner_id`, `policy_id`, and public `trust_env` (no private signing keys from Abraxas).
3. Run the Build #569 operational CLI with dedicated consumption and checkpoint directories.
4. Expect exit code `0` and `"ok": true` in JSON output on first use; replay attempts must fail.

## Experimental / staging-only

- IndexedDB possession persistence is convenience storage, not hardware security.
- Staging may use test issuers distinct from Production registry entries.
- Until founder staging is activated and witnessed, this document is **procedure only**, not evidence of a live pilot.

## Internal vs external acceptance

| Evidence type | Who produces it |
| --- | --- |
| Internal staging screenshots, audit JSON, regression logs | Abraxas operator on authorized staging |
| External acceptance | Design partner runs verifier on **their** infrastructure with **their** trust JSON |

Do not conflate disposable PostgreSQL regression tests with external institutional acceptance.
