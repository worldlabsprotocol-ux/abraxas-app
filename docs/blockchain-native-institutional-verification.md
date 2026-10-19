# Blockchain native institutional verification (Milestone B)

This document governs the next Abraxas institutional verification milestone. It supersedes conflicting assumptions that treat “genuine authoritative issuer” as permission to reintroduce Veriff, Google sign-in, mandatory KYC onboarding, or permanent personal identity storage into the wallet native journey.

**Governing principle:** Users control the evidence. Abraxas verifies the trust.

**#756 status:** Merged on `main`. Demonstrates issuer backed verification with an **authorized sandbox test issuer**. It does **not** establish real world age eligibility. That distinction must remain unmistakable in product copy and receipt labels (`ephemeral_sandbox_test_only`).

## What the next milestone connects

Connect **existing Passport credential presentation** to **recognized cryptographic issuer authority** and **supported blockchain attestations**.

Abraxas does not need to operate the service that originally established every real world fact. It verifies cryptographic evidence from authorized issuers and protocols.

## Architecture (preserve)

1. Wallet controlled authorization (Phantom / Solflare signatures; do not rebuild auth).
2. Cryptographically signed credentials and attestations (`SignedPassportReusableCredential`, portable revocation).
3. Recognized issuer authority (`ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY`, onchain trust registries where applicable).
4. Policy specific evidence evaluation (`executeProtocolVerification`, evidence adapters).
5. Minimal disclosure (eligibility predicates, not DOB on chain or in receipts when unnecessary).
6. Signed Abraxas decisions (decision receipts).
7. Independent relying party verification (Build #546 / #569 paths).

## Reuse Passport; isolate Veriff from the active wallet path

**Reuse (no second Passport):**

| Capability | Primary modules |
|------------|-----------------|
| Signed reusable credentials | `lib/passport/reusableCredential/contract.ts`, `sign.ts`, `verify.ts` |
| Holder presentation | `app/api/passport/reusable-credentials/*`, `issuerBackedPresentationOrchestration.ts` |
| Possession proofs | `holderPossessionChallenge.ts`, Postgres challenge store |
| Issuer trust | `credentialIssuerRegistry.ts` |
| Revocation / freshness | `serverPortableRevocationSnapshot.ts`, `credentialRevocationStrict.ts`, `lib/protocol/portableRevocation/` |
| Policy materialization | `authenticatedClaims.ts`, `evaluatePassportCredentialEvidence.ts` |

**Historical Veriff / IDV (not mandatory for wallet native credential presentation):**

- `lib/idv/processVeriffDecision.ts`, legacy claims JWT paths
- Sovereign issuance after Abraxas IDV (`sovereignIssuance.ts`) uses `issuer:abraxas`, not a third party passport credential issuer

The new active path must evaluate **independently authorized issuer credentials** without calling Veriff. Retire Veriff from the **new** path only after security equivalent alternatives are validated. Do not delete protected operational integrations blindly.

## Genuine issuer authority

Trust comes from policy recognized cryptographic authority, not an issuer name string in JSON.

Establish: issuer id, verification method / public key, registry or governance anchor, schema, permitted claim types, scope, signature validity, expiration, revocation, freshness, policy acceptance.

Do not accept wallet minted age credentials. Do not grant issuer authority from browser requests.

## Intended holder journey

**Choose policy → Review required evidence → Choose credential → Authorize disclosure → Verify evidence → Receive decision**

No permanent Abraxas personal account required for presentation. No unnecessary custody of identity documents.

Real Age 21 requires authentic eligibility evidence from policy authorized issuer (minimal claim: **age eligibility 21 or older**). Wallet age, balance, address ownership, self declared claims, and sandbox fixtures are not proof.

## Engineering sequence (Milestone B branch)

1. Map supported credential / attestation formats already in repo.
2. Map trusted issuer mechanisms (env registry, Solana trust registry programs, bootstrap artifacts).
3. Separate reusable verification from Veriff specific issuance in the **ephemeral / wallet native** execution path.
4. Minimal UI/API: ingest holder presented credential + authoritative revocation snapshot bound to verification request (reuse presentation commit pattern where appropriate).
5. Evaluate issuer authenticity, holder binding, policy, expiration, revocation, freshness (fail closed).
6. Issue signed decision; validate with independent verifier.
7. Real integration tests with **authentic** issuer material (not synthetic acceptance labeled as external).

## External requirements (report precisely if missing)

- Pinned `ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY` and signing material (founder authorized; not agent modified Production).
- `ABRAXAS_PORTABLE_REVOCATION_PUBLISHER_URL` and trust bootstrap for fresh revocation when policy requires it.
- Holder credential from real issuance path (sovereign / institutional), not `buildEphemeralSandboxAgeTestCredential`.
- Alignment: ephemeral wallet subject binding vs credential `holder_subject_id`; policy claim types (`identity_verified` vs `product_eligibility`) for `age_21_retail`.
- Production activation gates (`productionActivationBoundary.ts`).

## Production GO / NO-GO

**Current: NO-GO** for real world age eligibility in Production. **GO** for sandbox demonstration of issuer backed verification (#756 on `main`).

**GO for Milestone B** only after end to end test with genuine issuer evidence and independent verification, without Veriff in the active presentation path.
