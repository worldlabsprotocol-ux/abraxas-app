# Build #817 — Independent issuer authority and sovereign current-validity

**Baseline:** PR **#816 merged** · Production unchanged

## 1. Issuer authority model in code (today)

| Layer | Location | Role |
|-------|----------|------|
| Receipt signing | `ABRAXAS_SIGNING_KEY`, `signReceiptPayload` | Issuance (private material in env only) |
| Verification registry | `ABRAXAS_RECEIPT_VERIFICATION_REGISTRY`, `loadReceiptVerificationRegistry` | Public keys, status windows, environments |
| Registry resolution | `resolveVerificationKey`, `verifyRecordSignatureWithRegistry` | Production verify path |
| Public document | `buildReceiptVerificationKeyDocument` | Partner-facing key material (**unsigned** today) |

**Gap addressed in #817:** operational DB rows and unsigned registry documents are insufficient as the **trust root** for sovereign verifiers.

## 2. Smallest authority improvement

**Signed Issuer Authority Statement (SIAS)** — `abraxas_issuer_authority_statement` v1:

- Built from existing registry records (`buildFromRegistry.ts`)
- Signed by a **trust anchor** key (`ABRAXAS_ISSUER_AUTHORITY_ANCHOR_*`) distinct from receipt signing keys
- Verifiers: `verifySignedIssuerAuthorityStatement` → `resolveIssuerKeyFromSignedStatement`
- **Anti-rollback:** monotonic `registry_version` + optional `minimumRegistryVersion`
- **Compromise:** revoked keys may remain verifiable for **historical signatures** only when `allow_historical_verification` is set; **current authorization** fails

Private receipt signing keys are never embedded in statements.

## 3. Sovereign current-validity parity (slice)

`evaluateSovereignCurrentValidity` on the sovereign path:

| Check | Source |
|-------|--------|
| Signature validity | Signed statement + Ed25519 |
| Issuer authorization (current) | Signed statement (`current_authorization` mode) |
| Policy / audience | Record + expected binding |
| Partner / policy lifecycle | Sovereign PostgreSQL |
| Revocation / expiry | Receipt record |
| Supersession | `decision_receipt_supersessions` (sovereign PG) |

**Not in slice (fail-closed or N/A):** full claim/evidence graph (Production `evaluateReceiptCurrentValidity` still authoritative for those).

## 4. Independent verification limits

| Capability | Offline / without Supabase |
|------------|----------------------------|
| Receipt signature | Yes, with cached **signed statement** + anchor public key |
| Issuer current authorization | Yes, from signed statement (freshness bounded by statement `registry_version`) |
| Revocation / supersession / policy | Requires sovereign operational state (or explicit indeterminate/fail-closed) |

Do **not** claim permanent offline **current** validity.

## 5. Tests

- `issuerAuthority.adversarial.test.ts` — forgery, rollback, revoked issuer, stale DB vs statement
- `sovereignOperationalProof.integration.test.ts` — +2 cases (signed authority validity, supersession)

## 6. Remaining legacy dependencies

Production current-validity still uses PostgREST for claims, evidence deps, launchpad apps, durable supersession outside slice.

## 7. Next gate

- External sovereign staging attestation (#816 contract)
- Publish signed statements to a **verifier-trustable channel** (pinned anchor + HTTPS document or out-of-band anchor)
- Migrate additional current-validity reads through boundary (claims/evidence) without 450-call rewrite

## 8. Production restrictions

Unchanged — no Production SQL, cutover, native auth, live keys, billing.
