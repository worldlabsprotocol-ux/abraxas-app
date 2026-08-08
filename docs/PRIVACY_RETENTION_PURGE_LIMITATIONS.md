# Privacy Retention & Purge Design Limitations

This document describes **current limitations** for physical data deletion. It is engineering documentation — not a legal compliance statement.

## What holder deletion requests do today

1. Record intent in the append-only `privacy_requests` ledger.
2. On **admin approval only**, revoke Passport access:
   - Active credential claims via `revokeSubjectClaims`
   - `identity_verifications.status = revoked`
3. Set status `access_revoked_pending_purge` with plain-language holder copy.

**Holder requests alone never delete anything.**

## What is NOT deleted (by design in this release)

| Store | Reason |
|-------|--------|
| `audit_events` | Append-only security/legal evidence |
| `identity_review_audit_log` | Immutable admin review trail |
| `credential_status_events` | Immutable claim status history |
| `decision_receipts` + revocation events | Partner audit + cryptographic record |
| `consent_receipts`, `verification_decisions` | Partner flow audit |
| Partner metering / usage records | Commercial/ops evidence |
| `sui_zklogin_identities` (`oauth_sub`, `user_salt`) | No purge RPC implemented |
| `passport_documents` rows + Storage blobs | No storage purge job |

## Retention constants (not enforced)

`lib/idv/biometric/captureGuard.ts` defines:

- `ABRAXAS_BIOMETRIC_DOC_RETENTION_DAYS` (90)
- `ABRAXAS_BIOMETRIC_ASSESSMENT_RETENTION_DAYS` (365)

Comments reference "Purge via ops cron" — **no cron or purge worker exists**.

## Storage deletion gaps

1. **`passport-documents` bucket** — private; legacy paths embed email-safe folders. **New v2 paths use opaque UUIDs only** (`identity/v2/{sessionUuid}/...`). Legacy objects are not bulk-moved or deleted in this project.
2. **Legacy path formats** — mixed with current `identity/v2/` layout; purge must handle both.
3. **Orphan detection** — no job correlates `passport_documents.storage_path` with approved deletion requests.

## Immutable tables

PostgreSQL `ON DELETE RESTRICT` and append-only patterns on audit/receipt tables mean erasure requires:

- Policy decision on what may be redacted vs retained
- Potential pseudonymization instead of hard delete for audit rows
- Separate legal-hold workflow (`legal_hold` status on privacy requests)

## Legal hold state

When `legal_hold` is set on a privacy request:

- Holders see: "On legal hold — deletion not available yet"
- Operators must resolve hold out-of-band before any future purge

## Future purge implementation (not in scope)

A production purge pipeline would need:

1. Retention policy engine (per data category)
2. Storage adapter for `passport-documents` with verified path list
3. Redaction vs delete strategy for immutable audit tables
4. Dry-run mode + operator approval before blob delete
5. Completion hook to move privacy request → `completed`

Until then, operators mark requests `completed` only after manual verification that fulfillment steps were done.

## Export limitations

- No automated DSAR package generation
- No public export URLs
- Raw document/selfie files excluded by default
- Share history (`/api/credentials/share-history`) is not a full data export
