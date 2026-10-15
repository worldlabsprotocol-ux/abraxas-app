# Build #569: Sovereign Passport execution and independent verifier proof

This document records reconciliation for Build #568, isolated execution results, verifier usage, holder key limits, staging activation checklist, and honest blockers for founder review.

## 1. Build #568 merge reconciliation

| Reference | SHA | Role |
| --- | --- | --- |
| Merged PR #697 | `207f6cb3` | Merge commit on `main` |
| PR #697 head | `c497d9f1` | Canonical authorization finalization, signing claim, CAS receipt persistence, authorization binding, rollback protection, concurrent authorization tests |
| Reported gate commit | `dc5208ce` | Never merged to `main`; disposable Postgres harness and PG test stabilization |
| Forward port on this branch | `7e49645e` | Same content as `dc5208ce` (cherry pick) |

Checklist against `main` plus `7e49645e`:

1. Canonical signing claim and conditional receipt persistence: present in `c497d9f1` (migration 143, authorization finalize path).
2. Authorization context binding: present in `c497d9f1`.
3. Transaction rollback protection: present in `c497d9f1`.
4. Concurrent authorization regression tests: present in `c497d9f1`; PG execution harness in `7e49645e`.
5. Disposable Postgres test configuration corrections: `7e49645e` only until this PR merges.
6. Portable revocation registry compatibility: `7e49645e` updates build546 fixtures and fresh snapshot helpers.

Regression command (isolated database required):

```bash
export ABRAXAS_SOVEREIGN_PG_URL='postgresql://postgres:***@127.0.0.1:5432/sovereign_b568_gate'
npm run test:passport-reusable-credential-568
```

Observed in this environment: 209/209 passed on second run; one intermittent failure in concurrent finalization on first run (retried green).

## 2. Isolated sovereign execution environment

Database: disposable local Postgres `sovereign_b568_gate` (not shared staging or production).

Migrations applied: sovereign runtime manifest through 140 to 143 via test `beforeAll` and prior gate runs.

Preflight (configuration names only, secrets redacted in output):

```bash
export ABRAXAS_SOVEREIGN_PG_URL='...'
export ABRAXAS_PERSISTENCE_BACKEND=postgres_direct
export ABRAXAS_DATABASE_URL="$ABRAXAS_SOVEREIGN_PG_URL"
export ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_STORAGE=1
# Plus issuer registry, receipt registry, signing key id, portable revocation bootstrap as in deployment
npm run build-569:sovereign-preflight
```

Verified by automated proof test:

- Schema tables for reusable credentials, consents, authorization commits, possession keys.
- Issuer signed credential via registry backed signing key.
- Receipt signing via institutional receipt key fixture.
- Portable revocation snapshot including credential and decision receipt ids.
- Separate filesystem receipt consumption stores per institution.
- Filesystem portable revocation checkpoint directories per verifier run.

## 3. Holder journey (automated integration)

`build569.sovereignExecutionProof.test.ts` exercises the server side holder path without bypassing consent or possession:

1. Wallet subject resolution (`resolveSubjectForVerifiedWalletDirect`).
2. Possession public key registration in Postgres.
3. Authorized manual IDV issuance (`issueManualIdentityCredential`).
4. Reusable credential backfill and listing.
5. Institutional consent insert with binding hash.
6. Fresh possession challenge issue, holder sign, `authorizeIssuerBackedPresentation` for two partners and policies.
7. One credential, two distinct signed decision receipts.

Browser UI journey (wallet auth, live IDV capture, admin review queue) was not fully exercised in this cloud run. Dev server responded HTTP 200 on `/`, but end to end browser wallet and external issuer review require founder controlled credentials and human operators. See section 8.

## 4. Independent institutional verifier

Implementation:

- Library: `lib/passport/reusableCredential/independentPassportVerifier.ts`
- CLI: `scripts/build-569/independent-passport-verifier-cli.ts`

The verifier does not call Abraxas identity lookup APIs. It validates:

- Passport credential strict verification (issuer registry, revocation snapshot, checkpoint).
- Presentation custody minimization.
- Relying party path: partner and policy audience, possession evidence, signed decision receipt, consent binding, expiration, revocation freshness, checkpoint advance, receipt consumption and replay resistance.

Usage:

```bash
npm run build-569:verify-bundle -- /path/to/bundle.json \
  --trust-env /path/to/public-trust.json \
  --consumption-dir /path/to/consumption \
  --checkpoint-dir /path/to/checkpoints
```

Trust env JSON contains public registry material only (no private signing keys in the trust file; CLI merges process env for operational keys when needed).

Portable revocation snapshots for verification must include both the credential id and the decision receipt id (`buildFreshPortableRevocationSnapshotForReceiptIds`).

## 5. Two institution results

Automated test uses partner A with policy `BUILD_566_POLICY_ID` and partner B with `BUILD_568_PARTNER_B_POLICY_ID`. Each authorization produces a distinct receipt id. Independent in process verification and CLI verification both return `ok: true` with separate consumption and checkpoint directories.

## 6. Negative and replay evidence

Same test file, case "independent verifier rejects audience mismatch, forged issuer signature, and replay":

- Wrong partner or policy in bundle: `ok: false`.
- Credential re signed with unrelated key: `ok: false`.
- Second verify with same receipt in same consumption store: `ok: false`, `replay_detected: true` on relying party stage.

## 7. Holder key lifecycle limitations

Product UI (`components/passport/PassportReusableCredentialsPanel.tsx`):

- Device possession secrets live in `sessionStorage` keys `abraxas_passport_possession_secret` and `abraxas_passport_possession_public`.
- Private signing material is generated in the browser and sent to the server only as public key registration (API `/api/passport/reusable-credentials/possession-key`).
- Session refresh or tab close without export loses the secret; user must register or explicitly rotate.
- Server returns `possession_key_rotation_required` on conflict; UI does not silently replace a key bound to an active credential.

Automated proof uses direct NaCl key pair in test code (equivalent to holder signing, not sessionStorage).

## 8. Honest remaining blockers

| Area | Status |
| --- | --- |
| Code and PG integrated proof | Green: 569 suite 190 tests including proof cases |
| Independent verifier CLI | Green on proof bundles |
| Full browser holder plus live external IDV | Not completed in this agent environment |
| Production or shared staging activation | Out of scope; requires founder approval |
| Production certification | Not claimed; passing tests are not production certification |

## 9. Staging activation checklist (founder review)

### Code readiness

- [ ] Merge Build #568 gate commit (`7e49645e` content) if not already on `main`.
- [ ] Merge Build #569 verifier and proof test.
- [ ] `npm run test:passport-reusable-credential-568` and `npm run test:passport-reusable-credential-569` on disposable DB.
- [ ] `npm run build` clean.

### Isolated execution readiness

- [ ] Dedicated Postgres with migrations 140 to 143 only on that instance.
- [ ] `ABRAXAS_PASSPORT_CREDENTIAL_ISSUER_REGISTRY` and credential signing key rotation documented.
- [ ] Receipt verification registry and `ABRAXAS_SIGNING_KEY_ID` aligned with registry rows.
- [ ] Portable revocation publisher URL reachable; bootstrap trusts configured.
- [ ] Durable checkpoint directory on disk for each verifier or institution edge.
- [ ] Per institution receipt consumption store.

### Staging readiness

- [ ] Two institution records with immutable policy versions seeded.
- [ ] Consent and authorization recovery runbook.
- [ ] Monitoring on authorization finalize failures and signing claim expiry.
- [ ] Incident rollback: disable new authorizations without deleting holder credentials.

### Production readiness

- [ ] Separate checklist sign off; no automatic promotion from this build.

## 10. Commands reference

```bash
export ABRAXAS_SOVEREIGN_PG_URL='postgresql://postgres:postgres@127.0.0.1:5432/sovereign_b568_gate'
npm run test:passport-reusable-credential-568
npm run test:passport-reusable-credential-569
npm run build-569:sovereign-preflight
```

## 11. Institutional milestone (concise)

Abraxas can issue one issuer signed reusable Passport credential after authorized verification, let a holder approve two institutional requests, and let each institution verify scoped authorization with cryptographic evidence and replay protected receipts without querying Abraxas identity tables. Evidence in this build is from executed integration tests and an external verifier CLI, with browser and external issuer steps explicitly marked incomplete for this run.
